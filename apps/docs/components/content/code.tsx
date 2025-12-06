'use client'

import { cn } from '@/utils/cn'
import { assert, getOwnProperty } from '@tldraw/utils'
import React, {
	Fragment,
	ReactElement,
	ReactNode,
	createContext,
	isValidElement,
	useContext,
	useMemo,
} from 'react'
import { TldrawLink } from '../common/tldraw-link'

const CodeLinksContext = createContext<Record<string, string>>({})

export function CodeLinks({
	children,
	links,
}: {
	children: React.ReactNode
	links: Record<string, string>
}) {
	return <CodeLinksContext.Provider value={links}>{children}</CodeLinksContext.Provider>
}

const FocusLinesContext = createContext<null | number[]>(null)
export function FocusLines({ children, lines }: { children: ReactNode; lines: number[] }) {
	return <FocusLinesContext.Provider value={lines}>{children}</FocusLinesContext.Provider>
}

const blurredLineClassName = '[&_*]:!opacity-60 [&_*]:!text-white'

function CodeLink({ children, href }: { children: ReactNode; href: string }) {
	return (
		<TldrawLink
			href={href}
			className="group-[.not-prose]:underline group-[.not-prose]:hover:no-underline decoration-[#667e8b]"
		>
			{children}
		</TldrawLink>
	)
}

// does this token look like a JS identifier?
function isIdentifier(token: string): boolean {
	return /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/g.test(token)
}

// split the code into an array of identifiers, and the bits in between them
function tokenize(code: string): string[] {
	const identifierRegex = /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*/g

	let currentIdx = 0
	const tokens = []
	for (const identifierMatch of code.matchAll(identifierRegex)) {
		const [identifier] = identifierMatch
		const idx = identifierMatch.index
		if (idx > currentIdx) {
			tokens.push(code.slice(currentIdx, idx))
		}
		tokens.push(identifier)
		currentIdx = idx + identifier.length
	}
	if (currentIdx < code.length) {
		tokens.push(code.slice(currentIdx))
	}

	return tokens
}

// this is for inline code blocks (e.g. `code`)
// these don't get highlighted, so the children is just a string
function InlineCodeElem({ children, ...props }: React.ComponentProps<'code'>) {
	const code = children as string
	assert(typeof code === 'string', 'InlineCodeElem children must be a string')
	const codeLinks = useContext(CodeLinksContext)
	return useMemo(
		() => (
			<code {...props}>
				{codeLinks
					? tokenize(code).map((token, i) => {
							if (isIdentifier(token)) {
								const link = getOwnProperty(codeLinks, token)
								if (link) {
									return (
										<CodeLink key={i} href={link}>
											{token}
										</CodeLink>
									)
								}
							}
							return <Fragment key={i}>{token}</Fragment>
						})
					: code}
			</code>
		),
		[code, codeLinks, props]
	)
}

// This is code that has been highlighted by shikijs
// Children is an array of spans, each representing a line and containing an array of spans which are tokens
// There is sometimes whitespace between the lines
function HighlightedCodeElem({ children, ...props }: React.ComponentProps<'code'>) {
	const codeLinks = useContext(CodeLinksContext)
	const focusLines = useContext(FocusLinesContext)

	let lineNumber = 0
	return (
		<code {...props}>
			{React.Children.map(children, (line) => {
				// ignore whitespace
				if (!line || !isValidElement(line)) return line

				assert(line.type === 'span', 'Invalid code child (not a span)')
				assert(line.props.className === 'line', 'Invalid code child (not a line)')

				// apply line lowlights
				lineNumber++
				if (focusLines && !focusLines?.includes(lineNumber)) {
					line = React.cloneElement(line, {
						...line.props,
						className: cn(line.props?.className, blurredLineClassName),
					})
				}
				// inject links where needed
				if (codeLinks) {
					line = React.cloneElement(line as ReactElement, {
						...line.props,
						children: React.Children.map(line.props.children, (elem) => {
							if (!isValidElement<any>(elem)) return elem
							if (elem.type !== 'span') return elem
							const token = elem.props.children
							if (typeof token !== 'string') return elem
							const tokens = tokenize(token)
							return React.cloneElement(elem, {
								...elem.props,
								children: tokens.map((token, i) => {
									if (!isIdentifier(token)) return token
									const link = getOwnProperty(codeLinks, token)
									if (!link) return token
									return (
										<CodeLink href={link} key={i}>
											{token}
										</CodeLink>
									)
								}),
							})
						}),
					})
				}
				return line
			})}
		</code>
	)
}

export function Code(props: React.ComponentProps<'code'>) {
	if (typeof props.children === 'string') {
		return <InlineCodeElem {...props} />
	}
	if (Array.isArray(props.children) && props.children[0].props?.className === 'line') {
		return <HighlightedCodeElem {...props} />
	}
	if (
		isValidElement<any>(props.children) &&
		props.children.type === 'span' &&
		props.children.props?.className === 'line'
	) {
		// eslint-disable-next-line react/no-children-prop
		return <HighlightedCodeElem {...props} children={[props.children]} />
	}
	console.warn('Invalid code children', props.children)
	return <code {...props} />
}
