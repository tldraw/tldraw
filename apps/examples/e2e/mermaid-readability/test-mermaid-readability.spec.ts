import { expect } from '@playwright/test'
import mermaidDefinitions from '../../src/examples/use-cases/hundred-mermaids/mermaids'
import type { MermaidReadabilityFinding } from '../../src/misc/mermaidReadability'
import test from '../fixtures/fixtures'
import { setupPage } from '../shared-e2e'

// Converts every diagram in the "Hundreds of Mermaid diagrams" example and compares the result with
// the layout engine's own rendering (see `src/misc/mermaidReadability.ts`). Not part of `pnpm e2e`: CI runs it
// only when mermaid conversion changes (`.github/workflows/playwright-mermaid.yml`), and locally it
// is `pnpm e2e-mermaid-readability` from `apps/examples`.

// `mermaids.ts` groups its definitions by diagram type, in this order.
const DIAGRAM_TYPES = ['flowchart', 'state', 'sequence', 'mindmap', 'class'] as const
type DiagramType = (typeof DIAGRAM_TYPES)[number]

// `index` is the diagram's position within its group in `mermaids.ts`.
type Finding = { diagram: DiagramType; index: number } & MermaidReadabilityFinding

function overlap(diagram: DiagramType, index: number, label: string, over: string): Finding {
	return { diagram, index, check: 'overlap', label, over }
}

function missingText(diagram: DiagramType, index: number, text: string): Finding {
	return { diagram, index, check: 'missing text', text }
}

interface KnownProblem {
	reason: string
	findings: Finding[]
}

// Problems that exist today. An entry that stops being found fails the check too, so the list
// shrinks as they are fixed. Like the e2e snapshots, it matches chromium on Linux, where CI runs:
// text metrics differ by a pixel elsewhere, so a local run on macOS can disagree on an entry that
// is a pixel from colliding.
const KNOWN_PROBLEMS: KnownProblem[] = [
	{
		reason:
			'Frame titles are drawn at the top left of the frame, where an activation bar runs through them',
		findings: [
			'par [Fetch product data]',
			'[Check stock]',
			'opt [Customer included coupon]',
			'critical [Commit purchase]',
			'[Payment failed]',
			'par [Notify customer]',
			'[Track analytics]',
		].map((label) => overlap('sequence', 24, label, 'rectangle with no text')),
	},
	{
		// Not a conversion bug: inside a composite state, pele (like Mermaid) ignores a `<<fork>>` or
		// `<<join>>` declared after the state is first used and draws a plain named state. The
		// conversion draws the bar the source asks for.
		reason: 'The layout draws these forks and joins as named states',
		findings: [
			missingText('state', 11, 'Fork'),
			missingText('state', 11, 'Join'),
			missingText('state', 20, 'F'),
			missingText('state', 20, 'J'),
		],
	},
]

function getKey(finding: Finding) {
	return JSON.stringify(finding, Object.keys(finding).sort())
}

test.describe('Mermaid readability', () => {
	test.skip(({ isMobile }) => isMobile, 'Readability is measured at desktop size only')

	DIAGRAM_TYPES.forEach((diagram, group) => {
		test(`${diagram} diagrams`, async ({ page, api }) => {
			test.setTimeout(120_000)
			await setupPage(page)
			await api.preloadFonts()
			// A font that fails to load is swapped for a system one, whose metrics wrap text
			// differently. That would surface below as breaks and overlaps, not as a font problem.
			const failedFonts = await page.evaluate(() => [
				...new Set(
					[...document.fonts].filter((font) => font.status === 'error').map((font) => font.family)
				),
			])
			expect(failedFonts).toEqual([])

			const found: Finding[] = []
			for (const [index, definition] of mermaidDefinitions[group].entries()) {
				const findings = await api.checkMermaidReadability(definition)
				found.push(...findings.map((finding) => ({ diagram, index, ...finding })))
			}

			const known = KNOWN_PROBLEMS.flatMap((problem) => problem.findings).filter(
				(finding) => finding.diagram === diagram
			)
			const foundKeys = new Set(found.map(getKey))
			const knownKeys = new Set(known.map(getKey))
			expect({
				unexpected: found.filter((finding) => !knownKeys.has(getKey(finding))),
				noLongerFound: known.filter((finding) => !foundKeys.has(getKey(finding))),
			}).toEqual({ unexpected: [], noLongerFound: [] })
		})
	})
})
