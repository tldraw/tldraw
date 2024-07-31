'use client'

import { createContext } from 'react'

const CodeLinksContext = createContext<Record<string, string>>({})

export const CodeLinkProvider: React.FC<{
	children: React.ReactNode
	links: Record<string, string>
}> = ({ children, links }) => {
	return <CodeLinksContext.Provider value={links}>{children}</CodeLinksContext.Provider>
}

export const CodeLinks: React.FC<{
	children: React.ReactNode
	links: Record<string, string>
}> = ({ children, links }) => {
	return <CodeLinksContext.Provider value={links}>{children}</CodeLinksContext.Provider>
}
