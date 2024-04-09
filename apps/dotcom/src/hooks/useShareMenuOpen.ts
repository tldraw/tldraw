import { useEffect, useRef } from 'react'
import { atom, useMenuIsOpen, useValue } from 'tldraw'

// When people click the 'create shared project' in the share menu we want to make sure that
// the menu is not dismissed when the new multiplayer editor mounts.
// So we keep this global atom at a temporary source of truth between
// editor instances. When the accompanying hook's first effect is run it will set the editor's menu open state
// to whatever is in the atom. After that, the editor's menu open state will be the source of truth.
export const persistentShareMenuOpenAtom = atom('persistentMenuOpen', false)

export function useShareMenuIsOpen() {
	const isOpen = useValue('is menu open', () => persistentShareMenuOpenAtom.get(), [])
	const [isShareMenuOpen, onOpenChange] = useMenuIsOpen('share menu')
	// on initial render the persistent option takes effect

	const isFirst = useRef(true)

	useEffect(() => {
		if (isFirst.current) {
			isFirst.current = false
			onOpenChange(persistentShareMenuOpenAtom.get())
		} else {
			persistentShareMenuOpenAtom.set(isShareMenuOpen)
		}
	}, [isShareMenuOpen, onOpenChange])

	return [isOpen, onOpenChange] as const
}
