import { defineMessages, useEditor, useValue } from '@tldraw/editor'
import {
	ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'
import { CommandPaletteStoreProvider } from './CommandPaletteContext'
import { COMMAND_PALETTE_MENU_ID } from './commandPaletteMenuId'
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

const messages = defineMessages({
	title: { id: 'command-palette.title', defaultMessage: 'Command palette' },
	placeholder: { id: 'command-palette.placeholder', defaultMessage: 'Search…' },
	noResults: { id: 'command-palette.no-results', defaultMessage: 'No results' },
	recent: { id: 'command-palette.recent', defaultMessage: 'Recent' },
	cancel: { id: 'command-palette.cancel', defaultMessage: 'Cancel' },
	checked: { id: 'ui.checked', defaultMessage: 'Checked' },
	unchecked: { id: 'ui.unchecked', defaultMessage: 'Unchecked' },
})

type SelectableRow = Extract<CommandPaletteRow, { type: 'item' | 'submenu' }>

/** @public */
export type TLUiCommandPalettePosition = 'top' | 'center' | 'bottom'

/** @public */
export interface TLUiCommandPaletteShellProps {
	/**
	 * Where the palette opens. `'bottom'`, the default, sits just above the toolbar at its width.
	 */
	position?: TLUiCommandPalettePosition
	/** Called when the user dismisses the palette or runs a command. */
	onClose(): void
	/** The palette's items, as `TldrawUiMenu*` components and `CommandPalette*` groups. */
	children: ReactNode
}

/**
 * The command palette's input, list and keyboard handling. Render it while the palette is open, as
 * `DefaultCommandPalette` does, to build a palette that opens differently or sits elsewhere.
 *
 * @public @react
 */
export function CommandPaletteShell({
	position = 'bottom',
	onClose,
	children,
}: TLUiCommandPaletteShellProps) {
	const editor = useEditor()
	// The open action marks the menu open through editor.menus directly, which useMenuIsOpen's
	// unmount cleanup doesn't track; going away while open would otherwise leave every shortcut
	// disabled.
	useEffect(() => () => editor.menus.deleteOpenMenu(COMMAND_PALETTE_MENU_ID), [editor])
	const msg = useTranslation()
	const dir = useDirection()
	const [store] = useState(() => new CommandPaletteStore())
	// Fixed when the palette opens, so the list doesn't reshuffle under the pointer.
	const [recentIds] = useState(getCommandPaletteRecents)
	const query = useValue(store.query)
	const entries = useValue(store.entries)
	const submenu = useValue(store.submenu)
	const prompt = useValue(store.prompt)
	const [activeIndex, setActiveIndex] = useState(0)
	const rClampedIndex = useRef(0)
	const rPalette = useRef<HTMLDivElement>(null)
	const rInput = useRef<HTMLInputElement>(null)
	const rList = useRef<HTMLDivElement>(null)
	const [canScrollDown, setCanScrollDown] = useState(false)
	const [anchor, setAnchor] = useState<{ top: number; width: number } | null>(null)
	const rScrollToActive = useRef(false)
	const listboxId = useId()

	const rows = useMemo((): CommandPaletteRow[] => {
		// Spells out what Enter does, and offers a way back.
		if (prompt) {
			const value = query.trim()
			return [
				{
					type: 'item',
					key: 'prompt',
					entry: prompt,
					label: prompt.name,
					detail: value ? `“${value}”` : undefined,
					icon: 'arrow-right',
					recent: false,
				},
				{
					type: 'item',
					key: 'prompt:cancel',
					entry: { ...prompt, id: 'command-palette-cancel', prompt: undefined, kbd: '[[Esc]]' },
					label: msg(messages.cancel),
					icon: 'arrow-right',
					recent: false,
				},
			]
		}
		if (submenu) return getCommandPaletteSubmenuRows(entries, submenu.key, query, recentIds)
		if (query.trim()) return getCommandPaletteSearchRows(entries, query, recentIds)
		return getCommandPaletteBrowseRows(entries, recentIds, msg(messages.recent))
	}, [entries, prompt, submenu, query, recentIds, msg])
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
	rClampedIndex.current = Math.max(clampedIndex, 0)
	const activeItemId = !prompt && activeRow?.type === 'item' ? activeRow.entry.id : null
	useEffect(() => {
		store.activeItemId.set(activeItemId)
	}, [store, activeItemId])
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

	// Bottom position, like Figma: as wide as the toolbar, with the gap between the browsing palette
	// and the toolbar matching the toolbar's gap to the bottom edge. Measured while browsing and kept
	// while searching, so the input stays put as results shrink. Only set when it changes: a new
	// object would re-render the registered items, change the rows and measure again, forever.
	useLayoutEffect(() => {
		if (position !== 'bottom') return setAnchor(null)
		if (query || submenu || prompt) return
		const container = editor.getContainer()
		const palette = rPalette.current
		const toolbar = container.querySelector('.tlui-main-toolbar__inner')
		if (!palette || !toolbar) return setAnchor(null)
		const bounds = container.getBoundingClientRect()
		const { top, bottom, width } = toolbar.getBoundingClientRect()
		const gap = bounds.bottom - bottom
		const next = { top: Math.max(8, top - bounds.top - gap - palette.offsetHeight), width }
		setAnchor((prev) => (prev?.top === next.top && prev.width === next.width ? prev : next))
	}, [editor, position, query, submenu, prompt, rows])

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

	// Each level opened on top of another remembers that level's search, so backing out returns to
	// the same results instead of an empty palette.
	const rBackTo = useRef<{ query: string; activeIndex: number }[]>([])
	const pushLevel = useCallback(() => {
		rBackTo.current.push({ query: store.query.get(), activeIndex: rClampedIndex.current })
	}, [store])

	const openSubmenu = useCallback(
		(next: CommandPaletteSubmenu) => {
			pushLevel()
			store.submenu.set(next)
			setQuery('')
		},
		[store, setQuery, pushLevel]
	)

	const rSelectInput = useRef(false)
	const openPrompt = useCallback(
		(entry: CommandPaletteEntry) => {
			pushLevel()
			store.prompt.set(entry)
			const initialValue = entry.prompt?.initialValue ?? ''
			setQuery(initialValue)
			rSelectInput.current = !!initialValue
		},
		[store, setQuery, pushLevel]
	)
	// Select a prefilled value once it's in the input, so typing replaces it.
	useLayoutEffect(() => {
		if (!rSelectInput.current) return
		rSelectInput.current = false
		rInput.current?.select()
	})

	// A prompt opened from inside a submenu backs out to that submenu.
	const back = useCallback(() => {
		if (prompt) store.prompt.set(null)
		else store.submenu.set(null)
		const previous = rBackTo.current.pop()
		setQuery(previous?.query ?? '')
		setActiveIndex(previous?.activeIndex ?? 0)
	}, [prompt, store, setQuery])

	const dismiss = useCallback(() => {
		onClose()
		restoreFocus()
	}, [onClose, restoreFocus])

	const runRow = useCallback(
		(row: SelectableRow | undefined) => {
			if (!row) return
			if (row.key === 'prompt:cancel') {
				back()
				rInput.current?.focus()
				return
			}
			if (row.type === 'submenu') {
				openSubmenu(row.submenu)
				rInput.current?.focus()
				return
			}
			const { entry } = row
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
		[onClose, restoreFocus, openSubmenu, openPrompt, prompt, store, back]
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
			// Like a menu, but only at the input's edges, so the caret still moves through the query.
			case 'ArrowRight': {
				const input = e.currentTarget
				const atEnd = input.selectionStart === query.length && input.selectionEnd === query.length
				if (!prompt && activeRow?.type === 'submenu' && atEnd) {
					e.preventDefault()
					runRow(activeRow)
				}
				return
			}
			case 'ArrowLeft': {
				const input = e.currentTarget
				const atStart = input.selectionStart === 0 && input.selectionEnd === 0
				if (!prompt && submenu && atStart) {
					e.preventDefault()
					back()
				}
				return
			}
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
					style={anchor ? { top: anchor.top, width: anchor.width } : undefined}
					role="dialog"
					aria-label={msg(messages.title)}
					data-testid="command-palette"
					// Only the input takes focus: a mousedown elsewhere would blur it, and it owns all key handling.
					onMouseDown={(e) => {
						if (e.target !== rInput.current) e.preventDefault()
					}}
				>
					<div className="tlui-command-palette__search">
						{/* Not a search while naming something. */}
						{!prompt && <TldrawUiIcon aria-hidden="true" label="" icon="search" small />}
						<input
							ref={rInput}
							className="tlui-input tlui-command-palette__input"
							data-testid="command-palette.input"
							role="combobox"
							aria-expanded
							aria-controls={listboxId}
							aria-autocomplete="list"
							aria-activedescendant={activeRow ? optionId(clampedIndex) : undefined}
							placeholder={prompt?.prompt?.placeholder ?? msg(messages.placeholder)}
							autoComplete="off"
							spellCheck={false}
							value={query}
							onChange={(e) => setQuery(e.currentTarget.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					{submenu && !prompt && (
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
							{submenu.label}
							{/* Says how to leave, since the submenu has no Cancel row. */}
							<span className="tlui-command-palette__back-kbd">
								<TldrawUiKbd>[[Esc]]</TldrawUiKbd>
							</span>
						</div>
					)}
					<div
						ref={rList}
						id={listboxId}
						role="listbox"
						aria-label={prompt?.name ?? submenu?.label ?? msg(messages.title)}
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
						<div className="tlui-command-palette__empty">{msg(messages.noResults)}</div>
					)}
					<div hidden>
						<TldrawUiMenuContextProvider type="command-palette" sourceId="command-palette">
							{children}
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
	rScrollToActive,
	onHover,
	onRun,
}: {
	id: string
	row: SelectableRow
	isActive: boolean
	rScrollToActive: React.RefObject<boolean>
	onHover(): void
	onRun(): void
}) {
	const msg = useTranslation()
	const dir = useDirection()
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
					<TldrawUiIcon aria-hidden="true" label="" icon={row.submenu.icon ?? 'none'} small />
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
	return (
		<div
			ref={rRow}
			id={id}
			role="option"
			aria-selected={isActive}
			data-highlighted={isActive || undefined}
			data-testid={`command-palette.${row.recent ? 'recent' : 'item'}.${entry.id}`}
			className="tlui-command-palette__item"
			onPointerMove={onHover}
			onClick={onRun}
		>
			<span className="tlui-command-palette__row">
				{/* One leading slot on every row, so labels line up: a check or an icon, never both. */}
				{marked !== undefined ? (
					<TldrawUiIcon
						icon={marked ? 'check' : 'none'}
						small
						label={msg(marked ? messages.checked : messages.unchecked)}
					/>
				) : (
					<TldrawUiIcon
						aria-hidden="true"
						label=""
						icon={row.icon ?? (entry.icon || 'none')}
						small
					/>
				)}
				<span className="tlui-command-palette__label">
					{row.label}
					{row.detail && <span className="tlui-command-palette__detail">{row.detail}</span>}
				</span>
				{entry.kbd && <TldrawUiKbd>{entry.kbd}</TldrawUiKbd>}
			</span>
		</div>
	)
}
