import { atom, Atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'

interface TlMenuStateProviderContextValue {
	openMenusAtom: Atom<Set<string>>
	onMenuOpenChange?(id: string, isOpen: boolean): void
	useMenuIsOpen?(id: string): readonly [isOpen: boolean, onOpenChange: (isOpen: boolean) => void]
}

const TlMenuStateContext = createContext<TlMenuStateProviderContextValue | null>(null)

/** @public */
export interface TlMenuStateProviderProps {
	children: ReactNode
	onMenuOpenChange?(id: string, isOpen: boolean): void
	useMenuIsOpen?(id: string): readonly [isOpen: boolean, onOpenChange: (isOpen: boolean) => void]
}

/** @public @react */
export function TlMenuStateProvider({
	children,
	onMenuOpenChange,
	useMenuIsOpen,
}: TlMenuStateProviderProps) {
	const openMenusRef = useRef(atom<Set<string>>('tl-open-menus', new Set()))
	const value = useMemo(
		() => ({
			openMenusAtom: openMenusRef.current,
			onMenuOpenChange,
			useMenuIsOpen,
		}),
		[onMenuOpenChange, useMenuIsOpen]
	)

	return <TlMenuStateContext.Provider value={value}>{children}</TlMenuStateContext.Provider>
}

/** @public */
export function useTlMenuIsOpen(
	id: string
): readonly [isOpen: boolean, onOpenChange: (isOpen: boolean) => void] {
	const ctx = useContext(TlMenuStateContext)
	const [localOpen, setLocalOpen] = useState(false)

	const externalMenuState = ctx?.useMenuIsOpen?.(id)

	const isOpen = useValue(
		`menu-${id}-open`,
		() => (ctx ? ctx.openMenusAtom.get().has(id) : localOpen),
		[ctx, id, localOpen]
	)

	const onOpenChange = useCallback(
		(open: boolean) => {
			if (ctx) {
				ctx.openMenusAtom.update((prev: Set<string>) => {
					const next = new Set(prev)
					if (open) {
						next.add(id)
					} else {
						next.delete(id)
					}
					return next
				})
				ctx.onMenuOpenChange?.(id, open)
			} else {
				setLocalOpen(open)
			}
		},
		[ctx, id]
	)

	if (externalMenuState) {
		return externalMenuState
	}

	return [isOpen, onOpenChange]
}

/** @public */
export function useTlIsAnyMenuOpen(): boolean {
	const ctx = useContext(TlMenuStateContext)

	return useValue(
		'any menu open',
		() => {
			if (!ctx) return false
			return ctx.openMenusAtom.get().size > 0
		},
		[ctx]
	)
}

/** @public */
export interface TlMenuStateContextValue {
	openMenu(id: string): void
	closeMenu(id: string): void
	isMenuOpen(id: string): boolean
}

/** @public */
export function useTlMenuState(): TlMenuStateContextValue {
	const ctx = useContext(TlMenuStateContext)

	if (!ctx) {
		throw new Error('useTlMenuState must be used within a TlMenuStateProvider')
	}

	const openMenu = useCallback(
		(id: string) => {
			ctx.openMenusAtom.update((prev: Set<string>) => {
				const next = new Set(prev)
				next.add(id)
				return next
			})
			ctx.onMenuOpenChange?.(id, true)
		},
		[ctx]
	)

	const closeMenu = useCallback(
		(id: string) => {
			ctx.openMenusAtom.update((prev: Set<string>) => {
				const next = new Set(prev)
				next.delete(id)
				return next
			})
			ctx.onMenuOpenChange?.(id, false)
		},
		[ctx]
	)

	const isMenuOpen = useCallback(
		(id: string) => {
			return ctx.openMenusAtom.get().has(id)
		},
		[ctx]
	)

	return { openMenu, closeMenu, isMenuOpen }
}
