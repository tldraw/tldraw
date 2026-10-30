import { defineMessages, useMaybeEditor, useValue } from '@tldraw/editor'
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
import { handleCommandPaletteKeyDown } from './commandPaletteKeyboard'
import {
	CommandPaletteList,
	getCommandPaletteEntryMark,
	getCommandPaletteOptionId,
} from './CommandPaletteList'
import { addCommandPaletteRecent, getCommandPaletteRecents } from './commandPaletteRecents'
import {
	CommandPaletteRow,
	getCommandPaletteBrowseRows,
	getCommandPalettePromptRows,
	getCommandPaletteSearchRows,
	getCommandPaletteSections,
	getCommandPaletteSubmenuRows,
	SelectableRow,
} from './commandPaletteRows'
import {
	CommandPaletteEntry,
	CommandPaletteStore,
	CommandPaletteSubmenu,
} from './CommandPaletteStore'
import { useCommandPaletteLayout } from './useCommandPaletteLayout'

const messages = defineMessages({
	title: { id: 'command-palette.title', defaultMessage: 'Command palette' },
	placeholder: { id: 'command-palette.placeholder', defaultMessage: 'Search…' },
	noResults: { id: 'command-palette.no-results', defaultMessage: 'No results' },
	recent: { id: 'command-palette.recent', defaultMessage: 'Recent' },
	cancel: { id: 'command-palette.cancel', defaultMessage: 'Cancel' },
})

/**
 * Where the command palette opens.
 *
 * @public
 */
export type TLUiCommandPalettePosition = 'top' | 'center' | 'bottom'

/**
 * What the command palette shows above its list while browsing.
 *
 * @public
 */
export type TLUiCommandPaletteSuggestions = 'recent' | 'none'

/** @public */
export interface TLUiCommandPaletteShellProps {
	/**
	 * Where the palette opens. Defaults to `'center'`. `'top'` sits near the top edge. `'bottom'` sits
	 * just above the toolbar at its width when the toolbar is horizontal; otherwise it opens lower
	 * than `'center'`. On touch devices every position opens near the top edge.
	 */
	position?: TLUiCommandPalettePosition
	/**
	 * What shows above the list while the query is empty. `'recent'`, the default, lists recently
	 * run commands; `'none'` shows nothing. Recents still rank search results either way.
	 */
	suggestions?: TLUiCommandPaletteSuggestions
	/** Called when the user dismisses the palette or runs a command. */
	onClose(): void
	/**
	 * The palette's items, as `TldrawUiMenu*` components and, with an editor, `CommandPalette*`
	 * groups.
	 */
	children: ReactNode
}

/**
 * The command palette's input, list and keyboard handling. Render it from a custom `CommandPalette`
 * slot, passing the slot's `onClose`, to build a palette that looks or sits differently. It also
 * works without an editor, inside `TldrawUiContextProvider`, where the app opens and closes it.
 *
 * @public @react
 */
export function CommandPaletteShell({
	position = 'center',
	suggestions = 'recent',
	onClose,
	children,
}: TLUiCommandPaletteShellProps) {
	const editor = useMaybeEditor()
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
	const rScrollToActive = useRef(false)
	const rRestoreScrollTop = useRef<number | null>(null)
	// Without an editor, focus goes back here on close.
	const rFocusBefore = useRef<HTMLElement | null>(null)
	const listboxId = useId()

	const rows = useMemo((): CommandPaletteRow[] => {
		if (prompt) return getCommandPalettePromptRows(prompt, query, msg(messages.cancel), dir)
		if (submenu) return getCommandPaletteSubmenuRows(entries, submenu.key, query, recentIds)
		if (query.trim()) return getCommandPaletteSearchRows(entries, query, recentIds)
		return getCommandPaletteBrowseRows(
			entries,
			suggestions === 'recent' ? recentIds : [],
			msg(messages.recent)
		)
	}, [entries, prompt, submenu, query, recentIds, suggestions, msg, dir])
	const selectableRows = useMemo(
		() => rows.filter((row): row is SelectableRow => row.type === 'item' || row.type === 'submenu'),
		[rows]
	)
	const sections = useMemo(() => getCommandPaletteSections(rows), [rows])
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

	const isBrowsing = !query && !submenu && !prompt
	// Every row keeps a check slot so labels line up, except in an opened submenu with nothing to
	// check, like a list of pages.
	const hasCheckSlot =
		!submenu ||
		entries.some(
			(entry) =>
				entry.submenu?.key === submenu.key && getCommandPaletteEntryMark(entry) !== undefined
		)
	const { anchor, canScrollDown, onListScroll } = useCommandPaletteLayout({
		editor,
		position,
		rPalette,
		rList,
		isBrowsing,
		rows,
	})
	// Backing out restores the exact scroll: scrolling the active row into view would park it at an
	// edge. After the rows render, and before canScrollDown is read again.
	useLayoutEffect(() => {
		const list = rList.current
		if (rRestoreScrollTop.current === null || !list) return
		list.scrollTop = rRestoreScrollTop.current
		rRestoreScrollTop.current = null
		onListScroll()
	})
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
		// StrictMode reruns this with the input focused; keep the element saved by the first run.
		const focused = input.ownerDocument.activeElement
		if (!editor && !rPalette.current?.contains(focused)) {
			rFocusBefore.current =
				focused && focused !== input.ownerDocument.body ? (focused as HTMLElement) : null
		}
		input.focus()
		const win = editor ? editor.getContainerWindow() : input.ownerDocument.defaultView
		if (!win) return
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
		const doc = editor ? editor.getContainerDocument() : rFocusBefore.current?.ownerDocument
		if (!doc) return
		const focused = doc.activeElement
		if (!focused || focused === doc.body || rPalette.current?.contains(focused)) {
			if (editor) editor.getContainer().focus()
			else rFocusBefore.current?.focus()
		}
	}, [editor])

	// Each level opened on top of another remembers that level's search, so backing out returns to
	// the same results instead of an empty palette.
	const rBackTo = useRef<{ query: string; activeIndex: number; scrollTop: number }[]>([])
	const pushLevel = useCallback(() => {
		rBackTo.current.push({
			query: store.query.get(),
			activeIndex: rClampedIndex.current,
			scrollTop: rList.current?.scrollTop ?? 0,
		})
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
		if (previous) {
			rScrollToActive.current = false
			rRestoreScrollTop.current = previous.scrollTop
		}
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
			try {
				if (entry.prompt) entry.prompt.onSubmit(store.query.get().trim())
				else entry.onSelect('command-palette')
				if (!entry.submenu?.collapsed) addCommandPaletteRecent(entry.id)
			} finally {
				restoreFocus()
			}
		},
		[onClose, restoreFocus, openSubmenu, openPrompt, prompt, store, back]
	)

	const move = (delta: number) => {
		const count = selectableRows.length
		if (!count) return
		rScrollToActive.current = true
		setActiveIndex((Math.max(clampedIndex, 0) + delta + count) % count)
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
					style={
						anchor
							? {
									top: anchor.top,
									width: anchor.width,
									// A submenu's back heading or a prompt would otherwise push the palette over the
									// toolbar; the list shrinks instead. Not while browsing, where it is measured.
									maxHeight: isBrowsing ? undefined : anchor.bottom - anchor.top,
								}
							: undefined
					}
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
							aria-activedescendant={
								activeRow ? getCommandPaletteOptionId(listboxId, clampedIndex) : undefined
							}
							placeholder={prompt?.prompt?.placeholder ?? msg(messages.placeholder)}
							autoComplete="off"
							spellCheck={false}
							value={query}
							onChange={(e) => setQuery(e.currentTarget.value)}
							onKeyDown={(e) =>
								handleCommandPaletteKeyDown(e, {
									editor,
									dir,
									query,
									prompt,
									submenu,
									activeRow,
									move,
									runRow,
									back,
									dismiss,
								})
							}
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
						onScroll={onListScroll}
					>
						<CommandPaletteList
							listboxId={listboxId}
							sections={sections}
							hasCheckSlot={hasCheckSlot}
							indexByKey={indexByKey}
							activeIndex={clampedIndex}
							rScrollToActive={rScrollToActive}
							onHover={setActiveIndex}
							onRun={runRow}
						/>
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
