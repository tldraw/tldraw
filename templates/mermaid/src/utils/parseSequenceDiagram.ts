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

		const firstLine = lines[0]
		if (!firstLine.match(/^sequenceDiagram$/)) return null

		const participants: SequenceParticipant[] = []
		const messages: SequenceMessage[] = []
		const notes: SequenceNote[] = []
		const loops: SequenceLoop[] = []
		const participantMap = new Map<string, SequenceParticipant>()

		// Track nesting depth for blocks we skip (rect, box, critical, break)
		let skipBlockDepth = 0

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Skip autonumber directive
			if (line === 'autonumber') continue

			// Skip divider lines: ==text==
			if (/^==.+==$/.test(line)) continue

			// Track skip-blocks (rect, box, critical, break) — parse their contents
			// but ignore the wrapper markers themselves
			if (/^(rect|box)\b/.test(line)) {
				skipBlockDepth++
				continue
			}
			if (/^(critical|break)\b/.test(line)) {
				skipBlockDepth++
				continue
			}
			if (line === 'end') {
				// Could be end of loop/alt/opt/par OR end of a skip-block
				const lastLoop = loops[loops.length - 1]
				if (lastLoop && lastLoop.endIndex === -1) {
					lastLoop.endIndex = messages.length
					continue
				}
				if (skipBlockDepth > 0) {
					skipBlockDepth--
					continue
				}
				continue
			}

			// Parse participant — supports plain id, "quoted label", or id as label
			// Forms:
			//   participant Alice
			//   participant A as Alice
			//   participant "Alice B" as A
			//   participant "Alice B"
			const participantMatch = line.match(
				/^participant\s+(?:"([^"]+)"\s+as\s+(\w+)|(\w+)\s+as\s+"([^"]+)"|(\w+)\s+as\s+(.+)|"([^"]+)"|(\w+))(.*)$/
			)
			if (participantMatch) {
				const [
					,
					quotedLabelAs,
					quotedAsId,
					idAsQuoted,
					quotedLabel2,
					plainId,
					plainLabel,
					quotedOnly,
					plainOnly,
				] = participantMatch
				let id: string
				let label: string
				if (quotedLabelAs && quotedAsId) {
					// "Alice B" as A
					id = quotedAsId
					label = quotedLabelAs
				} else if (idAsQuoted && quotedLabel2) {
					// A as "Alice B"
					id = idAsQuoted
					label = quotedLabel2
				} else if (plainId && plainLabel) {
					// Alice as Some Label
					id = plainId
					label = plainLabel.trim()
				} else if (quotedOnly) {
					// "Alice B" — use quoted string as both id and label
					id = quotedOnly
					label = quotedOnly
				} else {
					// plain id
					id = plainOnly!
					label = plainOnly!
				}
				if (!participantMap.has(id)) {
					const participant: SequenceParticipant = { id, label }
					participants.push(participant)
					participantMap.set(id, participant)
				}
				continue
			}

			// Parse actor (same as participant, different shape — treat identically)
			const actorMatch = line.match(
				/^actor\s+(?:"([^"]+)"\s+as\s+(\w+)|(\w+)\s+as\s+"([^"]+)"|(\w+)\s+as\s+(.+)|"([^"]+)"|(\w+))(.*)$/
			)
			if (actorMatch) {
				const [
					,
					quotedLabelAs,
					quotedAsId,
					idAsQuoted,
					quotedLabel2,
					plainId,
					plainLabel,
					quotedOnly,
					plainOnly,
				] = actorMatch
				let id: string
				let label: string
				if (quotedLabelAs && quotedAsId) {
					id = quotedAsId
					label = quotedLabelAs
				} else if (idAsQuoted && quotedLabel2) {
					id = idAsQuoted
					label = quotedLabel2
				} else if (plainId && plainLabel) {
					id = plainId
					label = plainLabel.trim()
				} else if (quotedOnly) {
					id = quotedOnly
					label = quotedOnly
				} else {
					id = plainOnly!
					label = plainOnly!
				}
				if (!participantMap.has(id)) {
					const participant: SequenceParticipant = { id, label }
					participants.push(participant)
					participantMap.set(id, participant)
				}
				continue
			}

			// Parse messages — participant IDs can be \w+ or quoted strings
			// Handles: Alice->>Bob: Hello, "Alice B"->>Bob: Hello
			const participantId = /(?:"[^"]+"|\w+)/
			const messagePattern = new RegExp(
				`^(${participantId.source})\\s*(->|-->|->>|-->>|-x|--x|-\\)|--\\))\\s*([+\\-])?\\s*(${participantId.source})\\s*:\\s*(.+)$`
			)
			const messageMatch = line.match(messagePattern)
			if (messageMatch) {
				const [, rawFrom, arrow, activation, rawTo, text] = messageMatch
				const from = rawFrom.replace(/^"|"$/g, '')
				const to = rawTo.replace(/^"|"$/g, '')

				if (!participantMap.has(from)) {
					const p: SequenceParticipant = { id: from, label: from }
					participants.push(p)
					participantMap.set(from, p)
				}
				if (!participantMap.has(to)) {
					const p: SequenceParticipant = { id: to, label: to }
					participants.push(p)
					participantMap.set(to, p)
				}

				let messageType: SequenceMessage['messageType'] = 'solid'
				let arrowType: SequenceMessage['arrowType'] = 'arrow'
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
			const notePattern = /^[Nn]ote\s+(left of|right of|over)\s+([^:]+):\s*(.+)$/
			const noteMatch = line.match(notePattern)
			if (noteMatch) {
				const [, position, participantsStr, text] = noteMatch
				const participantIds = participantsStr.split(',').map((p) => p.trim().replace(/^"|"$/g, ''))
				notes.push({
					position: position === 'left of' ? 'left' : position === 'right of' ? 'right' : 'over',
					participants: participantIds,
					text: text.trim(),
				})
				continue
			}

			// Parse loop constructs: loop, alt, opt, par (and else/and/option inside alt/par — skip them)
			if (/^(else|and|option)\b/.test(line)) continue

			const loopStartMatch = line.match(/^(loop|alt|opt|par)(?:\s+(.+))?$/)
			if (loopStartMatch) {
				const [, type, label] = loopStartMatch
				loops.push({
					type: type as SequenceLoop['type'],
					label: label?.trim(),
					startIndex: messages.length,
					endIndex: -1,
				})
				continue
			}

			// Parse activate/deactivate (skip — activation boxes are visual only)
			if (/^(activate|deactivate)\s+\w+$/.test(line)) continue
		}

		return { participants, messages, notes, loops }
	} catch (error) {
		return null
	}
}
