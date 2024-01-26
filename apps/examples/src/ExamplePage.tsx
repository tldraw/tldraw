import { Link } from 'react-router-dom'
import { ExternalLinkIcon } from './components/ExternalIcon'
import { Markdown } from './components/Markdown'
import { StandaloneIcon } from './components/StandaloneIcon'
import { Example, examples } from './examples'

export function ExamplePage({
	example,
	children,
}: {
	example: Example
	children: React.ReactNode
}) {
	return (
		<div className="example">
			<div className="example__header">
				<Link to="/" className="example__header__logo">
					<img src="/tldraw_dev_dark.png" alt="tldraw logo" />
				</Link>
			</div>
			<div className="example__sidebar">
				<ul className="example__sidebar__list scroll-light">
					{examples
						.filter((e) => !e.hide)
						.filter((e) => e.order !== null)
						.map((e) => (
							<li
								key={e.codeUrl}
								className="example__sidebar__list__item hoverable"
								data-active={e.path === example.path}
							>
								<Link to={e.path} title={e.title}>
									{e.title}
								</Link>
							</li>
						))}
					<li>
						<hr />
					</li>
					{examples
						.filter((e) => !e.hide)
						.filter((e) => e.order === null)
						.map((e) => (
							<li
								key={e.codeUrl}
								className="example__sidebar__list__item hoverable"
								data-active={e.path === example.path}
							>
								<Link to={e.path} title={e.title}>
									{e.title}
								</Link>
							</li>
						))}
				</ul>
			</div>
			<div className="example__main">
				<div className="example__editor">{children}</div>
				<div className="example__content">
					<div className="example__content__header">
						<h1 className="example__content__title">{example.title}</h1>
						<div className="example__content__links">
							<h1 className="example__content__title" aria-role="baseline-setter">
								&nbsp;
							</h1>
							<div className="example__content-source-link hoverable">
								<Link to={example.codeUrl} target="_blank" rel="noreferrer">
									View source <ExternalLinkIcon />
								</Link>
							</div>
							<div className="example__content-source-link hoverable">
								<Link to={`${example.path}/full`}>
									Full screen <StandaloneIcon />
								</Link>
							</div>
						</div>
					</div>
					<Markdown className="example__content-details" sanitizedHtml={example.details} />
				</div>
			</div>
		</div>
	)
}
