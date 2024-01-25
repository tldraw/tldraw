import { ExamplesLink } from './components/ExamplesLink'
import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { examples } from './examples'

export function HomePage() {
	return (
		<div className="examples">
			<div className="examples__header">
				<div className="examples__title">
					<ExamplesTldrawLogo /> examples
				</div>
				<p>
					See docs at <a href="https://tldraw.dev">tldraw.dev</a>
				</p>
			</div>
			<ul className="examples__list">
				{examples.map((e) =>
					e.value.map((e) => <ExamplesLink key={e.path} example={e} showDescriptionWhenInactive />)
				)}
			</ul>
			<hr />
		</div>
	)
}
