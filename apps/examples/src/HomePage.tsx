import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { SpanLink } from './components/ListLink'
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
					e.array.map((e) => <SpanLink key={e.path} example={e} showDescriptionWhenInactive />)
				)}
			</ul>
			<hr />
		</div>
	)
}
