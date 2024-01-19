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
				{examples.map((e, i) => (
					<li key={'homeli ' + i}>
						<ul key={'homeul' + i}>
							{e
								.filter((item) => !item.hide)
								.map((item) => (
									<ListLink key={item.path} example={item} />
								))}
						</ul>
					</li>
				))}
			</ul>
			<hr />
			<ul className="examples__list"></ul>
		</div>
	)
}
