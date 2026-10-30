import { useCallback, useId, useLayoutEffect, useRef } from 'react'
import { TLUiEventSource } from '../../context/events'
import { useCommandPalettePath, useCommandPaletteStore } from './CommandPaletteContext'
import { CommandPalettePrompt } from './CommandPaletteStore'

/** @internal */
export interface CommandPaletteItemRegistrationProps {
	/** Keys the row in recents. Only the first row with an id, in palette order, is listed. */
	id: string
	/** Translated label. Inside a submenu, shown prefixed with the submenu's label. */
	label: string
	/** Shortcut shown at the end of the row. */
	kbd?: string
	/** Shows a check mark, or an empty slot when false. */
	checked?: boolean
	/** Like `checked`, for menu items; `checked` wins when both are set. */
	isSelected?: boolean
	/** Muted text after the label. Searched too. */
	detail?: string
	/** Asks for text in the palette before running, instead of running on select. */
	prompt?: CommandPalettePrompt
	/** Runs the item. Always calls the latest one passed, even from an open prompt. */
	onSelect(source: TLUiEventSource): Promise<void> | void
}

/**
 * Registers one row with the enclosing palette under the current path. Renders a hidden marker
 * whose position in the DOM orders the row, so JSX order wins.
 *
 * @internal
 */
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

	// No deps: re-register every render so label and checked state stay current.
	useLayoutEffect(() => {
		rProps.current = props
		const { id, kbd, checked, isSelected, detail, prompt } = props
		// Prefixed here so rows, recents and search matching all see the same label.
		const label = submenu ? `${submenu.label}: ${props.label}` : props.label
		store.set(token, {
			id,
			kbd,
			checked,
			isSelected,
			detail,
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
