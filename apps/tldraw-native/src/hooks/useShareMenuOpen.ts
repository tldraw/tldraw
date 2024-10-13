import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { atom, useMenuIsOpen, useValue } from 'tldraw'

// When people click the 'create shared project' in the share menu we want to make sure that
// the menu is not dismissed when the new multiplayer editor mounts.
// So we keep this global atom at a temporary source of truth between
// editor instances. When the accompanying hook's first effect is run it will set the editor's menu open state
// to whatever is in the atom. After that, the editor's menu open state will be the source of truth.
const persistentShareMenuOpenAtom = atom('persistentMenuOpen', false)

export function useShareMenuIsOpen() {
	const isOpen = useValue('is menu open', () => persistentShareMenuOpenAtom.get(), [])
	const [isShareMenuOpen, onOpenChange] = useMenuIsOpen('share menu')
	// on initial render the persistent option takes effect
	const location = useLocation()
	const isFirst = useRef(true)

	useEffect(() => {
		if (isFirst.current) {
			isFirst.current = false
			if (location.state?.shouldOpenShareMenu) {
				// if we are navigating from the new shared project button then
				// we always open the share menu
				persistentShareMenuOpenAtom.set(true)
			}
			onOpenChange(persistentShareMenuOpenAtom.get())
		} else {
			persistentShareMenuOpenAtom.set(isShareMenuOpen)
		}
	}, [isShareMenuOpen, location.state, onOpenChange])

	return [isOpen, onOpenChange] as const
}
