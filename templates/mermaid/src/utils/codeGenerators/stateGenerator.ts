/**
 * Generate Mermaid state diagram code from a ParsedStateDiagram AST.
 */

import type { ParsedStateDiagram } from '../parseStateDiagram'

export function generateStateCode(ast: ParsedStateDiagram): string {
	const lines: string[] = ['stateDiagram-v2']

	// Emit state aliases (states with labels different from their ID)
	for (const state of ast.states) {
		if (state.label && state.label !== state.id) {
			lines.push(`    state "${state.label}" as ${state.id}`)
		}
	}

	// Emit pseudo-state declarations (choice/fork/join)
	for (const state of ast.states) {
		if (state.stateType) {
			lines.push(`    state ${state.id} <<${state.stateType}>>`)
		}
	}

	// Emit transitions
	for (const t of ast.transitions) {
		const fromId = t.from === 'start' ? '[*]' : t.from
		const toId = t.to === 'end' ? '[*]' : t.to
		if (t.label) {
			lines.push(`    ${fromId} --> ${toId} : ${t.label}`)
		} else {
			lines.push(`    ${fromId} --> ${toId}`)
		}
	}

	return lines.join('\n')
}
