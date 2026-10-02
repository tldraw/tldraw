import { useEditor, useValue } from '@tldraw/editor'
import { ReactNode, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getCommandPaletteSuggestions } from '../../context/command-palette-defaults'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'
import { CommandPaletteStoreProvider } from './CommandPaletteContext'
import { CommandPaletteFeatureFlags } from './CommandPaletteFeatureFlags'
import { commandPaletteFlags } from './commandPaletteFlags'
import { addCommandPaletteRecent, getCommandPaletteRecents } from './commandPaletteRecents'
import {
	CommandPaletteRow,
	getCommandPaletteBrowseRows,
	getCommandPaletteSearchRows,
	getCommandPaletteSubmenuRows,
} from './commandPaletteRows'
import {
	CommandPaletteEntry,
	CommandPaletteStore,
	CommandPaletteSubmenu,
} from './CommandPaletteStore'

type SelectableRow = Extract<CommandPaletteRow, { type: 'item' | 'submenu' }>

/** @internal */
export interface CommandPaletteShellProps {
	onClose(): void
	children: ReactNode
}

/** @internal */
export function CommandPaletteShell({ onClose, children }: CommandPaletteShellProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const dir = useDirection()
	const [store] = useState(() => new CommandPaletteStore())
	const [recentIds] = useState(getCommandPaletteRecents)
	// Fixed when the palette opens, so the list doesn't reshuffle under the pointer.
	const [suggestedIds] = useState(() => getCommandPaletteSuggestions(editor))
	const query = useValue(store.query)
	const entries = useValue(store.entries)
	const submenu = useValue(store.submenu)
	const prompt = useValue(store.prompt)
	const position = useValue(commandPaletteFlags.position)
	const topSection = useValue(commandPaletteFlags.topSection)
	const groupSubmenus = useValue(commandPaletteFlags.groupSubmenus)
	const showGroupHeadings = useValue(commandPaletteFlags.showGroupHeadings)
	const showIcons = useValue(commandPaletteFlags.showIcons)
	const checkmarksOnRight = useValue(commandPaletteFlags.checkmarksOnRight)
	const [activeIndex, setActiveIndex] = useState(0)
	const rPalette = useRef<HTMLDivElement>(null)
	const rInput = useRef<HTMLInputElement>(null)
	const rList = useRef<HTMLDivElement>(null)
	const [canScrollDown, setCanScrollDown] = useState(false)
	const rScrollToActive = useRef(false)
	const listboxId = useId()

	const rows = useMemo((): CommandPaletteRow[] => {
		if (prompt) {
			const value = query.trim()
			const label = value ? `${prompt.name}: ${value}` : prompt.name
			return [{ type: 'item', key: 'prompt', entry: prompt, label, recent: false }]
		}
		// Suggestions also break ties in search, where recents otherwise would.
		const topIds = topSection === 'suggested' ? suggestedIds : recentIds
		if (submenu) return getCommandPaletteSubmenuRows(entries, submenu.key, query, topIds)
		if (query.trim()) return getCommandPaletteSearchRows(entries, query, topIds, { groupSubmenus })
		return getCommandPaletteBrowseRows(
			entries,
			topIds,
			msg(topSection === 'suggested' ? 'command-palette.suggested' : 'command-palette.recent'),
			{ showRecents: topSection !== 'none', groupSubmenus, showGroupHeadings }
		)
	}, [
		entries,
		prompt,
		submenu,
		query,
		recentIds,
		suggestedIds,
		msg,
		topSection,
		groupSubmenus,
		showGroupHeadings,
	])
	const selectableRows = useMemo(
		() => rows.filter((row): row is SelectableRow => row.type === 'item' || row.type === 'submenu'),
		[rows]
	)
	const sections = useMemo(() => {
		const out: {
			key: string
			heading?: Extract<CommandPaletteRow, { type: 'heading' }>
			separated?: boolean
			rows: SelectableRow[]
		}[] = []
		for (const row of rows) {
			if (row.type === 'heading') out.push({ key: row.key, heading: row, rows: [] })
			else if (row.type === 'separator') out.push({ key: row.key, separated: true, rows: [] })
			else {
				if (!out.length) out.push({ key: 'start', rows: [] })
				out[out.length - 1].rows.push(row)
			}
		}
		return out
	}, [rows])
	const indexByKey = useMemo(
		() => new Map(selectableRows.map((row, index) => [row.key, index])),
		[selectableRows]
	)
	const clampedIndex = Math.min(activeIndex, selectableRows.length - 1)
	const activeRow = clampedIndex >= 0 ? selectableRows[clampedIndex] : undefined
	const optionId = (index: number) => `${listboxId}-option-${index}`

	const updateScroll = useCallback(() => {
		const list = rList.current
		if (!list) return
		const { scrollHeight, scrollTop, clientHeight } = list
		setCanScrollDown(scrollHeight - scrollTop - clientHeight > 1)
	}, [])
	useLayoutEffect(() => {
		const list = rList.current
		if (!list || typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(updateScroll)
		observer.observe(list)
		return () => observer.disconnect()
	}, [updateScroll])
	useLayoutEffect(() => {
		updateScroll()
	}, [rows, updateScroll])
	// Runs after the rows' own layout effects: only keyboard and query changes scroll the active
	// row, so hovering a half-visible row doesn't make the list jump.
	useLayoutEffect(() => {
		rScrollToActive.current = false
	})

	// Radix menus give focus back to their trigger a frame after closing, which would take it from
	// the input when the palette is opened from the main menu.
	useLayoutEffect(() => {
		const input = rInput.current
		if (!input) return
		input.focus()
		const win = editor.getContainerWindow()
		const frame = win.requestAnimationFrame(() => input.focus())
		return () => win.cancelAnimationFrame(frame)
	}, [editor])

	const setQuery = useCallback(
		(value: string) => {
			rScrollToActive.current = true
			store.query.set(value)
			setActiveIndex(0)
		},
		[store]
	)

	// Don't pull focus back from something the command opened, e.g. a dialog.
	const restoreFocus = useCallback(() => {
		const doc = editor.getContainerDocument()
		const focused = doc.activeElement
		if (!focused || focused === doc.body || rPalette.current?.contains(focused)) {
			editor.getContainer().focus()
		}
	}, [editor])

	const openSubmenu = useCallback(
		(next: CommandPaletteSubmenu | null) => {
			store.submenu.set(next)
			setQuery('')
		},
		[store, setQuery]
	)

	const openPrompt = useCallback(
		(entry: CommandPaletteEntry | null) => {
			store.prompt.set(entry)
			setQuery('')
		},
		[store, setQuery]
	)

	// A prompt opened from inside a submenu backs out to that submenu.
	const back = useCallback(() => {
		if (prompt) openPrompt(null)
		else openSubmenu(null)
	}, [prompt, openPrompt, openSubmenu])

	const dismiss = useCallback(() => {
		onClose()
		restoreFocus()
	}, [onClose, restoreFocus])

	const runRow = useCallback(
		(row: SelectableRow | undefined) => {
			if (!row) return
			if (row.type === 'submenu') {
				openSubmenu(row.submenu)
				rInput.current?.focus()
				return
			}
			const { entry } = row
			if (entry.disabled) return
			if (entry.prompt && !prompt) {
				openPrompt(entry)
				rInput.current?.focus()
				return
			}
			// Close first so dialogs aren't stacked under the palette; stay in this handler so
			// clipboard writes and file pickers keep the user gesture.
			onClose()
			if (entry.prompt) entry.prompt.onSubmit(store.query.get().trim())
			else entry.onSelect('command-palette')
			addCommandPaletteRecent(entry.id)
			restoreFocus()
		},
		[onClose, restoreFocus, openSubmenu, openPrompt, prompt, store]
	)

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// oxlint-disable-next-line typescript/no-deprecated -- Safari sends IME-confirming Enter with isComposing false, keyCode 229
		if (e.nativeEvent.isComposing || e.keyCode === 229) return
		const count = selectableRows.length
		const move = (delta: number) => {
			if (!count) return
			rScrollToActive.current = true
			setActiveIndex((Math.max(clampedIndex, 0) + delta + count) % count)
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				move(1)
				return
			case 'ArrowUp':
				e.preventDefault()
				move(-1)
				return
			case 'Tab':
				e.preventDefault()
				move(e.shiftKey ? -1 : 1)
				return
			case 'Enter': {
				e.preventDefault()
				// Focus is back on the editor by keyup, which would start editing the selected shape.
				const win = editor.getContainerWindow()
				const swallowKeyUp = (up: KeyboardEvent) => {
					if (up.key !== 'Enter') return
					editor.markEventAsHandled(up)
					win.removeEventListener('keyup', swallowKeyUp, true)
				}
				win.addEventListener('keyup', swallowKeyUp, true)
				runRow(activeRow)
				return
			}
			case 'Escape':
				e.preventDefault()
				if (prompt || submenu) back()
				else dismiss()
				return
			case 'Backspace':
				if ((prompt || submenu) && !query) {
					e.preventDefault()
					back()
				}
				return
			default:
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
					e.preventDefault()
					dismiss()
				}
		}
	}

	return (
		<CommandPaletteStoreProvider store={store}>
			<div
				className="tlui-command-palette__overlay"
				onPointerDown={(e) => {
					if (e.target === e.currentTarget) dismiss()
				}}
			>
				<div
					ref={rPalette}
					className="tlui-command-palette"
					data-position={position}
					data-wide={showGroupHeadings || undefined}
					role="dialog"
					aria-label={msg('command-palette.title')}
					data-testid="command-palette"
					// Only the input takes focus: a mousedown elsewhere would blur it, and it owns all key handling.
					onMouseDown={(e) => {
						if (e.target !== rInput.current) e.preventDefault()
					}}
				>
					<input
						ref={rInput}
						className="tlui-input tlui-command-palette__input"
						data-testid="command-palette.input"
						role="combobox"
						aria-expanded
						aria-controls={listboxId}
						aria-autocomplete="list"
						aria-activedescendant={activeRow ? optionId(clampedIndex) : undefined}
						placeholder={prompt?.prompt?.placeholder ?? msg('command-palette.placeholder')}
						autoComplete="off"
						spellCheck={false}
						value={query}
						onChange={(e) => setQuery(e.currentTarget.value)}
						onKeyDown={handleKeyDown}
					/>
					{(prompt || submenu) && (
						<div
							className="tlui-command-palette__heading tlui-command-palette__back"
							data-testid="command-palette.back"
							onClick={back}
						>
							<TldrawUiIcon
								aria-hidden="true"
								label=""
								icon={dir === 'rtl' ? 'chevron-right' : 'chevron-left'}
								small
							/>
							{prompt ? prompt.name : submenu!.label}
						</div>
					)}
					<div
						ref={rList}
						id={listboxId}
						role="listbox"
						aria-label={prompt?.name ?? submenu?.label ?? msg('command-palette.title')}
						className="tlui-command-palette__list"
						data-more={canScrollDown ? '' : undefined}
						onScroll={updateScroll}
					>
						{sections.map((section, sectionIndex) => {
							const options = section.rows.map((row) => {
								const index = indexByKey.get(row.key)!
								return (
									<CommandPaletteRowView
										key={row.key}
										id={optionId(index)}
										row={row}
										isActive={index === clampedIndex}
										// Every row reserves the slot, so labels don't shift as checked rows come and go while typing.
										checkSlot={!checkmarksOnRight}
										checkmarksOnRight={checkmarksOnRight}
										iconSlot={showIcons}
										rScrollToActive={rScrollToActive}
										onHover={() => setActiveIndex(index)}
										onRun={() => runRow(row)}
									/>
								)
							})
							if (section.separated) {
								return (
									<div key={section.key} role="group">
										<div role="separator" className="tlui-command-palette__separator" />
										{options}
									</div>
								)
							}
							if (!section.heading) return options
							const headingId = `${listboxId}-heading-${sectionIndex}`
							return (
								<div key={section.heading.key} role="group" aria-labelledby={headingId}>
									<div id={headingId} className="tlui-command-palette__heading">
										{section.heading.label}
									</div>
									{options}
								</div>
							)
						})}
					</div>
					{selectableRows.length === 0 && (
						<div className="tlui-command-palette__empty">{msg('command-palette.no-results')}</div>
					)}
					<div hidden>
						<TldrawUiMenuContextProvider type="command-palette" sourceId="command-palette">
							{children}
							<CommandPaletteFeatureFlags />
						</TldrawUiMenuContextProvider>
					</div>
				</div>
			</div>
		</CommandPaletteStoreProvider>
	)
}

function CommandPaletteRowView({
	id,
	row,
	isActive,
	checkSlot,
	checkmarksOnRight,
	iconSlot,
	rScrollToActive,
	onHover,
	onRun,
}: {
	id: string
	row: SelectableRow
	isActive: boolean
	checkSlot: boolean
	checkmarksOnRight: boolean
	iconSlot: boolean
	rScrollToActive: React.RefObject<boolean>
	onHover(): void
	onRun(): void
}) {
	const msg = useTranslation()
	const dir = useDirection()
	const showDisabledReasons = useValue(commandPaletteFlags.showDisabledReasons)
	const rRow = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (isActive && rScrollToActive.current) rRow.current?.scrollIntoView?.({ block: 'nearest' })
	}, [isActive, rScrollToActive])

	if (row.type === 'submenu') {
		return (
			<div
				ref={rRow}
				id={id}
				role="option"
				aria-selected={isActive}
				data-highlighted={isActive || undefined}
				data-testid={`command-palette.submenu.${row.submenu.label}`}
				className="tlui-command-palette__item"
				onPointerMove={onHover}
				onClick={onRun}
			>
				<span className="tlui-command-palette__row">
					{(checkSlot || iconSlot) && (
						<TldrawUiIcon aria-hidden="true" label="" icon="none" small />
					)}
					<span className="tlui-command-palette__label">{row.submenu.label}</span>
					<TldrawUiIcon
						aria-hidden="true"
						label=""
						icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'}
						small
					/>
				</span>
			</div>
		)
	}

	const { entry } = row
	const marked = entry.checked ?? entry.isSelected
	const reasonId = `${id}-reason`
	const showReason = showDisabledReasons && isActive && entry.disabled && !!entry.disabledReason
	const descriptionId = `${id}-description`
	return (
		<div
			ref={rRow}
			id={id}
			role="option"
			aria-selected={isActive}
			aria-disabled={entry.disabled || undefined}
			aria-describedby={
				[showReason && reasonId, entry.description && descriptionId].filter(Boolean).join(' ') ||
				undefined
			}
			data-highlighted={isActive || undefined}
			data-testid={`command-palette.${row.recent ? 'recent' : 'item'}.${entry.id}`}
			className="tlui-command-palette__item"
			onPointerMove={onHover}
			onClick={onRun}
		>
			<span className="tlui-command-palette__row">
				{/* One leading slot: a row is either checkable or has an icon, never both. */}
				{checkSlot && marked !== undefined ? (
					<TldrawUiIcon
						icon={marked ? 'check' : 'none'}
						small
						label={msg(marked ? 'ui.checked' : 'ui.unchecked')}
					/>
				) : (
					(checkSlot || iconSlot) && (
						<TldrawUiIcon
							aria-hidden="true"
							label=""
							icon={(iconSlot && entry.icon) || 'none'}
							small
						/>
					)
				)}
				<span className="tlui-command-palette__label">{row.label}</span>
				{marked && checkmarksOnRight && (
					<TldrawUiIcon icon="check" small label={msg('ui.checked')} />
				)}
				{/* In the shortcut's place, so showing it doesn't change the row's height. */}
				{showReason ? (
					<span id={reasonId} className="tlui-command-palette__reason">
						{entry.disabledReason}
					</span>
				) : (
					entry.kbd && <TldrawUiKbd>{entry.kbd}</TldrawUiKbd>
				)}
			</span>
			{entry.description && (
				<span
					id={descriptionId}
					className="tlui-command-palette__description"
					style={{
						paddingInlineStart: checkSlot || iconSlot ? 'calc(15px + var(--tl-space-3))' : 0,
					}}
				>
					{entry.description}
				</span>
			)}
		</div>
	)
}
