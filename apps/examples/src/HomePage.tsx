import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { ListLink } from './components/ListLink'
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
				{examples
					.filter((example) => !example.hide)
					.filter((example) => example.order !== null)
					.map((example) => (
						<ListLink key={example.path} example={example} showDescription />
					))}
			</ul>
			<hr />
			<ul className="examples__list">
				{examples
					.filter((example) => !example.hide)
					.filter((example) => example.order === null)
					.map((example) => (
						<ListLink key={example.path} example={example} showDescription />
					))}
			</ul>
		</div>
	)
}
