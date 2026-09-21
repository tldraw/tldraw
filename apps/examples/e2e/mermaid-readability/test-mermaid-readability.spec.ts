import { expect } from '@playwright/test'
import mermaidDefinitions from '../../src/examples/use-cases/hundred-mermaids/mermaids'
import type { MermaidReadabilityFinding } from '../../src/misc/mermaidReadability'
import test from '../fixtures/fixtures'
import { setupPage } from '../shared-e2e'

// Converts every diagram in the "Hundreds of Mermaid diagrams" example and compares the result with
// mermaid's own rendering (see `src/misc/mermaidReadability.ts`). Not part of `yarn e2e`: CI runs it
// only when mermaid conversion changes (`.github/workflows/playwright-mermaid.yml`), and locally it
// is `yarn e2e-mermaid-readability` from `apps/examples`.

// `mermaids.ts` groups its definitions by diagram type, in this order.
const DIAGRAM_TYPES = ['flowchart', 'state', 'sequence', 'mindmap'] as const
type DiagramType = (typeof DIAGRAM_TYPES)[number]

// `index` is the diagram's position within its group in `mermaids.ts`.
type Finding = { diagram: DiagramType; index: number } & MermaidReadabilityFinding

function overlap(diagram: DiagramType, index: number, label: string, over: string): Finding {
	return { diagram, index, check: 'overlap', label, over }
}

function midWordBreak(diagram: DiagramType, index: number, label: string, word: string): Finding {
	return { diagram, index, check: 'mid-word break', label, word }
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
		// Not a bug: a label is part of its arrow, so a self-message's sits on its loop. Placing it
		// above the loop, as mermaid does, would mean detaching it. Closed as intended in #10796.
		reason: 'Sequence self-message labels are centered on their loop, over the lifeline',
		findings: [
			overlap('sequence', 6, 'Recompute backoff', 'line'),
			overlap('sequence', 9, 'Recalculate cache', 'line'),
			overlap('sequence', 11, 'Apply discount', 'opt [Promo code provided]'),
			overlap('sequence', 24, '9  Apply discount rules', 'line'),
			overlap('sequence', 24, '9  Apply discount rules', 'rectangle with no text'),
			overlap('sequence', 24, '9  Apply discount rules', 'opt [Customer included coupon]'),
			overlap('sequence', 25, 'Recompute eviction policy', 'line'),
			overlap('sequence', 28, 'Retry parsing malformed input', 'line'),
			overlap('sequence', 28, 'Retry parsing malformed input', 'rectangle with no text'),
			overlap(
				'sequence',
				29,
				'perform an unusually long internal bookkeeping step with a very wide label',
				'line'
			),
			overlap(
				'sequence',
				32,
				'parse chunk 3 with a suspiciously long status label for layout testing',
				'line'
			),
			overlap(
				'sequence',
				32,
				'parse chunk 3 with a suspiciously long status label for layout testing',
				'rectangle with no text'
			),
		],
	},
	{
		// Listed as a known limitation in #10773.
		reason: 'A self-loop on the top or bottom of a narrow state node gets too little label width',
		findings: [midWordBreak('state', 21, 'type character', 'chara/cter')],
	},
	{
		// Mermaid lays edge labels out for a smaller font than the node size they are drawn at, so a
		// label near a composite state's edge can reach past it. Accepted in #10804, which drew them at
		// the node size so they read at the same size as the nodes.
		reason: 'An edge label near a composite state reaches past its edge',
		findings: [overlap('state', 19, 'manager rejects', 'Review')],
	},
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
		reason: 'A note in an `option` section is drawn over the section title',
		findings: [overlap('sequence', 24, 'Stop flow before inventory mutation', '[Payment failed]')],
	},
	{
		reason:
			"A section title's box is taller than its text, so a frame nested right under it starts inside the box",
		findings: [overlap('sequence', 22, 'opt [New device detected]', '[Optional alert]')],
	},
	{
		// Not a conversion bug: inside a composite state, mermaid ignores a `<<fork>>` or `<<join>>`
		// declared after the state is first used and draws a plain named state. The conversion draws
		// the bar the source asks for.
		reason: 'Mermaid draws these forks and joins as named states',
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
