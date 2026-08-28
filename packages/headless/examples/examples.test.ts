import { describe, expect, it } from 'vitest'
import { run as runToolBelt } from './agent-tool-belt'
import { run as runDocumentLint } from './document-lint'
import { run as runGenerateTldr } from './generate-tldr'
import { run as runLiveAgent } from './live-agent'

// Each example is a self-verifying script (it throws when its own assertions fail); running
// them here keeps the examples from rotting as the package evolves.
const quiet = () => {}

describe('examples', () => {
	it('agent-tool-belt builds a diagram and rolls back a bad tool call', async () => {
		const outline = await runToolBelt(quiet)
		expect(outline.length).toBe(4) // 3 boxes + 1 note; arrows are excluded from the outline
		// One directed edge per arrow — run() itself asserts the exact endpoints
		expect(outline.flatMap((entry) => entry.connections)).toHaveLength(2)
	})

	it('live-agent reacts to remote todos over a real websocket room', async () => {
		const shapesSeenByHuman = await runLiveAgent(quiet)
		expect(shapesSeenByHuman).toBe(7) // 3 notes + 2 checkboxes + 2 arrows
	}, 30_000)

	it('generate-tldr writes a file that parses back losslessly', async () => {
		const path = await runGenerateTldr(undefined, quiet)
		expect(path).toMatch(/\.tldr$/)
	})

	it('document-lint finds the seeded issues and fixes converge', async () => {
		const checked = await runDocumentLint({ checkOnly: true }, quiet)
		// Two empty notes: one on the board, one that is ALSO stray (one shape, two issues)
		expect(checked.issues.map((issue) => issue.rule).sort()).toEqual([
			'empty-note',
			'empty-note',
			'overlap',
			'stray-shape',
		])
		const fixed = await runDocumentLint({}, quiet)
		expect(fixed.fixed).toBe(true)
	})
})
