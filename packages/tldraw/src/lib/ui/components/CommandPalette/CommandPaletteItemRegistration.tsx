import { useId, useLayoutEffect, useRef } from 'react'
import { TLUiEventSource } from '../../context/events'
import { TLUiIconJsx } from '../primitives/TldrawUiIcon'
import { useCommandPalettePath, useCommandPaletteStore } from './CommandPaletteContext'
import { CommandPalettePrompt } from './CommandPaletteStore'

/** @internal */
export interface CommandPaletteItemRegistrationProps {
	id: string
	label: string
	kbd?: string
	checked?: boolean
	isSelected?: boolean
	disabled: boolean
	disabledReason?: string
	description?: string
	pinned?: boolean
	prompt?: CommandPalettePrompt
	icon?: string | TLUiIconJsx
	onSelect(source: TLUiEventSource): Promise<void> | void
}

/** @internal */
export function CommandPaletteItemRegistration(props: CommandPaletteItemRegistrationProps) {
	const store = useCommandPaletteStore()
	const { path, submenu, section, heading } = useCommandPalettePath()
	const token = useId()
	const rMarker = useRef<HTMLSpanElement>(null)

	// No deps: re-register every render so label, disabled state and onSelect stay current.
	useLayoutEffect(() => {
		// Prefixed here so rows, recents and search matching all see the same label.
		const label = submenu ? `${submenu.label}: ${props.label}` : props.label
		store.set(token, {
			...props,
			label,
			name: props.label,
			path,
			submenu,
			section,
			heading,
			marker: rMarker.current,
		})
	})

	useLayoutEffect(() => () => store.delete(token), [store, token])

	return <span ref={rMarker} hidden />
}
