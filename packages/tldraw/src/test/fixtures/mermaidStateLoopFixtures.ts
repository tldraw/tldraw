export interface MermaidStateLoopFixture {
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
 * Fixture set derived from Mermaid state diagram docs:
 * https://mermaid.js.org/syntax/stateDiagram.html
 */
export const mermaidStateLoopFixtures: MermaidStateLoopFixture[] = [
	{
		id: 'simple-sample-v2',
		title: 'Simple sample (stateDiagram-v2)',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> Still
			Still --> [*]
			Still --> Moving
			Moving --> Still
			Moving --> Crash
			Crash --> [*]`,
		expected: { geo: 5, arrow: 6, text: 0, requiredGeoLabels: ['Still', 'Moving', 'Crash'] },
	},
	{
		id: 'simple-sample-legacy',
		title: 'Simple sample (stateDiagram)',
		status: 'supported',
		source: `stateDiagram
			[*] --> Still
			Still --> [*]
			Still --> Moving
			Moving --> Still
			Moving --> Crash
			Crash --> [*]`,
		expected: { geo: 5, arrow: 6, text: 0, requiredGeoLabels: ['Still', 'Moving', 'Crash'] },
	},
	{
		id: 'state-id-only',
		title: 'Single state id',
		status: 'supported',
		source: `stateDiagram-v2
			stateId`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['stateId'] },
	},
	{
		id: 'state-description-as',
		title: 'State description with "as" syntax',
		status: 'supported',
		source: `stateDiagram-v2
			state "This is a state description" as s2`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['This is a state description'] },
	},
	{
		id: 'state-description-colon',
		title: 'State description with colon syntax',
		status: 'supported',
		source: `stateDiagram-v2
			s2 : This is a state description`,
		expected: { geo: 1, arrow: 0, text: 0, requiredGeoLabels: ['This is a state description'] },
	},
	{
		id: 'transition-basic',
		title: 'Basic transition',
		status: 'supported',
		source: `stateDiagram-v2
			s1 --> s2`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['s1', 's2'] },
	},
	{
		id: 'transition-labeled',
		title: 'Labeled transition',
		status: 'supported',
		source: `stateDiagram-v2
			s1 --> s2: A transition`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['s1', 's2'] },
	},
	{
		id: 'start-and-end',
		title: 'Explicit start and end',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> s1
			s1 --> [*]`,
		expected: { geo: 3, arrow: 2, text: 0, requiredGeoLabels: ['s1'] },
	},
	{
		id: 'composite-basic',
		title: 'Composite states',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> First
			state First {
				[*] --> second
				second --> [*]
			}
			[*] --> NamedComposite
			NamedComposite: Another Composite
			state NamedComposite {
				[*] --> namedSimple
				namedSimple --> [*]
				namedSimple: Another simple
			}`,
		expected: {
			geo: 9,
			arrow: 6,
			text: 0,
			requiredGeoLabels: ['First', 'second', 'NamedComposite', 'Another simple'],
		},
	},
	{
		id: 'composite-nested',
		title: 'Nested composite states',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> First
			state First {
				[*] --> Second
				state Second {
					[*] --> second
					second --> Third
					state Third {
						[*] --> third
						third --> [*]
					}
				}
			}`,
		expected: {
			geo: 10,
			arrow: 6,
			text: 0,
			requiredGeoLabels: ['First', 'Second', 'second', 'Third', 'third'],
		},
	},
	{
		id: 'composite-inter-transition',
		title: 'Transitions between composite states',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> First
			First --> Second
			First --> Third
			state First {
				[*] --> fir
				fir --> [*]
			}
			state Second {
				[*] --> sec
				sec --> [*]
			}
			state Third {
				[*] --> thi
				thi --> [*]
			}`,
		expected: {
			geo: 13,
			arrow: 9,
			text: 0,
			requiredGeoLabels: ['First', 'Second', 'Third', 'fir', 'sec', 'thi'],
		},
	},
	{
		id: 'choice-state',
		title: 'Choice state',
		status: 'supported',
		source: `stateDiagram-v2
			state if_state <<choice>>
			[*] --> IsPositive
			IsPositive --> if_state
			if_state --> False: if n < 0
			if_state --> True : if n >= 0`,
		expected: {
			geo: 5,
			arrow: 4,
			text: 0,
			requiredGeoLabels: ['if_state', 'IsPositive', 'False', 'True'],
		},
	},
	{
		id: 'fork-join',
		title: 'Fork and join states',
		status: 'supported',
		source: `stateDiagram-v2
			state fork_state <<fork>>
			[*] --> fork_state
			fork_state --> State2
			fork_state --> State3
			state join_state <<join>>
			State2 --> join_state
			State3 --> join_state
			join_state --> State4
			State4 --> [*]`,
		expected: {
			geo: 7,
			arrow: 7,
			text: 0,
			requiredGeoLabels: ['fork_state', 'State2', 'State3', 'join_state', 'State4'],
		},
	},
	{
		id: 'notes',
		title: 'State notes',
		status: 'supported',
		source: `stateDiagram-v2
			State1: The state with a note
			note right of State1
				Important information! You can write
				notes.
			end note
			State1 --> State2
			note left of State2 : This is the note to the left.`,
		expected: { geo: 2, arrow: 1, text: 0, requiredGeoLabels: ['The state with a note', 'State2'] },
	},
	{
		id: 'concurrency',
		title: 'Concurrency blocks',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> Active
			state Active {
				[*] --> NumLockOff
				NumLockOff --> NumLockOn : EvNumLockPressed
				NumLockOn --> NumLockOff : EvNumLockPressed
				--
				[*] --> CapsLockOff
				CapsLockOff --> CapsLockOn : EvCapsLockPressed
				CapsLockOn --> CapsLockOff : EvCapsLockPressed
			}`,
		expected: {
			geo: 8,
			arrow: 7,
			text: 0,
			requiredGeoLabels: ['Active', 'NumLockOff', 'NumLockOn', 'CapsLockOff', 'CapsLockOn'],
		},
	},
	{
		id: 'direction-blocks',
		title: 'Direction statements',
		status: 'supported',
		source: `stateDiagram
			direction LR
			[*] --> A
			A --> B
			B --> C
			state B {
				direction LR
				a --> b
			}
			B --> D`,
		expected: { geo: 7, arrow: 5, text: 0, requiredGeoLabels: ['A', 'B', 'C', 'a', 'b', 'D'] },
	},
	{
		id: 'comments',
		title: 'Comments are ignored',
		status: 'supported',
		source: `stateDiagram-v2
			[*] --> Still
			Still --> [*] %% this is a comment
			Still --> Moving
			Moving --> Still %% another comment
			Moving --> Crash
			Crash --> [*]`,
		expected: { geo: 5, arrow: 6, text: 0, requiredGeoLabels: ['Still', 'Moving', 'Crash'] },
	},
	{
		id: 'classdef-state',
		title: 'Class definition and class suffix labels',
		status: 'supported',
		source: `stateDiagram-v2
			classDef future fill:white,stroke-dasharray: 5 5
			[*]-->Accumulate: start
			Accumulate--> [*]: end
			state "the future state" as Terminal:::future`,
		expected: {
			geo: 4,
			arrow: 2,
			text: 0,
			requiredGeoLabels: ['Accumulate', 'the future state'],
			forbiddenGeoLabels: ['Terminal:::future'],
		},
	},
]
