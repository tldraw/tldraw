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
		// The layout is kept compact rather than spaced out for tldraw's larger labels, so labels on
		// edges that run side by side can touch.
		reason: 'Labels on neighbouring edges touch at the compact spacing',
		findings: [
			overlap('flowchart', 33, 'HTTP response (compressed)', 'GET /users?id=42'),
			overlap('flowchart', 33, 'GET /users?id=42', 'HTTP response (compressed)'),
			overlap('flowchart', 33, 'SELECT * FROM users WHERE id=42;', '200 OK + JSON payload'),
			overlap('flowchart', 33, '200 OK + JSON payload', 'SELECT * FROM users WHERE id=42;'),
			overlap('flowchart', 39, 'query persistent storage', 'return dataset'),
			overlap('flowchart', 39, 'return dataset', 'query persistent storage'),
			overlap('state', 4, 'reauthenticate', 'timeout'),
			overlap('state', 4, 'timeout', 'reauthenticate'),
			overlap('state', 13, 'all checks pass', 'any check fails'),
			overlap('state', 13, 'any check fails', 'all checks pass'),
			overlap('state', 15, 'reply received', 'need info'),
			overlap('state', 15, 'need info', 'reply received'),
		],
	},
	{
		// tldraw squeezes an arrow's label to the arrow's width less a margin whenever the arrow is
		// wider than it is tall, as an elbow with a long jog and a short drop is.
		reason: 'A label on a wide, short elbow arrow wraps mid-word',
		findings: [
			midWordBreak('state', 5, 'invalid', 'invali/d'),
			midWordBreak('state', 8, 'invalid', 'invali/d'),
			midWordBreak('state', 18, 'exit requested', 'reque/sted'),
			midWordBreak('state', 19, 'manager approves', 'mana/ger'),
			midWordBreak('state', 19, 'manager approves', 'appro/ves'),
			midWordBreak('state', 19, 'legal approves', 'appro/ves'),
			midWordBreak('state', 24, 'request more changes', 'reque/st'),
			midWordBreak('state', 24, 'request more changes', 'chang/es'),
		],
	},
	{
		reason: 'An edge label runs onto a node its edge passes close to',
		findings: [
			overlap('state', 17, 'pointer', 'Draw'),
			overlap('state', 19, 'manager approves', 'ManagerReview'),
			overlap('state', 19, 'manager approves', 'LegalReview'),
		],
	},
	{
		// A label is part of its arrow, so a self-loop's sits on its loop, which hugs the node.
		reason: "A self-loop's label overlaps a node tall enough to reach it",
		findings: [overlap('state', 26, 'type', 'Drafting\nwith autosave\nand validation')],
	},
	{
		reason: 'Font Awesome icon syntax is drawn as text, and the `fa:fa-car` token wraps',
		findings: [midWordBreak('flowchart', 0, 'fa:fa-car Car', 'f/a')],
	},
	{
		reason: 'A long question wraps past the corners of its diamond',
		findings: [
			overlap(
				'flowchart',
				28,
				'File type accepted by the current processing pipeline?',
				'its own outline'
			),
		],
	},
	{
		// Rows are as tall as the layout's own text needs, and tldraw's labels are taller.
		reason: 'A message or note label reaches into the frame or section title above or below it',
		findings: [
			overlap('sequence', 12, 'Get subscription', '[Load billing]'),
			overlap('sequence', 21, 'Empty', '[No job yet]'),
			overlap('sequence', 22, '7  Write failed login event', '[Login failed]'),
			overlap('sequence', 23, 'Checkout failed', '[Failure occurred]'),
			overlap('sequence', 23, 'Void authorization', '[Shipment creation failed]'),
			overlap('sequence', 24, 'opt [Customer included coupon]', '9  Apply discount rules'),
			overlap('sequence', 24, '22  409 Out of stock', '[Out of stock]'),
			overlap('sequence', 24, '20  409 Purchase failed', '[Commit failed]'),
			overlap('sequence', 24, '7  Check availability', '[Check stock]'),
			overlap('sequence', 24, '16  Record purchase event', '[Track analytics]'),
		],
	},
	{
		reason: 'Frames nested back to back put one title on top of the next',
		findings: [
			overlap('sequence', 24, 'opt [Customer included coupon]', 'critical [Commit purchase]'),
			overlap('sequence', 24, 'critical [Commit purchase]', 'opt [Customer included coupon]'),
		],
	},
	{
		// Bare-text nodes are drawn on one line, at a size a little larger than the layout measured.
		reason: 'A long bare-text mindmap label runs into its neighbour',
		findings: [
			overlap('mindmap', 19, 'Dimensionality Reduction', 'Unsupervised'),
			overlap(
				'mindmap',
				23,
				'Another extremely verbose and descriptive child node that could break layouts',
				'Even deeper explanation with excessive verbosity and complexity'
			),
			overlap(
				'mindmap',
				23,
				'Even deeper explanation with excessive verbosity and complexity',
				'Another extremely verbose and descriptive child node that could break layouts'
			),
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
		].map((label) => overlap('sequence', 24, label, 'rectangle with no text')),
	},
	{
		reason: 'A note in an `option` section is drawn over the section title',
		findings: [
			overlap('sequence', 24, 'Stop flow before inventory mutation', '[Payment failed]'),
			overlap('sequence', 24, '[Payment failed]', 'Stop flow before inventory mutation'),
		],
	},
	{
		reason:
			"A section title's box is taller than its text, so a frame nested right under it starts inside the box",
		findings: [
			overlap('sequence', 22, 'opt [New device detected]', '[Optional alert]'),
			overlap('sequence', 22, '[Optional alert]', 'opt [New device detected]'),
		],
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
