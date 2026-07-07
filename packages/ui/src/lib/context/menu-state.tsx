import { atom, Atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'

interface TlMenuStateContextValue {
	openMenusAtom: Atom<Set<string>>
	onMenuOpenChange?(id: string, isOpen: boolean): void
}

const TlMenuStateContext = createContext<TlMenuStateContextValue | null>(null)

/** @public */
export interface TlMenuStateProviderProps {
	children: ReactNode
	onMenuOpenChange?(id: string, isOpen: boolean): void
}

/** @public @react */
export function TlMenuStateProvider({ children, onMenuOpenChange }: TlMenuStateProviderProps) {
	const openMenusRef = useRef(atom<Set<string>>('tl-open-menus', new Set()))
	const value = useMemo(
		() => ({
			openMenusAtom: openMenusRef.current,
			onMenuOpenChange,
		}),
		[onMenuOpenChange]
	)

	return <TlMenuStateContext.Provider value={value}>{children}</TlMenuStateContext.Provider>
}

/** @public */
export function useTlMenuIsOpen(
	id: string
): [isOpen: boolean, onOpenChange: (isOpen: boolean) => void] {
	const ctx = useContext(TlMenuStateContext)
	const [localOpen, setLocalOpen] = useState(false)

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
