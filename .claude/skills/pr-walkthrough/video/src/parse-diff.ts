export type DiffLineType = 'add' | 'remove' | 'context' | 'hunk-header'

export interface DiffLine {
	type: DiffLineType
	content: string
	oldNum?: number
	newNum?: number
}

export function parseDiff(diff: string): DiffLine[] {
	const lines: DiffLine[] = []
	let oldNum = 0
	let newNum = 0

	for (const raw of diff.split('\n')) {
		if (raw.startsWith('@@')) {
			const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
			if (match) {
				oldNum = parseInt(match[1], 10)
				newNum = parseInt(match[2], 10)
			}
			lines.push({ type: 'hunk-header', content: raw })
		} else if (raw.startsWith('+')) {
			lines.push({ type: 'add', content: raw.slice(1), newNum })
			newNum++
		} else if (raw.startsWith('-')) {
			lines.push({ type: 'remove', content: raw.slice(1), oldNum })
			oldNum++
		} else if (raw.startsWith('\\ ')) {
			// Skip diff metadata lines like "\ No newline at end of file"
		} else {
			const content = raw.startsWith(' ') ? raw.slice(1) : raw
			if (raw.length > 0) {
				lines.push({ type: 'context', content, oldNum, newNum })
				oldNum++
				newNum++
			}
		}
	}

	return lines
}
