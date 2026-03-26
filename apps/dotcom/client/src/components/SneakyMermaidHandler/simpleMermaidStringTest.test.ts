import { simpleMermaidStringTest, stripMarkdownMermaidFence } from './simpleMermaidStringTest'

describe('simpleMermaidStringTest', () => {
	describe('bare keywords', () => {
		const keywords = [
			['flowchart', 'flowchart TD\n  A --> B'],
			['graph', 'graph LR\n  A --> B'],
			['sequenceDiagram', 'sequenceDiagram\n  Alice->>Bob: Hi'],
			['stateDiagram', 'stateDiagram-v2\n  [*] --> Idle'],
			['classDiagram', 'classDiagram\n  class Animal'],
			['erDiagram', 'erDiagram\n  CUSTOMER ||--o{ ORDER : places'],
			['journey', 'journey\n  title My day'],
			['gantt', 'gantt\n  title A Gantt\n  dateFormat YYYY-MM-DD'],
			['pie', 'pie\n  "Dogs" : 386'],
			['gitGraph', 'gitGraph\n  commit'],
			['mindmap', 'mindmap\n  root((Central))'],
			['timeline', 'timeline\n  title History'],
			['sankey', 'sankey-beta'],
			['xychart', 'xychart-beta'],
			['block', 'block-beta'],
			['quadrantChart', 'quadrantChart'],
			['requirement', 'requirement test_req'],
			['C4Context', 'C4Context\n  Person(user, "User")'],
			['C4Container', 'C4Container'],
			['C4Component', 'C4Component'],
			['C4Dynamic', 'C4Dynamic'],
			['C4Deployment', 'C4Deployment'],
			['packet', 'packet-beta'],
			['kanban', 'kanban'],
			['architecture', 'architecture-beta'],
			['treemap', 'treemap-beta'],
			['radar', 'radar-beta'],
			['info', 'info'],
		] as const

		for (const [keyword, input] of keywords) {
			it(`detects "${keyword}"`, () => {
				expect(simpleMermaidStringTest(input)).toBe(true)
			})
		}
	})

	describe('with boilerplate stripped', () => {
		it('detects keyword after YAML frontmatter', () => {
			const text = '---\ntitle: test\n---\nflowchart TD\n  A --> B'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects keyword after %%{init}%% directive', () => {
			const text = '%%{init: {"theme":"dark"}}%%\nsequenceDiagram\n  Alice->>Bob: Hi'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects keyword after %% line comments', () => {
			const text = '%% this is a comment\nflowchart LR\n  A --> B'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects keyword after frontmatter + directive + comment combined', () => {
			const text = [
				'---',
				'title: combo',
				'---',
				'%%{init: {"theme":"forest"}}%%',
				'%% a comment',
				'stateDiagram-v2',
				'  [*] --> Idle',
			].join('\n')
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects keyword with leading whitespace', () => {
			expect(simpleMermaidStringTest('   flowchart TD\n  A --> B')).toBe(true)
			expect(simpleMermaidStringTest('\t\tgantt\n  title Plan')).toBe(true)
		})
	})

	describe('markdown code fences', () => {
		it('detects mermaid inside ```mermaid fence', () => {
			const text = '```mermaid\nflowchart TD\n  A --> B\n```'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects mermaid inside fence with extra backticks', () => {
			const text = '````mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n````'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects mermaid inside fence with leading whitespace', () => {
			const text = '  ```mermaid\ngantt\n  title Plan\n  ```'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('strips fence and preserves inner boilerplate', () => {
			const text = '```mermaid\n%%{init: {"theme":"dark"}}%%\nflowchart LR\n  A --> B\n```'
			expect(simpleMermaidStringTest(text)).toBe(true)
		})
	})

	describe('negative cases', () => {
		it('rejects plain English text', () => {
			expect(simpleMermaidStringTest('Hello world')).toBe(false)
		})

		it('rejects text that merely mentions a keyword', () => {
			expect(simpleMermaidStringTest('Let me think about flowcharts')).toBe(false)
			expect(simpleMermaidStringTest('My flowchart TD\n  A --> B')).toBe(false)
		})

		it('rejects empty string', () => {
			expect(simpleMermaidStringTest('')).toBe(false)
		})

		it('rejects whitespace-only string', () => {
			expect(simpleMermaidStringTest('   \n\t\n  ')).toBe(false)
		})

		it('rejects JSON containing a keyword', () => {
			expect(simpleMermaidStringTest('{"type": "flowchart", "nodes": []}')).toBe(false)
		})

		it('rejects HTML containing a keyword', () => {
			expect(simpleMermaidStringTest('<div class="flowchart">content</div>')).toBe(false)
		})

		it('rejects a non-mermaid markdown code block', () => {
			const text = '```javascript\nconst x = 1\n```'
			expect(simpleMermaidStringTest(text)).toBe(false)
		})
	})
})

describe('stripMarkdownMermaidFence', () => {
	it('extracts content from a mermaid fence', () => {
		const text = '```mermaid\nflowchart TD\n  A --> B\n```'
		expect(stripMarkdownMermaidFence(text)).toBe('flowchart TD\n  A --> B')
	})

	it('returns non-fenced text unchanged', () => {
		const text = 'flowchart TD\n  A --> B'
		expect(stripMarkdownMermaidFence(text)).toBe(text)
	})

	it('returns non-mermaid fenced text unchanged', () => {
		const text = '```javascript\nconst x = 1\n```'
		expect(stripMarkdownMermaidFence(text)).toBe(text)
	})

	it('handles extra backticks', () => {
		const text = '````mermaid\ngantt\n  title Plan\n````'
		expect(stripMarkdownMermaidFence(text)).toBe('gantt\n  title Plan')
	})
})
