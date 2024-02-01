import { Link } from 'react-router-dom'
import { Example, examples } from './examples'

export function ExamplePage({
	example,
	children,
}: {
	example: Example
	children: React.ReactNode
}) {
	const categories = examples.map((e) => e.id)

	return (
		<div className="example">
			<div className="example__sidebar scroll-light">
				<div className="example__sidebar__header">
					<Link className="example__sidebar__header__logo" to="/">
						<TldrawLogo />
					</Link>
					<div className="example__sidebar__header__socials">
						<a href="https://twitter.com/tldraw" title="twitter" className="hoverable">
							<SocialIcon icon="twitter" />
						</a>
						<a href="https://github.com/tldraw/tldraw" title="github" className="hoverable">
							<SocialIcon icon="github" />
						</a>
						<a href="https://discord.com/invite/SBBEVCA4PG" title="discord" className="hoverable">
							<SocialIcon icon="discord" />
						</a>
					</div>
				</div>
				<ul className="example__sidebar__categories scroll-light">
					{categories.map((currentCategory) => (
						<li className="example__sidebar__category">
							<h3 className="example__sidebar__category__header">{currentCategory}</h3>
							<ul className="example__sidebar__category__items">
								{examples
									.find((category) => category.id === currentCategory)
									?.value.map((sidebarExample) => (
										<ExampleSidebarListItem
											key={sidebarExample.path}
											example={sidebarExample}
											isActive={sidebarExample.path === example.path}
										/>
									))}
							</ul>
						</li>
					))}
				</ul>
				<div className="example__sidebar__footer-links">
					<a
						className="link__button link__button--grey"
						target="_blank"
						href="https://github.com/tldraw/tldraw/issues/new?assignees=&labels=Example%20Request&projects=&template=example_request.yml&title=%5BExample Request%5D%3A+"
					>
						Request an example
					</a>
					<a className="link__button link__button--grey" target="_blank" href="https://tldraw.dev">
						Visit the docs
					</a>
				</div>
			</div>
			<div className="example__content">{children}</div>
		</div>
	)
}

function ExampleSidebarListItem({
	example,
	isActive,
}: {
	example: Example
	isActive?: boolean
	showDescriptionWhenInactive?: boolean
}) {
	return (
		<li className="examples__sidebar__item" data-active={isActive}>
			<Link to={example.path} className="examples__sidebar__item__link hoverable" />
			<h3 className="examples__sidebar__item__title">
				<span>{example.title}</span>
			</h3>
			{isActive && (
				<div className="examples__list__item__buttons">
					<Link
						to={`${example.path}/full`}
						className="examples__list__item__button hoverable"
						aria-label="Standalone"
						title="View standalone example"
					>
						<InfoIcon />
					</Link>
					<Link
						to={`${example.path}/full`}
						className="examples__list__item__button hoverable"
						aria-label="Standalone"
						title="View standalone example"
					>
						<StandaloneIcon />
					</Link>
				</div>
			)}
		</li>
	)
}

// function Markdown({
// 	sanitizedHtml,
// 	className = '',
// }: {
// 	sanitizedHtml: string
// 	className?: string
// }) {
// 	return (
// 		<div
// 			className={`examples__markdown ${className}`}
// 			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
// 		/>
// 	)
// }

function SocialIcon({ icon }: { icon: string }) {
	return (
		<img
			className="example__sidebar__icon"
			src={`/icons/${icon}.svg`}
			style={{
				mask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
				WebkitMask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
			}}
		/>
	)
}

function StandaloneIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M2 2.5C2 2.22386 2.22386 2 2.5 2H5.5C5.77614 2 6 2.22386 6 2.5C6 2.77614 5.77614 3 5.5 3H3V5.5C3 5.77614 2.77614 6 2.5 6C2.22386 6 2 5.77614 2 5.5V2.5ZM9 2.5C9 2.22386 9.22386 2 9.5 2H12.5C12.7761 2 13 2.22386 13 2.5V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3H9.5C9.22386 3 9 2.77614 9 2.5ZM2.5 9C2.77614 9 3 9.22386 3 9.5V12H5.5C5.77614 12 6 12.2239 6 12.5C6 12.7761 5.77614 13 5.5 13H2.5C2.22386 13 2 12.7761 2 12.5V9.5C2 9.22386 2.22386 9 2.5 9ZM12.5 9C12.7761 9 13 9.22386 13 9.5V12.5C13 12.7761 12.7761 13 12.5 13H9.5C9.22386 13 9 12.7761 9 12.5C9 12.2239 9.22386 12 9.5 12H12V9.5C12 9.22386 12.2239 9 12.5 9Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function InfoIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM8.24992 4.49999C8.24992 4.9142 7.91413 5.24999 7.49992 5.24999C7.08571 5.24999 6.74992 4.9142 6.74992 4.49999C6.74992 4.08577 7.08571 3.74999 7.49992 3.74999C7.91413 3.74999 8.24992 4.08577 8.24992 4.49999ZM6.00003 5.99999H6.50003H7.50003C7.77618 5.99999 8.00003 6.22384 8.00003 6.49999V9.99999H8.50003H9.00003V11H8.50003H7.50003H6.50003H6.00003V9.99999H6.50003H7.00003V6.99999H6.50003H6.00003V5.99999Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function TldrawLogo() {
	return <img className="examples__tldraw__logo" src="tldraw_dev_light.png" />
}
