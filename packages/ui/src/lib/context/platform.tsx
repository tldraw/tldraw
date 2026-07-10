import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

/** @public */
export interface TldrawUiPlatformContextValue {
	isDarwin: boolean
	isCoarsePointer: boolean
	animationSpeed: number
}

const defaultPlatform: TldrawUiPlatformContextValue = {
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

const TldrawUiPlatformContext = createContext<TldrawUiPlatformContextValue>(defaultPlatform)

/** @public */
export interface TldrawUiPlatformProviderProps {
	isDarwin?: boolean
	isCoarsePointer?: boolean
	animationSpeed?: number
	children: ReactNode
}

/** @public @react */
export function TldrawUiPlatformProvider({
	isDarwin: isDarwinProp,
	isCoarsePointer: isCoarsePointerProp,
	animationSpeed = 1,
	children,
}: TldrawUiPlatformProviderProps) {
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

	return (
		<TldrawUiPlatformContext.Provider value={value}>{children}</TldrawUiPlatformContext.Provider>
	)
}

/** @public */
export function useTldrawUiPlatform(): TldrawUiPlatformContextValue {
	return useContext(TldrawUiPlatformContext)
}
