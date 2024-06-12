'use client'

import { SandpackCodeViewer, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'
import React, {
	Fragment,
	ReactElement,
	ReactNode,
	cloneElement,
	createContext,
	isValidElement,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { A } from './generic'

const CodeLinksContext = createContext<Record<string, string>>({})

export function CodeLinkProvider({
	children,
	links,
}: {
	children: React.ReactNode
	links: Record<string, string>
}) {
	return <CodeLinksContext.Provider value={links}>{children}</CodeLinksContext.Provider>
}

export function Code({ children, ...props }: React.ComponentProps<'code'>) {
	const codeLinks = useContext(CodeLinksContext)

	const newChildren = useMemo(() => {
		// to linkify code, we have to do quite a lot of work. we need to take the output of
		// Highlight.js and transform it to add hyperlinks to certain tokens. There are a few things
		// that make this difficult:
		//
		// 1, the structure is recursive. A function span will include a bunch of other spans making
		// up the whole definition of the function, for example.
		//
		// 2, a given span doesn't necessarily correspond to a single identifier. For example, this
		// code: `dispatch: (info: TLEventInfo) => this` will be split like this:
		// - `dispatch`
		// - `: (info: TLEventInfo) => `
		// - `this`
		//
		// That means we need to take highlight.js's tokens and split them into our own tokens that
		// contain single identifiers to linkify.
		//
		// 3, a single identifier can be split across multiple spans. For example,
		// `Omit<Geometry2dOptions>` will be split like this:
		// - `Omit`
		// - `<`
		// - `Geometry2`
		// - `dOptions`
		// - `>`
		//
		// I don't know why this happens, it feels like a bug. We handle this by keeping track of &
		// merging consecutive tokens if they're identifiers with no non-identifier tokens in
		// between.

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

		// recursively process the children array
		function processChildrenArray(children: ReactNode): ReactNode {
			if (!Array.isArray(children)) {
				if (!children) return children
				return processChildrenArray([children])
			}

			// these are the new linkified children, the result of this function
			const newChildren = []

			// in order to deal with token splitting/merging, we need to keep track of the last
			// highlight span we saw. this has the right classes on it to colorize the current
			// token.
			let lastSeenHighlightSpan: ReactElement | null = null
			// the current identifier that we're building up by merging consecutive tokens
			let currentIdentifier: string | null = null
			// whether the current span is closed, but we're still in the same identifier and might
			// still need to append to it
			let isCurrentSpanClosed = false

			function startSpan(span: ReactElement) {
				lastSeenHighlightSpan = span
				isCurrentSpanClosed = false
			}

			function closeSpan() {
				isCurrentSpanClosed = true
				if (!currentIdentifier) {
					lastSeenHighlightSpan = null
				}
			}

			function pushInCurrentSpan(content: ReactNode) {
				if (lastSeenHighlightSpan) {
					newChildren.push(
						cloneElement(lastSeenHighlightSpan, {
							key: newChildren.length,
							children: content,
						})
					)
				} else {
					newChildren.push(<Fragment key={newChildren.length}>{content}</Fragment>)
				}
			}

			function finishCurrentIdentifier() {
				if (currentIdentifier) {
					const link = codeLinks[currentIdentifier]
					if (link) {
						pushInCurrentSpan(
							<A href={link} className="code-link">
								{currentIdentifier}
							</A>
						)
					} else {
						pushInCurrentSpan(currentIdentifier)
					}
					currentIdentifier = null
				}
				if (isCurrentSpanClosed) {
					lastSeenHighlightSpan = null
				}
			}

			function pushToken(token: string) {
				if (isIdentifier(token)) {
					if (currentIdentifier) {
						currentIdentifier += token
					} else {
						currentIdentifier = token
					}
				} else {
					finishCurrentIdentifier()
					pushInCurrentSpan(token)
				}
			}

			for (const child of children) {
				if (typeof child === 'string') {
					for (const token of tokenize(child)) {
						pushToken(token)
					}
				} else if (isValidElement<{ children: ReactNode }>(child)) {
					if (child.type === 'span' && typeof child.props.children === 'string') {
						startSpan(child)
						for (const token of tokenize(child.props.children)) {
							pushToken(token)
						}
						closeSpan()
					} else {
						finishCurrentIdentifier()
						newChildren.push(
							cloneElement(child, {
								key: newChildren.length,
								children: processChildrenArray(child.props.children),
							})
						)
					}
				} else {
					throw new Error(`Invalid code child: ${JSON.stringify(child)}`)
				}
			}

			finishCurrentIdentifier()

			return newChildren
		}

		return processChildrenArray(children)
	}, [children, codeLinks])

	return <code {...props}>{newChildren}</code>
}

export function CodeBlock({ code }: { code: SandpackFiles }) {
	const [isClientSide, setIsClientSide] = useState(false)
	const { theme } = useTheme()
	useEffect(() => setIsClientSide(true), [])

	// This is to avoid hydration mismatch between the server and the client because of the useTheme.
	if (!isClientSide) {
		return null
	}

	const trimmedCode = Object.fromEntries(
		Object.entries(code).map(([key, value]) => [key, (value as string).trim()])
	)
	return (
		<div className="code-example">
			<SandpackProvider
				className="sandpack"
				key={`sandpack-${theme}`}
				template="react-ts"
				options={{ activeFile: Object.keys(code)[0] }}
				customSetup={{
					dependencies: {
						'@tldraw/assets': 'latest',
						tldraw: 'latest',
					},
				}}
				files={trimmedCode}
				theme={theme === 'dark' ? 'dark' : 'light'}
			>
				<SandpackCodeViewer />
			</SandpackProvider>
		</div>
	)
}
