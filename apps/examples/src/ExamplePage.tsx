import * as Dialog from '@radix-ui/react-alert-dialog'
import { Dispatch, createContext, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Example, examples } from './examples'

const dialogContext = createContext<{
	example: Example | null
	setExampleDialog: Dispatch<Example | null>
}>({
	example: null,
	setExampleDialog: () => void null,
})

export function DialogContextProvider({ children }: { children: React.ReactNode }) {
	const [example, setExampleDialog] = useState<Example | null>(null)
	return (
		<dialogContext.Provider value={{ example, setExampleDialog }}>
			{children}
		</dialogContext.Provider>
	)
}

export function ExamplePage({
	example,
	children,
}: {
	example: Example
	children: React.ReactNode
}) {
	const categories = examples.map((e) => e.id)
	const [filterValue, setFilterValue] = useState('')
	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilterValue(e.target.value)
	}

	return (
		<DialogContextProvider>
			<div className="example">
				<div className="example__sidebar scroll-light">
					<div className="example__sidebar__header">
						<Link className="example__sidebar__header__logo" to="/">
							<TldrawLogo />
						</Link>
						<div className="example__sidebar__header__socials">
							<a
								target="_blank"
								href="https://twitter.com/tldraw"
								title="twitter"
								className="hoverable"
							>
								<SocialIcon icon="twitter" />
							</a>
							<a
								target="_blank"
								href="https://github.com/tldraw/tldraw"
								title="github"
								className="hoverable"
							>
								<SocialIcon icon="github" />
							</a>
							<a
								target="_blank"
								href="https://discord.com/invite/SBBEVCA4PG"
								title="discord"
								className="hoverable"
							>
								<SocialIcon icon="discord" />
							</a>
						</div>
					</div>
					<div className="example__sidebar__header-links">
						<a className="example__sidebar__header-link" href="/develop">
							Develop
						</a>
					</div>
					<input
						className="example__sidebar__filter"
						placeholder="Filter…"
						value={filterValue}
						onChange={handleFilterChange}
					/>
					<ul className="example__sidebar__categories scroll-light">
						{categories.map((currentCategory) => (
							<li key={currentCategory} className="example__sidebar__category">
								<h3 className="example__sidebar__category__header">{currentCategory}</h3>
								<ul className="example__sidebar__category__items">
									{examples
										.find((category) => category.id === currentCategory)
										?.value.filter((example) =>
											example.title.toLowerCase().includes(filterValue.toLowerCase())
										)
										.map((sidebarExample) => (
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
							className="example__sidebar__footer-link example__sidebar__footer-link--grey"
							target="_blank"
							href="https://github.com/tldraw/tldraw/issues/new?assignees=&labels=Example%20Request&projects=&template=example_request.yml&title=%5BExample Request%5D%3A+"
						>
							Request an example
						</a>
						<a
							className="example__sidebar__footer-link example__sidebar__footer-link--grey"
							target="_blank"
							href="https://tldraw.dev"
						>
							Visit the docs
						</a>
					</div>
				</div>
				<div className="example__content">
					{children}
					<Dialogs />
				</div>
			</div>
		</DialogContextProvider>
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
	const { setExampleDialog } = useContext(dialogContext)

	return (
		<li className="examples__sidebar__item" data-active={isActive}>
			<Link to={example.path} className="examples__sidebar__item__link hoverable" />
			<div className="examples__sidebar__item__title">
				<span>{example.title}</span>
			</div>
			{isActive && (
				<div className="example__sidebar__item__buttons">
					{example.details && (
						<button
							className="example__sidebar__item__button hoverable"
							onClick={() => setExampleDialog(example)}
						>
							<InfoIcon />
						</button>
					)}
					<Link
						to={`${example.path}/full`}
						className="example__sidebar__item__button hoverable"
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

function Markdown({
	sanitizedHtml,
	className = '',
}: {
	sanitizedHtml: string
	className?: string
}) {
	return (
		<div
			className={`examples__markdown ${className}`}
			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
		/>
	)
}

function Dialogs() {
	const { example, setExampleDialog } = useContext(dialogContext)
	if (!example) return null

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setExampleDialog(null)
		}
	}

	return (
		<Dialog.Root defaultOpen onOpenChange={handleOpenChange} open={!!example}>
			<Dialog.Overlay
				className="example__dialog__overlay"
				onPointerDown={() => setExampleDialog(null)}
			/>
			<Dialog.Content className="example__dialog__content">
				<h1>{example.title}</h1>
				<Markdown sanitizedHtml={example.details} className="example__dialog__markdown" />
				<div className="example__dialog__actions">
					<a href={example.codeUrl}>
						View Source <ExternalLinkIcon />
					</a>
					<Dialog.Cancel className="example__dialog__close">Close</Dialog.Cancel>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	)
}

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

function ExternalLinkIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
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
