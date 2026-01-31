import { Example, examples } from '../lib/examples/index'

interface ExamplesSidebarProps {
	onLoadExample: (name: string, code: string) => void
	selectedExample: string | null
}

/**
 * Thin sidebar bar showing all available examples.
 * Always visible on the left side of the code panel.
 */
export function ExamplesSidebar({ onLoadExample, selectedExample }: ExamplesSidebarProps) {
	// Group examples by category based on naming patterns
	const categorizedExamples = categorizeExamples(examples)

	return (
		<div className="examples-sidebar">
			<div className="examples-sidebar-content">
				{Object.entries(categorizedExamples).map(([category, categoryExamples]) => (
					<div key={category} className="examples-category">
						<div className="examples-category-header">{category}</div>
						{categoryExamples.map((example) => (
							<button
								key={example.name}
								className={`examples-item ${example.name === selectedExample ? 'selected' : ''}`}
								onClick={() => onLoadExample(example.name, example.code)}
							>
								{example.name}
							</button>
						))}
					</div>
				))}
			</div>
		</div>
	)
}

/**
 * Categorize examples based on their names
 */
function categorizeExamples(examplesList: Example[]): Record<string, Example[]> {
	const categories: Record<string, Example[]> = {
		'Getting started': [],
		'3D & Graphics': [],
		Games: [],
		Physics: [],
		'Math & Algorithms': [],
		Interactive: [],
		'Time & Utilities': [],
		Other: [],
	}

	for (const example of examplesList) {
		const name = example.name.toLowerCase()

		if (
			name.includes('modify') ||
			name.includes('color') ||
			name.includes('camera') ||
			name.includes('bezier') ||
			name.includes('gallery')
		) {
			categories['Getting started'].push(example)
		} else if (
			name.includes('3d') ||
			name.includes('sphere') ||
			name.includes('cube') ||
			name.includes('torus') ||
			name.includes('starfield') ||
			name.includes('watercolor')
		) {
			categories['3D & Graphics'].push(example)
		} else if (
			name.includes('invaders') ||
			name.includes('tetris') ||
			name.includes('pong') ||
			name.includes('snake') ||
			name.includes('whack') ||
			name.includes('pool')
		) {
			categories['Games'].push(example)
		} else if (
			name.includes('physics') ||
			name.includes('cloth') ||
			name.includes('rope') ||
			name.includes('pendulum') ||
			name.includes('particle') ||
			name.includes('bouncing')
		) {
			categories['Physics'].push(example)
		} else if (
			name.includes('fractal') ||
			name.includes('lissajous') ||
			name.includes('lorenz') ||
			name.includes('turing') ||
			name.includes('game of life') ||
			name.includes('maze') ||
			name.includes('spiral')
		) {
			categories['Math & Algorithms'].push(example)
		} else if (
			name.includes('mouse') ||
			name.includes('click') ||
			name.includes('zoom') ||
			name.includes('attract')
		) {
			categories['Interactive'].push(example)
		} else if (
			name.includes('clock') ||
			name.includes('timer') ||
			name.includes('calendar') ||
			name.includes('stopwatch') ||
			name.includes('year') ||
			name.includes('pomodoro')
		) {
			categories['Time & Utilities'].push(example)
		} else {
			categories['Other'].push(example)
		}
	}

	// Filter out empty categories
	const result: Record<string, Example[]> = {}
	for (const [category, items] of Object.entries(categories)) {
		if (items.length > 0) {
			result[category] = items
		}
	}

	return result
}
