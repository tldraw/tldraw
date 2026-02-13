import { extractMermaidCode, getDiagramType, isMermaidCode } from './detectMermaid'

describe('isMermaidCode', () => {
	it('should detect code fences with mermaid language', () => {
		const code = '```mermaid\nflowchart LR\n  A --> B\n```'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect code fences with mmd language', () => {
		const code = '```mmd\nflowchart LR\n  A --> B\n```'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect plain flowchart code', () => {
		const code = 'flowchart LR\n  A --> B'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect sequence diagram code', () => {
		const code = 'sequenceDiagram\n  Alice->>Bob: Hello'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect class diagram code', () => {
		const code = 'classDiagram\n  Animal <|-- Dog'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect state diagram code', () => {
		const code = 'stateDiagram-v2\n  [*] --> Still'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should detect ER diagram code', () => {
		const code = 'erDiagram\n  CUSTOMER ||--o{ ORDER : places'
		expect(isMermaidCode(code)).toBe(true)
	})

	it('should return false for non-Mermaid code', () => {
		expect(isMermaidCode('hello world')).toBe(false)
		expect(isMermaidCode('')).toBe(false)
		expect(isMermaidCode('```javascript\nconsole.log("test")\n```')).toBe(false)
	})
})

describe('extractMermaidCode', () => {
	it('should extract code from mermaid fence', () => {
		const code = '```mermaid\nflowchart LR\n  A --> B\n```'
		const result = extractMermaidCode(code)
		expect(result).toContain('flowchart LR')
		expect(result).toContain('A --> B')
		expect(result).not.toContain('```')
	})

	it('should extract code from mmd fence', () => {
		const code = '```mmd\nsequenceDiagram\n  Alice->>Bob: Hello\n```'
		const result = extractMermaidCode(code)
		expect(result).toContain('sequenceDiagram')
		expect(result).toContain('Alice->>Bob: Hello')
	})

	it('should return plain code as-is', () => {
		const code = 'flowchart LR\n  A --> B'
		const result = extractMermaidCode(code)
		expect(result).toContain('flowchart LR')
		expect(result).toContain('A --> B')
	})

	it('should strip diagram type prefixes', () => {
		const code = 'Sequence Diagram: sequenceDiagram\n  Alice->>Bob: Hello'
		const result = extractMermaidCode(code)
		expect(result).toContain('sequenceDiagram')
		expect(result).not.toContain('Sequence Diagram:')
	})

	it('should fix newlines in sequence diagrams', () => {
		// Test that keywords are split onto separate lines
		const code = 'sequenceDiagram participant Alice loop test end'
		const result = extractMermaidCode(code)
		expect(result).toContain('sequenceDiagram\nparticipant')
		expect(result).toContain('loop')
	})

	it('should return null for non-Mermaid code', () => {
		expect(extractMermaidCode('hello world')).toBe(null)
		expect(extractMermaidCode('')).toBe(null)
	})
})

describe('getDiagramType', () => {
	it('should identify flowchart diagrams', () => {
		expect(getDiagramType('flowchart LR\n  A --> B')).toBe('flowchart')
		expect(getDiagramType('flowchart TD\n  A --> B')).toBe('flowchart')
	})

	it('should identify sequence diagrams', () => {
		expect(getDiagramType('sequenceDiagram\n  Alice->>Bob: Hello')).toBe('sequenceDiagram')
	})

	it('should identify class diagrams', () => {
		expect(getDiagramType('classDiagram\n  Animal <|-- Dog')).toBe('classDiagram')
	})

	it('should identify state diagrams', () => {
		expect(getDiagramType('stateDiagram\n  [*] --> Still')).toBe('stateDiagram')
		expect(getDiagramType('stateDiagram-v2\n  [*] --> Still')).toBe('stateDiagram')
	})

	it('should identify ER diagrams', () => {
		expect(getDiagramType('erDiagram\n  CUSTOMER ||--o{ ORDER : places')).toBe('erDiagram')
	})

	it('should identify SVG fallback types', () => {
		expect(getDiagramType('gantt\n  title A Gantt')).toBe('gantt')
		expect(getDiagramType('pie\n  title Pets')).toBe('pie')
		expect(getDiagramType('journey\n  title My day')).toBe('journey')
		expect(getDiagramType('gitGraph\n  commit')).toBe('gitGraph')
	})

	it('should return null for unknown types', () => {
		expect(getDiagramType('hello world')).toBe(null)
		expect(getDiagramType('')).toBe(null)
	})
})
