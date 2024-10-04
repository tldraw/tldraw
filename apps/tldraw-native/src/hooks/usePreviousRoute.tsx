import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const PreviousRouteContext = createContext<{ pathname: string | null } | null>(null)

export function PreviousRouteProvider({ children }: { children: ReactNode }) {
	const pathname = useLocation().pathname
	const [previousPathname, setPreviousPathname] = useState<string | null>(null)
	const pathnameRef = useRef(pathname)
	if (pathnameRef.current !== pathname && previousPathname !== pathnameRef.current) {
		setPreviousPathname(pathnameRef.current)
	}
	useEffect(() => {
		pathnameRef.current = pathname
	}, [pathname])

	return (
		<PreviousRouteContext.Provider value={{ pathname: previousPathname }}>
			{children}
		</PreviousRouteContext.Provider>
	)
}

export function usePreviousPathname() {
	const context = useContext(PreviousRouteContext)
	if (!context) {
		throw new Error('usePreviousPathname must be used within a PreviousRouteProvider')
	}
	return context.pathname
}
