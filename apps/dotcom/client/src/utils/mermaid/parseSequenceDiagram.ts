/**
 * Parser for Mermaid sequence diagrams
 * Extracts participants, messages, and activations to create native tldraw shapes
 */

export interface SequenceParticipant {
	id: string
	label: string
}

export interface SequenceMessage {
	from: string
	to: string
	messageType: 'solid' | 'dotted' | 'open'
	arrowType: 'arrow' | 'cross' | 'open'
	text?: string
	activate?: boolean
	deactivate?: boolean
}

export interface SequenceNote {
	position: 'left' | 'right' | 'over'
	participants: string[] // One or more participant IDs
	text: string
}

export interface SequenceLoop {
	type: 'loop' | 'alt' | 'opt' | 'par'
	label?: string
	startIndex: number
	endIndex: number
}

export interface ParsedSequenceDiagram {
	participants: SequenceParticipant[]
	messages: SequenceMessage[]
	notes: SequenceNote[]
	loops: SequenceLoop[]
}

/**
 * Parse a Mermaid sequence diagram into participants and messages
 */
export function parseSequenceDiagram(code: string): ParsedSequenceDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Check for sequenceDiagram
		const firstLine = lines[0]
		if (!firstLine.match(/^sequenceDiagram$/)) return null

		const participants: SequenceParticipant[] = []
		const messages: SequenceMessage[] = []
		const notes: SequenceNote[] = []
		const loops: SequenceLoop[] = []
		const participantMap = new Map<string, SequenceParticipant>()

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Parse participant: participant Alice
			// Or: participant A as Alice
			const participantMatch = line.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/)
			if (participantMatch) {
				const [, id, label] = participantMatch
				const participant: SequenceParticipant = {
					id,
					label: label || id,
				}
				participants.push(participant)
				participantMap.set(id, participant)
				continue
			}

			// Parse actor: actor Alice
			const actorMatch = line.match(/^actor\s+(\w+)(?:\s+as\s+(.+))?$/)
			if (actorMatch) {
				const [, id, label] = actorMatch
				const participant: SequenceParticipant = {
					id,
					label: label || id,
				}
				participants.push(participant)
				participantMap.set(id, participant)
				continue
			}

			// Parse messages with different arrow types:
			// Alice->>Bob: Hello (solid arrow)
			// Alice-->>Bob: Hello (dotted arrow)
			// Alice->Bob: Hello (open arrow)
			// Alice-xBob: Hello (cross ending)
			// Alice--)Bob: Hello (dotted open arrow)
			const messagePattern =
				/^(\w+)\s*(->|-->|->>|-->>|-x|--x|-\)|--\))\s*([+\-])?\s*(\w+)\s*:\s*(.+)$/
			const messageMatch = line.match(messagePattern)

			if (messageMatch) {
				const [, from, arrow, activation, to, text] = messageMatch

				// Ensure participants exist
				if (!participantMap.has(from)) {
					const participant: SequenceParticipant = { id: from, label: from }
					participants.push(participant)
					participantMap.set(from, participant)
				}
				if (!participantMap.has(to)) {
					const participant: SequenceParticipant = { id: to, label: to }
					participants.push(participant)
					participantMap.set(to, participant)
				}

				let messageType: SequenceMessage['messageType'] = 'solid'
				let arrowType: SequenceMessage['arrowType'] = 'arrow'

				// Determine arrow style
				if (arrow.includes('--')) messageType = 'dotted'
				if (arrow.includes('x')) arrowType = 'cross'
				else if (arrow === '->' || arrow === '-->') arrowType = 'open'
				else if (arrow.includes('>>')) arrowType = 'arrow'
				else if (arrow === '-)' || arrow === '--)') {
					arrowType = 'open'
					messageType = 'dotted'
				}

				messages.push({
					from,
					to,
					messageType,
					arrowType,
					text: text?.trim(),
					activate: activation === '+',
					deactivate: activation === '-',
				})
				continue
			}

			// Parse note: Note left of Alice: Text
			// Or: Note right of Alice: Text
			// Or: Note over Alice,Bob: Text
			const notePattern = /^[Nn]ote\s+(left of|right of|over)\s+([^:]+):\s*(.+)$/
			const noteMatch = line.match(notePattern)

			if (noteMatch) {
				const [, position, participantsStr, text] = noteMatch
				const participantIds = participantsStr.split(',').map((p) => p.trim())

				notes.push({
					position: position === 'left of' ? 'left' : position === 'right of' ? 'right' : 'over',
					participants: participantIds,
					text: text.trim(),
				})
				continue
			}

			// Parse loop constructs: loop, alt, opt, par
			const loopStartMatch = line.match(/^(loop|alt|opt|par)(?:\s+(.+))?$/)
			if (loopStartMatch) {
				const [, type, label] = loopStartMatch
				loops.push({
					type: type as SequenceLoop['type'],
					label: label?.trim(),
					startIndex: messages.length,
					endIndex: -1, // Will be set when 'end' is found
				})
				continue
			}

			// Parse loop end: end
			if (line === 'end') {
				const lastLoop = loops[loops.length - 1]
				if (lastLoop && lastLoop.endIndex === -1) {
					lastLoop.endIndex = messages.length
				}
				continue
			}

			// Parse activation: activate Alice / deactivate Alice
			const activateMatch = line.match(/^activate\s+(\w+)$/)
			if (activateMatch) {
				// We could track activations separately, but for simplicity, we'll skip
				continue
			}

			const deactivateMatch = line.match(/^deactivate\s+(\w+)$/)
			if (deactivateMatch) {
				// We could track activations separately, but for simplicity, we'll skip
				continue
			}
		}

		return { participants, messages, notes, loops }
	} catch (error) {
		return null
	}
}
