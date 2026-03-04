export interface MermaidFlowchartLoopFixture {
	id: string
	title: string
	status: 'supported' | 'todo'
	source: string
	expected: {
		geo: number
		arrow: number
		text: number
		requiredGeoLabels?: string[]
		forbiddenGeoLabels?: string[]
	}
}

/**
 * Fixture set derived from Mermaid flowchart docs:
 * https://mermaid.js.org/syntax/flowchart.html
 *
 * - `supported` cases must always pass.
 * - `todo` cases are skipped by default, but run in strict loop mode:
 *   `TLDRAW_MERMAID_LOOP_STRICT=1`.
 */
export const mermaidFlowchartLoopFixtures: MermaidFlowchartLoopFixture[] = [
	{
		id: 'basic-arrow',
		title: 'Basic link with arrow head',
		status: 'supported',
		source: `flowchart LR
			A-->B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'graph-alias',
		title: 'Graph alias header',
		status: 'supported',
		source: `graph LR
			Start --> Stop`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'unicode-node',
		title: 'Unicode node label',
		status: 'supported',
		source: `flowchart LR
			id["This ❤ Unicode"]`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['This ❤ Unicode'] },
	},
	{
		id: 'markdown-node-labels',
		title: 'Markdown-formatted node labels',
		status: 'supported',
		source: `flowchart LR
			markdown["\`This **is** _Markdown_\`"]
			newLines["\`Line1
			Line 2
			Line 3\`"]
			markdown --> newLines`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'legacy-shape-gallery',
		title: 'Legacy flowchart node shapes',
		status: 'supported',
		source: `flowchart LR
			round(Round)
			stadium([Stadium])
			subroutine[[Subroutine]]
			cylinder[(Database)]
			circle((Circle))
			asymmetric>Asym]
			diamond{Decision}
			hex{{Prepare}}
			para[/IO/]
			paraAlt[\\OutIn\\]
			trap[/Trap\\]
			trapAlt[\\InvTrap/]
			dbl(((Stop)))`,
		expected: {
			geo: 13,
			arrow: 0,
			text: 0,
			requiredGeoLabels: [
				'Round',
				'Stadium',
				'Subroutine',
				'Database',
				'Circle',
				'Asym',
				'Decision',
				'Prepare',
				'IO',
				'OutIn',
				'Trap',
				'InvTrap',
				'Stop',
			],
		},
	},
	{
		id: 'open-link',
		title: 'Open link',
		status: 'supported',
		source: `flowchart LR
			A --- B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'link-label-pipe',
		title: 'Link label (pipe syntax)',
		status: 'supported',
		source: `flowchart LR
			A---|This is the text|B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'link-label-inline',
		title: 'Link label (inline syntax)',
		status: 'supported',
		source: `flowchart LR
			A-- text -->B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'dotted-link',
		title: 'Dotted link',
		status: 'supported',
		source: `flowchart LR
			A-.->B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'thick-link',
		title: 'Thick link',
		status: 'supported',
		source: `flowchart LR
			A ==> B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'circle-cross-edges',
		title: 'Circle and cross edge markers',
		status: 'supported',
		source: `flowchart LR
			A --o B
			B --x C`,
		expected: { geo: 3, arrow: 2, text: 0 },
	},
	{
		id: 'comments',
		title: 'Comments are ignored',
		status: 'supported',
		source: `flowchart LR
			%% this is a comment A -- text --> B{node}
			A -- text --> B -- text2 --> C`,
		expected: { geo: 3, arrow: 2, text: 0 },
	},
	{
		id: 'invisible-link',
		title: 'Invisible link keeps nodes without edge',
		status: 'supported',
		source: `flowchart LR
			A ~~~ B`,
		expected: { geo: 2, arrow: 0, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'mixed-shortcut-links',
		title: 'Mixed single-line shortcut links',
		status: 'supported',
		source: `flowchart LR
			a --> b & c--> d`,
		expected: {
			geo: 4,
			arrow: 3,
			text: 0,
			requiredGeoLabels: ['a', 'b', 'c', 'd'],
		},
	},
	{
		id: 'subgraph-basic',
		title: 'Subgraph declarations',
		status: 'supported',
		source: `flowchart TB
			c1-->a2
			subgraph one
			  a1-->a2
			end
			subgraph two
			  b1-->b2
			end
			one --> two`,
		expected: { geo: 7, arrow: 4, text: 0 },
	},
	{
		id: 'subgraph-external-node-membership',
		title: 'Subgraph groups include nodes referenced inside subgraph blocks',
		status: 'supported',
		source: `flowchart TB
			c1-->a2
			subgraph one
			  a1-->a2
			end
			subgraph two
			  b1-->b2
			end
			subgraph three
			  c1-->c2
			end`,
		expected: { geo: 9, arrow: 4, text: 0 },
	},
	{
		id: 'subgraph-explicit-id',
		title: 'Subgraph with explicit id and title',
		status: 'supported',
		source: `flowchart TB
			c1-->a2
			subgraph ide1 [one]
				a1-->a2
			end`,
		expected: { geo: 4, arrow: 2, text: 0, requiredGeoLabels: ['c1', 'a1', 'a2', 'one'] },
	},
	{
		id: 'subgraph-three-links',
		title: 'Inter-subgraph links and links to inner nodes',
		status: 'supported',
		source: `flowchart TB
			c1-->a2
			subgraph one
			  a1-->a2
			end
			subgraph two
			  b1-->b2
			end
			subgraph three
			  c1-->c2
			end
			one --> two
			three --> two
			two --> c2`,
		expected: { geo: 9, arrow: 7, text: 0 },
	},
	{
		id: 'subgraph-direction-nested',
		title: 'Nested subgraphs with direction blocks',
		status: 'supported',
		source: `flowchart LR
			subgraph TOP
				direction TB
				subgraph B1
					direction RL
					i1 -->f1
				end
				subgraph B2
					direction BT
					i2 -->f2
				end
			end
			A --> TOP --> B
			B1 --> B2`,
		expected: { geo: 9, arrow: 5, text: 0 },
	},
	{
		id: 'subgraph-direction-siblings',
		title: 'Sibling subgraphs with local direction',
		status: 'supported',
		source: `flowchart LR
			subgraph subgraph1
				direction TB
				top1[top] --> bottom1[bottom]
			end
			subgraph subgraph2
				direction TB
				top2[top] --> bottom2[bottom]
			end
			bottom1 --> top2`,
		expected: { geo: 6, arrow: 3, text: 0 },
	},
	{
		id: 'subgraph-markdown',
		title: 'Subgraphs with markdown and quoted labels',
		status: 'supported',
		source: `flowchart LR
			subgraph "One"
			  a("\`The **cat**
			  in the hat\`") -- "edge label" --> b{{"\`The **dog** in the hog\`"}}
			end
			subgraph "Two"
			  c("\`The **cat**
			  in the hat\`") -- "edge label" --> d{"The **dog** in the hog"}
			end`,
		expected: { geo: 5, arrow: 2, text: 0 },
	},
	{
		id: 'direction-bt',
		title: 'Bottom-to-top direction',
		status: 'supported',
		source: `flowchart BT
			Start --> Stop`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Start', 'Stop'] },
	},
	{
		id: 'direction-rl',
		title: 'Right-to-left direction',
		status: 'supported',
		source: `flowchart RL
			Start --> Stop`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Start', 'Stop'] },
	},
	{
		id: 'quoted-parentheses-text',
		title: 'Quoted text with parentheses',
		status: 'supported',
		source: `flowchart LR
			id1["This is the (text) in the box"]`,
		expected: {
			geo: 1,
			arrow: 0,
			text: 0,
			requiredGeoLabels: ['This is the (text) in the box'],
		},
	},
	{
		id: 'entity-labels',
		title: 'Character entities in labels',
		status: 'supported',
		source: `flowchart LR
			A["A double quote:#quot;"] --> B["A dec char:#9829;"]`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A dec char:#9829;'] },
	},
	{
		id: 'click-directives',
		title: 'Click directives should not alter node/edge structure',
		status: 'supported',
		source: `flowchart LR
			A-->B
			B-->C
			C-->D
			click A callback "Tooltip for a callback"
			click B "https://www.github.com" "This is a tooltip for a link"
			click C call callback() "Tooltip for a callback"
			click D href "https://www.github.com" "This is a tooltip for a link"`,
		expected: { geo: 4, arrow: 3, text: 0, requiredGeoLabels: ['A', 'B', 'C', 'D'] },
	},
	{
		id: 'classdef-directive',
		title: 'Class directives should not alter node/edge structure',
		status: 'supported',
		source: `flowchart LR
			A:::someclass --> B
			classDef someclass fill:#f96`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['A', 'B'] },
	},
	{
		id: 'style-directive',
		title: 'Style directives should not alter node/edge structure',
		status: 'supported',
		source: `flowchart LR
			id1(Start)-->id2(Stop)
			style id1 fill:#f9f,stroke:#333,stroke-width:4px
			style id2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['Start', 'Stop'] },
	},
	{
		id: 'fontawesome-labels',
		title: 'Icon-prefixed text labels',
		status: 'supported',
		source: `flowchart TD
			B["fa:fa-twitter for peace"]
			B-->C[fa:fa-ban forbidden]
			B-->D(fa:fa-spinner)
			B-->E(A fa:fa-camera-retro perhaps?)`,
		expected: { geo: 4, arrow: 3, text: 0 },
	},
	{
		id: 'frontmatter-header',
		title: 'Frontmatter before flowchart header',
		status: 'supported',
		source: `---
title: Node
---
flowchart LR
  A --> B`,
		expected: { geo: 2, arrow: 1, text: 0 },
	},
	{
		id: 'multinode-shortcuts',
		title: 'One-liner ampersand shortcuts',
		status: 'supported',
		source: `flowchart TB
			A & B--> C & D`,
		expected: { geo: 4, arrow: 4, text: 0 },
	},
	{
		id: 'edge-animation-block',
		title: 'Edge id + metadata block should not create extra nodes',
		status: 'supported',
		source: `flowchart LR
			A e1@==> B
			e1@{ animate: true }`,
		expected: { geo: 2, arrow: 1, text: 0, forbiddenGeoLabels: ['e1@'] },
	},
	{
		id: 'edge-curve-metadata',
		title: 'Edge curve metadata should not create synthetic nodes',
		status: 'supported',
		source: `flowchart LR
			A e1@==> B
			A e2@--> C
			e1@{ curve: linear }
			e2@{ curve: natural }`,
		expected: {
			geo: 3,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['A', 'B', 'C'],
			forbiddenGeoLabels: ['e1@', 'e2@'],
		},
	},
	{
		id: 'multidirectional-markers',
		title: 'Multi-directional edge markers',
		status: 'supported',
		source: `flowchart LR
			A o--o B
			B <--> C
			C x--x D`,
		expected: { geo: 4, arrow: 3, text: 0, forbiddenGeoLabels: ['A o', 'C x'] },
	},
]
