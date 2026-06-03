import { simpleMermaidStringTest, stripMarkdownMermaidFence } from './simpleMermaidStringTest'

describe('simpleMermaidStringTest', () => {
	describe('diagram keywords with content', () => {
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
			['quadrantChart', 'quadrantChart\n  title Reach vs Engagement'],
			['requirement', 'requirement test_req'],
			['C4Context', 'C4Context\n  Person(user, "User")'],
			['C4Container', 'C4Container\n  Container(web, "Web")'],
			['C4Component', 'C4Component\n  Component(c, "Component")'],
			['C4Dynamic', 'C4Dynamic\n  rel(a, b, "uses")'],
			['C4Deployment', 'C4Deployment\n  Node(n, "Node")'],
			['packet', 'packet-beta'],
			['kanban', 'kanban\n  todo[Todo]'],
			['architecture', 'architecture-beta'],
			['treemap', 'treemap-beta'],
			['radar', 'radar-beta'],
			['info', 'info showInfo'],
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

		it('does not consume later non-mermaid fences in the same paste', () => {
			const text = [
				'```mermaid',
				'flowchart TD',
				'  A --> B',
				'```',
				'',
				'```javascript',
				'const x = 1',
				'```',
			].join('\n')
			expect(simpleMermaidStringTest(text)).toBe(true)
		})

		it('detects a bare keyword inside an explicit mermaid fence', () => {
			// Inside a ```mermaid fence the user has declared intent, so a bare
			// keyword that would otherwise be rejected is still treated as mermaid.
			expect(simpleMermaidStringTest('```mermaid\ntimeline\n```')).toBe(true)
			expect(simpleMermaidStringTest('```mermaid\nkanban\n```')).toBe(true)
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

		it('rejects a fence label that is not lowercase mermaid', () => {
			const text = '```MERMAID\npie\n  "A" : 1\n```'
			expect(simpleMermaidStringTest(text)).toBe(false)
		})

		it('rejects a bare keyword that is also a common word', () => {
			for (const word of [
				'timeline',
				'graph',
				'pie',
				'block',
				'info',
				'kanban',
				'journey',
				'requirement',
				'mindmap',
			]) {
				expect(simpleMermaidStringTest(word)).toBe(false)
			}
		})

		it('rejects a bare keyword with trailing whitespace', () => {
			expect(simpleMermaidStringTest('  timeline  ')).toBe(false)
			expect(simpleMermaidStringTest('graph\n')).toBe(false)
		})

		it('rejects hyphenated words that start with a keyword', () => {
			for (const word of [
				'kanban-board',
				'gantt-chart',
				'timeline-view',
				'graph-paper',
				'block-party',
			]) {
				expect(simpleMermaidStringTest(word)).toBe(false)
			}
		})

		it('rejects words that merely start with a keyword', () => {
			expect(simpleMermaidStringTest('information about the project')).toBe(false)
			expect(simpleMermaidStringTest('graphql query')).toBe(false)
			expect(simpleMermaidStringTest('pier review')).toBe(false)
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

	it('stops at the first closing fence when more blocks follow', () => {
		const text = [
			'```mermaid',
			'flowchart TD',
			'  A --> B',
			'```',
			'',
			'# More',
			'',
			'```js',
			'x',
			'```',
		].join('\n')
		expect(stripMarkdownMermaidFence(text)).toBe('flowchart TD\n  A --> B')
	})

	it('does not close on a shorter inner fence than the opening run', () => {
		const text = ['````mermaid', 'flowchart TD', '  A --> B', '```', '  note text', '````'].join(
			'\n'
		)
		expect(stripMarkdownMermaidFence(text)).toBe(
			['flowchart TD', '  A --> B', '```', '  note text'].join('\n')
		)
	})

	it('handles CRLF line endings in the fence', () => {
		const text = '```mermaid\r\nflowchart TD\r\n  A --> B\r\n```'
		expect(stripMarkdownMermaidFence(text)).toBe('flowchart TD\r\n  A --> B')
	})
})
