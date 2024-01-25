import { ListLink } from './components/ListLink'
import { examples } from './examples'

export function HomePage() {
	return (
		<div className="examples">
			<div className="examples__header">
				<div className="examples__title">
					<a href="/">
						<img className="tldraw-examples-logo__large" src="tldraw_dev_light.png" />
					</a>
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
						<ListLink key={example.path} example={example} showDescriptionWhenInactive />
					))}
			</ul>
			<hr />
			<ul className="examples__list">
				{examples
					.filter((example) => !example.hide)
					.filter((example) => example.order === null)
					.map((example) => (
						<ListLink key={example.path} example={example} showDescriptionWhenInactive />
					))}
			</ul>
		</div>
	)
}
