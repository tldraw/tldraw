import { parseSequenceDiagram } from './parseSequenceDiagram'

describe('parseSequenceDiagram', () => {
	it('should parse basic sequence diagram', () => {
		const code = `sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi`

		const result = parseSequenceDiagram(code)
		expect(result).not.toBeNull()
		expect(result?.participants).toHaveLength(2)
		expect(result?.messages).toHaveLength(2)
	})

	it('should parse explicit participants', () => {
		const code = `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello`

		const result = parseSequenceDiagram(code)
		expect(result?.participants).toHaveLength(2)
		expect(result?.participants[0]).toEqual({ id: 'Alice', label: 'Alice' })
		expect(result?.participants[1]).toEqual({ id: 'Bob', label: 'Bob' })
	})

	it('should parse participants with aliases', () => {
		const code = `sequenceDiagram
  participant A as Alice
  participant B as Bob
  A->>B: Hello`

		const result = parseSequenceDiagram(code)
		expect(result?.participants[0]).toEqual({ id: 'A', label: 'Alice' })
		expect(result?.participants[1]).toEqual({ id: 'B', label: 'Bob' })
	})

	it('should auto-create participants from messages', () => {
		const code = `sequenceDiagram
  Alice->>Bob: Hello`

		const result = parseSequenceDiagram(code)
		expect(result?.participants).toHaveLength(2)
		expect(result?.participants.map((p) => p.id)).toEqual(['Alice', 'Bob'])
	})

	it('should parse different arrow types', () => {
		const code = `sequenceDiagram
  Alice->>Bob: Solid arrow
  Bob-->>Alice: Dotted arrow
  Alice->Bob: Open arrow
  Bob-xAlice: Cross ending`

		const result = parseSequenceDiagram(code)
		expect(result?.messages).toHaveLength(4)
		expect(result?.messages[0].messageType).toBe('solid')
		expect(result?.messages[0].arrowType).toBe('arrow')
		expect(result?.messages[1].messageType).toBe('dotted')
		expect(result?.messages[2].arrowType).toBe('open')
		expect(result?.messages[3].arrowType).toBe('cross')
	})

	it('should parse self-referencing messages', () => {
		const code = `sequenceDiagram
  John->>John: Think`

		const result = parseSequenceDiagram(code)
		expect(result?.messages).toHaveLength(1)
		expect(result?.messages[0].from).toBe('John')
		expect(result?.messages[0].to).toBe('John')
	})

	it('should parse loops', () => {
		const code = `sequenceDiagram
  Alice->>Bob: First message
  loop Every minute
    Bob->>Alice: Loop message
  end
  Alice->>Bob: Last message`

		const result = parseSequenceDiagram(code)
		expect(result?.loops).toHaveLength(1)
		expect(result?.loops[0].type).toBe('loop')
		expect(result?.loops[0].label).toBe('Every minute')
		expect(result?.loops[0].startIndex).toBe(1)
		expect(result?.loops[0].endIndex).toBe(2)
	})

	it('should parse notes', () => {
		const code = `sequenceDiagram
  Alice->>Bob: Hello
  Note right of Alice: Alice thinks
  Note left of Bob: Bob thinks
  Note over Alice,Bob: Both think`

		const result = parseSequenceDiagram(code)
		expect(result?.notes).toHaveLength(3)
		expect(result?.notes[0].position).toBe('right')
		expect(result?.notes[0].participants).toEqual(['Alice'])
		expect(result?.notes[1].position).toBe('left')
		expect(result?.notes[2].position).toBe('over')
		expect(result?.notes[2].participants).toEqual(['Alice', 'Bob'])
	})

	it('should parse complex diagram with all features', () => {
		const code = `sequenceDiagram
  participant Alice
  participant John
  participant Bob
  Alice->>John: Hello John
  loop Healthcheck
    John->>John: Fight against hypochondria
  end
  John-->>Alice: Great!
  John->>Bob: How about you?
  Bob-->>John: Jolly good!
  Note right of John: Rational thoughts`

		const result = parseSequenceDiagram(code)
		expect(result?.participants).toHaveLength(3)
		expect(result?.messages).toHaveLength(5)
		expect(result?.loops).toHaveLength(1)
		expect(result?.notes).toHaveLength(1)
	})

	it('should return null for invalid diagrams', () => {
		expect(parseSequenceDiagram('not a sequence diagram')).toBeNull()
		expect(parseSequenceDiagram('')).toBeNull()
		expect(parseSequenceDiagram('flowchart LR\n A --> B')).toBeNull()
	})

	it('should handle actors', () => {
		const code = `sequenceDiagram
  actor Alice
  actor Bob
  Alice->>Bob: Hello`

		const result = parseSequenceDiagram(code)
		expect(result?.participants).toHaveLength(2)
		expect(result?.participants[0].id).toBe('Alice')
	})
})
