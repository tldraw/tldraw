import { useCallback, useId, useLayoutEffect, useRef } from 'react'
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
	detail?: string
	prompt?: CommandPalettePrompt
	icon?: string | TLUiIconJsx
	onSelect(source: TLUiEventSource): Promise<void> | void
}

/** @internal */
export function CommandPaletteItemRegistration(props: CommandPaletteItemRegistrationProps) {
	const store = useCommandPaletteStore()
	const { path, submenu, section, heading, pinned } = useCommandPalettePath()
	const token = useId()
	const rMarker = useRef<HTMLSpanElement>(null)

	// Stable wrappers, so new inline callbacks don't count as changes yet the latest one still runs,
	// even from an entry the palette is holding, like an open prompt.
	const rProps = useRef(props)
	const onSelect = useCallback((source: TLUiEventSource) => rProps.current.onSelect(source), [])
	const onSubmit = useCallback((value: string) => rProps.current.prompt?.onSubmit(value), [])

	// No deps: re-register every render so label, checked and disabled state stay current.
	useLayoutEffect(() => {
		rProps.current = props
		const { id, kbd, checked, isSelected, disabled, disabledReason, detail, prompt, icon } = props
		// Prefixed here so rows, recents and search matching all see the same label.
		const label = submenu ? `${submenu.label}: ${props.label}` : props.label
		store.set(token, {
			id,
			kbd,
			checked,
			isSelected,
			disabled,
			disabledReason,
			detail,
			icon,
			prompt: prompt && {
				placeholder: prompt.placeholder,
				initialValue: prompt.initialValue,
				onSubmit,
			},
			onSelect,
			label,
			name: props.label,
			path: props.detail ? [...path, props.detail] : path,
			submenu,
			section,
			heading,
			pinned,
			marker: rMarker.current,
		})
	})

	useLayoutEffect(() => () => store.delete(token), [store, token])

	return <span ref={rMarker} hidden />
}
