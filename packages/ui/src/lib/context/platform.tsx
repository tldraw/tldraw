import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

/** @public */
export interface TlPlatformContextValue {
	isDarwin: boolean
	isCoarsePointer: boolean
	animationSpeed: number
}

const defaultPlatform: TlPlatformContextValue = {
	isDarwin: false,
	isCoarsePointer: false,
	animationSpeed: 1,
}

function detectIsDarwin(): boolean {
	if (typeof navigator === 'undefined') return false
	return navigator.userAgent.toLowerCase().indexOf('mac') > -1
}

function detectIsCoarsePointer(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
	return window.matchMedia('(any-pointer: coarse)').matches
}

const TlPlatformContext = createContext<TlPlatformContextValue>(defaultPlatform)

/** @public */
export interface TlPlatformProviderProps {
	isDarwin?: boolean
	isCoarsePointer?: boolean
	animationSpeed?: number
	children: ReactNode
}

/** @public @react */
export function TlPlatformProvider({
	isDarwin: isDarwinProp,
	isCoarsePointer: isCoarsePointerProp,
	animationSpeed = 1,
	children,
}: TlPlatformProviderProps) {
	const [isDarwin, setIsDarwin] = useState(isDarwinProp ?? detectIsDarwin())
	const [isCoarsePointer, setIsCoarsePointer] = useState(
		isCoarsePointerProp ?? detectIsCoarsePointer()
	)

	useEffect(() => {
		if (isDarwinProp !== undefined) {
			setIsDarwin(isDarwinProp)
		}
	}, [isDarwinProp])

	useEffect(() => {
		if (isCoarsePointerProp !== undefined) {
			setIsCoarsePointer(isCoarsePointerProp)
			return
		}

		if (typeof window === 'undefined') return

		const mql = window.matchMedia('(any-pointer: coarse)')
		const updateFromMedia = () => setIsCoarsePointer(mql.matches)
		updateFromMedia()
		mql.addEventListener('change', updateFromMedia)

		const handlePointerDown = (e: PointerEvent) => {
			const isCoarseEvent = e.pointerType !== 'mouse'
			setIsCoarsePointer(isCoarseEvent)
		}

		window.addEventListener('pointerdown', handlePointerDown, { capture: true })

		return () => {
			mql.removeEventListener('change', updateFromMedia)
			window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
		}
	}, [isCoarsePointerProp])

	const value = useMemo(
		() => ({
			isDarwin,
			isCoarsePointer,
			animationSpeed,
		}),
		[isDarwin, isCoarsePointer, animationSpeed]
	)

	return <TlPlatformContext.Provider value={value}>{children}</TlPlatformContext.Provider>
}

/** @public */
export function useTlPlatform(): TlPlatformContextValue {
	return useContext(TlPlatformContext)
}
