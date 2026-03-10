/**
 * Generate Mermaid sequence diagram code from a ParsedSequenceDiagram AST.
 */

import type { ParsedSequenceDiagram, SequenceMessage } from '../parseSequenceDiagram'

export function generateSequenceCode(ast: ParsedSequenceDiagram): string {
	const lines: string[] = ['sequenceDiagram']

	// Participants
	for (const p of ast.participants) {
		const quotedId = /\s/.test(p.id) ? `"${p.id}"` : p.id
		if (p.id !== p.label) {
			lines.push(`    participant ${quotedId} as ${p.label}`)
		} else {
			lines.push(`    participant ${quotedId}`)
		}
	}

	// Messages
	for (const msg of ast.messages) {
		const arrow = messageArrowSyntax(msg)
		const qFrom = /\s/.test(msg.from) ? `"${msg.from}"` : msg.from
		const qTo = /\s/.test(msg.to) ? `"${msg.to}"` : msg.to

		let activationSuffix = ''
		if (msg.activate) activationSuffix = '+'
		if (msg.deactivate) activationSuffix = '-'

		lines.push(`    ${qFrom}${arrow}${activationSuffix}${qTo}: ${msg.text ?? ''}`)
	}

	// Notes
	for (const note of ast.notes) {
		const posStr = note.position === 'left' ? 'left of' : note.position === 'right' ? 'right of' : 'over'
		const participants = note.participants.join(',')
		lines.push(`    Note ${posStr} ${participants}: ${note.text}`)
	}

	return lines.join('\n')
}

function messageArrowSyntax(msg: SequenceMessage): string {
	if (msg.arrowType === 'cross') {
		return msg.messageType === 'dotted' ? '--x' : '-x'
	}
	if (msg.arrowType === 'open') {
		return msg.messageType === 'dotted' ? '-->' : '->'
	}
	// Default: filled arrowhead
	return msg.messageType === 'dotted' ? '-->>' : '->>'
}
