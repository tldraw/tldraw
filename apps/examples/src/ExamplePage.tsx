import { AlertDialog as _AlertDialog } from 'radix-ui'
import { Dispatch, createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import tldrawSdkLogoLight from '../../../assets/tldraw_sdk_logo_light.png'
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
	const searchTerms = getSearchTerms(filterValue)
	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilterValue(e.target.value)
		history.replaceState(
			{},
			'',
			e.target.value ? `/?filter=${encodeURIComponent(e.target.value)}` : '/'
		)
	}

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search)
		const filter = urlParams.get('filter')
		if (filter) {
			setFilterValue(decodeURIComponent(filter))
		}
	}, [])

	return (
		<DialogContextProvider>
			<div className="example">
				<nav className="example__sidebar scroll-light">
					<div className="example__sidebar__top">
						<div className="example__sidebar__header">
							<Link className="example__sidebar__header__logo" to="/" aria-label="tldraw examples">
								<TldrawLogo />
							</Link>
							<span className="example__sidebar__header-title">Examples</span>
						</div>
						<div className="example__sidebar__section">
							<label className="example__sidebar__search hoverable">
								<SearchIcon />
								<input
									className="example__sidebar__filter"
									id="example-sidebar-filter"
									name="filter"
									aria-label="Search examples"
									placeholder="Search..."
									value={filterValue}
									onChange={handleFilterChange}
								/>
							</label>
							<a className="example__sidebar__action-row hoverable" href="/develop">
								<CodeIcon />
								<span>Develop</span>
							</a>
						</div>
						<div className="example__sidebar__divider" />
					</div>
					<ul className="example__sidebar__categories scroll-light">
						{categories.map((currentCategory) => (
							<li key={currentCategory} className="example__sidebar__category">
								<h3 className="example__sidebar__category__header">{currentCategory}</h3>
								<ul className="example__sidebar__category__items">
									{examples
										.find((category) => category.id === currentCategory)
										?.value.filter((example) => {
											return exampleMatchesSearch(example, searchTerms)
										})
										.map((sidebarExample) => (
											<ExampleSidebarListItem
												key={sidebarExample.path}
												example={sidebarExample}
												isActive={sidebarExample.path === example.path}
												searchTerms={searchTerms}
											/>
										))}
								</ul>
							</li>
						))}
					</ul>
					<div className="example__sidebar__footer-links">
						<a className="example__sidebar__footer-link hoverable" href="/develop">
							<CodeIcon />
							<span>Build with the tldraw SDK</span>
						</a>
						<a
							className="example__sidebar__footer-link hoverable hoverable__small"
							target="_blank"
							rel="noopener noreferrer"
							href="https://github.com/tldraw/tldraw/issues/new?assignees=&labels=Example%20Request&projects=&template=example_request.yml&title=%5BExample Request%5D%3A+"
						>
							<RequestIcon />
							<span>Request an example</span>
						</a>
						<a
							className="example__sidebar__footer-link hoverable hoverable__small"
							target="_blank"
							rel="noopener noreferrer"
							href="https://tldraw.dev/?utm_source=examples&utm_medium=organic&utm_campaign=examples"
						>
							<ExternalLinkIcon />
							<span>Visit the docs</span>
						</a>
					</div>
				</nav>
				<div className="example__content" role="main">
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
	searchTerms,
}: {
	example: Example
	isActive?: boolean
	searchTerms: string[]
	showDescriptionWhenInactive?: boolean
}) {
	const ref = useRef<HTMLLIElement>(null)
	const { setExampleDialog } = useContext(dialogContext)

	useEffect(() => {
		if (isActive) {
			if (!ref.current) return
			const rect = ref.current.getBoundingClientRect()
			if (rect.top < 0 || rect.bottom > window.innerHeight) {
				ref.current.scrollIntoView({ behavior: 'instant', block: 'start' })
			}
		}
	}, [isActive])

	return (
		<li ref={ref} className="examples__sidebar__item" data-active={isActive}>
			<Link
				to={example.path}
				className="examples__sidebar__item__link"
				aria-label={example.title}
			/>
			<div className="examples__sidebar__item__content">
				<span className="examples__sidebar__item__title">
					<HighlightedSearchText text={example.title} searchTerms={searchTerms} />
				</span>
			</div>
			{isActive && (
				<div className="example__sidebar__item__buttons">
					<button
						type="button"
						className="example__sidebar__item__button hoverable hoverable__small"
						onClick={() => setExampleDialog(example)}
						aria-label="Info"
					>
						<InfoIcon />
					</button>
					<Link
						to={`${example.path}/full`}
						className="example__sidebar__item__button hoverable hoverable__small"
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

const ignoredSearchTerms = new Set(['a', 'the'])

function getSearchTerms(value: string) {
	return value
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter((term) => term.length > 0 && !ignoredSearchTerms.has(term))
}

function exampleMatchesSearch(example: Example, searchTerms: string[]) {
	if (!searchTerms.length) return true

	const title = example.title.toLowerCase()
	const keywords = example.keywords.map((keyword) => keyword.toLowerCase())

	return searchTerms.some((term) => {
		return title.includes(term) || keywords.some((keyword) => keyword.includes(term))
	})
}

function HighlightedSearchText({ text, searchTerms }: { text: string; searchTerms: string[] }) {
	const matchRanges = getSearchMatchRanges(text, searchTerms)
	if (!matchRanges.length) return <>{text}</>

	const parts: React.ReactNode[] = []
	let cursor = 0

	for (const [start, end] of matchRanges) {
		if (start > cursor) {
			parts.push(text.slice(cursor, start))
		}
		parts.push(
			<strong key={`${start}-${end}`} className="examples__sidebar__item__title__match">
				{text.slice(start, end)}
			</strong>
		)
		cursor = end
	}

	if (cursor < text.length) {
		parts.push(text.slice(cursor))
	}

	return <>{parts}</>
}

function getSearchMatchRanges(text: string, searchTerms: string[]) {
	const lowerText = text.toLowerCase()
	const ranges: Array<[number, number]> = []

	for (const term of searchTerms) {
		let matchIndex = lowerText.indexOf(term)
		while (matchIndex !== -1) {
			ranges.push([matchIndex, matchIndex + term.length])
			matchIndex = lowerText.indexOf(term, matchIndex + term.length)
		}
	}

	if (!ranges.length) return ranges

	ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1])

	const mergedRanges: Array<[number, number]> = []
	for (const [start, end] of ranges) {
		const previous = mergedRanges[mergedRanges.length - 1]
		if (!previous || start > previous[1]) {
			mergedRanges.push([start, end])
		} else if (end > previous[1]) {
			previous[1] = end
		}
	}

	return mergedRanges
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
	const [content, setContent] = useState<{ description: string; details: string } | null>(null)

	useEffect(() => {
		if (!example) {
			setContent(null)
			return
		}
		let active = true
		setContent(null)
		example
			.loadContent()
			.then((nextContent) => {
				if (active) setContent(nextContent)
			})
			.catch((error) => {
				console.error(error)
			})
		return () => {
			active = false
		}
	}, [example])

	if (!example) return null

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setExampleDialog(null)
		}
	}

	return (
		<_AlertDialog.Root defaultOpen onOpenChange={handleOpenChange} open={!!example}>
			<_AlertDialog.Overlay
				className="example__dialog__overlay"
				onPointerDown={() => setExampleDialog(null)}
			/>
			<_AlertDialog.Content className="example__dialog__content">
				<div className="example__dialog__header">
					<_AlertDialog.Title className="example__dialog__title">
						{example.title}
					</_AlertDialog.Title>
					<_AlertDialog.Cancel className="example__dialog__header__close" aria-label="Close">
						<CloseIcon />
					</_AlertDialog.Cancel>
				</div>
				<_AlertDialog.Description asChild>
					<div className="example__dialog__body">
						<Markdown
							sanitizedHtml={content?.description ?? ''}
							className="example__dialog__markdown"
						/>
						<Markdown
							sanitizedHtml={content?.details ?? ''}
							className="example__dialog__markdown"
						/>
					</div>
				</_AlertDialog.Description>
				<div className="example__dialog__actions">
					<a href={example.codeUrl}>
						View Source <ExternalLinkIcon />
					</a>
					<_AlertDialog.Cancel className="example__dialog__close">Close</_AlertDialog.Cancel>
				</div>
			</_AlertDialog.Content>
		</_AlertDialog.Root>
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

function CloseIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function SearchIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M6.5 1.5C3.73858 1.5 1.5 3.73858 1.5 6.5C1.5 9.26142 3.73858 11.5 6.5 11.5C7.65047 11.5 8.71022 11.1115 9.55542 10.4583L12.1464 13.0493C12.3417 13.2446 12.6583 13.2446 12.8536 13.0493C13.0488 12.8541 13.0488 12.5375 12.8536 12.3422L10.2929 9.78159C11.0454 8.90364 11.5 7.76158 11.5 6.5C11.5 3.73858 9.26142 1.5 6.5 1.5ZM2.5 6.5C2.5 4.29086 4.29086 2.5 6.5 2.5C8.70914 2.5 10.5 4.29086 10.5 6.5C10.5 8.70914 8.70914 10.5 6.5 10.5C4.29086 10.5 2.5 8.70914 2.5 6.5Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function CodeIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M5.08211 4.14645C5.27737 4.34171 5.27737 4.65829 5.08211 4.85355L2.93566 7L5.08211 9.14645C5.27737 9.34171 5.27737 9.65829 5.08211 9.85355C4.88684 10.0488 4.57026 10.0488 4.375 9.85355L1.875 7.35355C1.67974 7.15829 1.67974 6.84171 1.875 6.64645L4.375 4.14645C4.57026 3.95118 4.88684 3.95118 5.08211 4.14645ZM9.91789 4.14645C10.1132 3.95118 10.4297 3.95118 10.625 4.14645L13.125 6.64645C13.3203 6.84171 13.3203 7.15829 13.125 7.35355L10.625 9.85355C10.4297 10.0488 10.1132 10.0488 9.91789 9.85355C9.72263 9.65829 9.72263 9.34171 9.91789 9.14645L12.0643 7L9.91789 4.85355C9.72263 4.65829 9.72263 4.34171 9.91789 4.14645ZM8.10801 2.69231C8.37582 2.75926 8.53866 3.03064 8.4717 3.29846L6.4717 11.2985C6.40475 11.5663 6.13337 11.7291 5.86556 11.6622C5.59775 11.5952 5.43491 11.3238 5.50186 11.056L7.50186 3.056C7.56882 2.78819 7.8402 2.62535 8.10801 2.69231Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}

function RequestIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M7.5 1.25C4.32436 1.25 1.75 3.39594 1.75 6.04348C1.75 7.5002 2.52661 8.80393 3.75 9.68303V12.25C3.75 12.4336 3.85072 12.6024 4.01236 12.6895C4.174 12.7765 4.37074 12.7679 4.52414 12.6669L7.42728 10.75H7.5C10.6756 10.75 13.25 8.60406 13.25 5.95652C13.25 3.35395 10.6756 1.25 7.5 1.25ZM2.75 6.04348C2.75 3.99548 4.81219 2.25 7.5 2.25C10.1878 2.25 12.25 3.95051 12.25 5.95652C12.25 8.00452 10.1878 9.75 7.5 9.75H7.27698C7.17903 9.75 7.08325 9.77876 7.0015 9.83272L4.75 11.3192V9.42109C4.75 9.25249 4.6651 9.09525 4.52414 9.00259C3.43689 8.28784 2.75 7.22212 2.75 6.04348ZM5 5.75C5 5.47386 5.22386 5.25 5.5 5.25H9.5C9.77614 5.25 10 5.47386 10 5.75C10 6.02614 9.77614 6.25 9.5 6.25H5.5C5.22386 6.25 5 6.02614 5 5.75Z"
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
	return (
		<img
			className="examples__tldraw__logo"
			src={tldrawSdkLogoLight}
			alt="tldraw SDK"
			draggable={false}
		/>
	)
}
