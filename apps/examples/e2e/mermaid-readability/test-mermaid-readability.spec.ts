import { expect } from '@playwright/test'
import mermaidDefinitions from '../../src/examples/use-cases/hundred-mermaids/mermaids'
import type { MermaidReadabilityFinding } from '../../src/misc/mermaidReadability'
import test from '../fixtures/fixtures'
import { setupPage } from '../shared-e2e'

// Converts every diagram in the "Hundreds of Mermaid diagrams" example and compares the result with
// mermaid's own rendering (see `src/misc/mermaidReadability.ts`). Not part of `yarn e2e`; run it with
// `yarn e2e-mermaid-readability` from `apps/examples`.

// `mermaids.ts` groups its definitions by diagram type, in this order.
const DIAGRAM_TYPES = ['flowchart', 'state', 'sequence', 'mindmap'] as const
type DiagramType = (typeof DIAGRAM_TYPES)[number]

// `index` is the diagram's position within its group in `mermaids.ts`.
type Finding = { diagram: DiagramType; index: number } & MermaidReadabilityFinding

interface KnownProblem {
	reason: string
	issue?: number
	findings: Finding[]
}

// Problems that exist today. An entry that stops being found fails the check too, so the list
// shrinks as they are fixed.
const KNOWN_PROBLEMS: KnownProblem[] = [
	{
		reason: 'Sequence self-message labels are centered on their loop, over the lifeline',
		issue: 10796,
		findings: [
			{ diagram: 'sequence', index: 6, check: 'overlap', label: 'Recompute backoff', over: 'line' },
			{ diagram: 'sequence', index: 9, check: 'overlap', label: 'Recalculate cache', over: 'line' },
			{
				diagram: 'sequence',
				index: 11,
				check: 'overlap',
				label: 'Apply discount',
				over: 'opt [Promo code provided]',
			},
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: '9  Apply discount rules',
				over: 'line',
			},
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: '9  Apply discount rules',
				over: 'rectangle with no text',
			},
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: '9  Apply discount rules',
				over: 'opt [Customer included coupon]',
			},
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: 'opt [Customer included coupon]',
				over: '9  Apply discount rules',
			},
			{
				diagram: 'sequence',
				index: 25,
				check: 'overlap',
				label: 'Recompute eviction policy',
				over: 'line',
			},
			{
				diagram: 'sequence',
				index: 28,
				check: 'overlap',
				label: 'Retry parsing malformed input',
				over: 'line',
			},
			{
				diagram: 'sequence',
				index: 28,
				check: 'overlap',
				label: 'Retry parsing malformed input',
				over: 'rectangle with no text',
			},
			{
				diagram: 'sequence',
				index: 29,
				check: 'overlap',
				label: 'perform an unusually long internal bookkeeping step with a very wide label',
				over: 'line',
			},
			{
				diagram: 'sequence',
				index: 32,
				check: 'overlap',
				label: 'parse chunk 3 with a suspiciously long status label for layout testing',
				over: 'line',
			},
			{
				diagram: 'sequence',
				index: 32,
				check: 'overlap',
				label: 'parse chunk 3 with a suspiciously long status label for layout testing',
				over: 'rectangle with no text',
			},
		],
	},
	{
		// Listed as a known limitation in #10773.
		reason: 'A self-loop on the top or bottom of a narrow state node gets too little label width',
		findings: [
			{
				diagram: 'state',
				index: 21,
				check: 'mid-word break',
				label: 'type character',
				word: 'charac/ter',
			},
		],
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
		].map((label) => ({
			diagram: 'sequence' as const,
			index: 24,
			check: 'overlap' as const,
			label,
			over: 'rectangle with no text',
		})),
	},
	{
		reason: 'A note in an `option` section is drawn over the section title',
		findings: [
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: '[Payment failed]',
				over: 'Stop flow before inventory mutation',
			},
			{
				diagram: 'sequence',
				index: 24,
				check: 'overlap',
				label: 'Stop flow before inventory mutation',
				over: '[Payment failed]',
			},
		],
	},
	{
		// Not a conversion bug: inside a composite state, mermaid ignores a `<<fork>>` or `<<join>>`
		// declared after the state is first used and draws a plain named state. The conversion draws
		// the bar the source asks for.
		reason: 'Mermaid draws these forks and joins as named states',
		findings: [
			{ diagram: 'state', index: 11, check: 'missing text', text: 'Fork' },
			{ diagram: 'state', index: 11, check: 'missing text', text: 'Join' },
			{ diagram: 'state', index: 20, check: 'missing text', text: 'F' },
			{ diagram: 'state', index: 20, check: 'missing text', text: 'J' },
		],
	},
]

function getKey(finding: Finding) {
	return JSON.stringify(Object.entries(finding).sort(([a], [b]) => a.localeCompare(b)))
}

test.describe('Mermaid readability', () => {
	test.skip(({ isMobile }) => isMobile, 'Readability is measured at desktop size only')

	DIAGRAM_TYPES.forEach((diagram, group) => {
		test(`${diagram} diagrams`, async ({ page, api }) => {
			test.setTimeout(120_000)
			await setupPage(page)
			await api.preloadFonts()

			const found: Finding[] = []
			const definitions = mermaidDefinitions[group]
			for (let index = 0; index < definitions.length; index++) {
				for (const finding of await api.checkMermaidReadability(definitions[index])) {
					found.push({ diagram, index, ...finding })
				}
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
