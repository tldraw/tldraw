import { ReactNode, createContext, useContext } from 'react'

const SneakyExampleContentContext = createContext<ReactNode>(null)

/** @internal */
export const SneakyExampleContentProvider = SneakyExampleContentContext.Provider

export function useSneakyExampleContent() {
	return useContext(SneakyExampleContentContext)
}
