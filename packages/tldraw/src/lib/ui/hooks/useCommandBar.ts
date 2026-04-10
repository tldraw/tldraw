import { useEditor } from '@tldraw/editor'
import { useCallback, useMemo, useRef, useState } from 'react'
import { TLUiActionItem, unwrapLabel, useActions } from '../context/actions'
import { useUiEvents } from '../context/events'
import { useMenuIsOpen } from './useMenuIsOpen'
import { useTranslation } from './useTranslation/useTranslation'

/** @public - Action IDs to show when the command bar opens with no search query */
export const DEFAULT_POPULAR_ACTION_IDS = [
	'zoom-to-fit',
	'export-as-png',
	'toggle-dark-mode',
	'select-all',
	'undo',
]

/** @public - Action IDs that should not appear in the command bar */
export const DEFAULT_EXCLUDED_ACTION_IDS = new Set([
	'select-geo-tool',
	'change-page-prev',
	'change-page-next',
	'paste-at-cursor',
	'paste-plain-text-at-cursor',
	'zoom-in-on-cursor',
	'zoom-out-on-cursor',
	'a11y-open-context-menu',
	'a11y-repeat-shape-announce',
	'adjust-shape-styles',
	'select-white-color',
	'select-fill-fill',
	'select-fill-lined-fill',
	'image-replace',
	'video-replace',
	'open-command-bar',
])

const MAX_HISTORY_SIZE = 10

/** @public */
export const COMMAND_BAR_MENU_ID = 'command-bar'

/** @public */
export interface CommandBarItem {
	id: string
	label: string
	searchTargets: string[]
	displayKbd?: string
	icon?: string
	checkbox?: boolean
	enabled: boolean
	checked?: boolean
	/** The resolved (translated) description of why this item is disabled. */
	disabledDescription?: string
}

/** @public */
export interface UseCommandBarOptions {
	popularActionIds?: string[]
	excludedActionIds?: Set<string>
	/** Additional custom items to include in the command bar */
	customItems?: CommandBarItem[]
}

function getHistoryStorageKey(editorContextId: string) {
	return `tldraw_command_bar_history_${editorContextId}`
}

function resolveActionLabel(action: TLUiActionItem, msg: (key: string) => string): string | null {
	const labelKey =
		unwrapLabel(action.label, 'default') ??
		unwrapLabel(action.label, 'command-bar') ??
		unwrapLabel(action.label, 'menu') ??
		(typeof action.label === 'object' ? Object.values(action.label)[0] : undefined) ??
		unwrapLabel(action.label)
	if (!labelKey) return null
	return msg(labelKey)
}

/**
 * Returns a displayable kbd string, or undefined if it shouldn't be shown.
 * Hides multi-alternative single-key shortcuts like "d,b,x" which are confusing
 * in a command bar context. Keeps platform variants like "cmd+k,ctrl+k" and
 * single keys like "]".
 */
function getDisplayKbd(kbd?: string): string | undefined {
	if (!kbd) return undefined
	const parts = kbd.split(',')
	if (parts.length <= 1) return kbd
	if (parts.every((p) => p.includes('+'))) return kbd
	return undefined
}

/** @public */
export function useCommandBar(options?: UseCommandBarOptions) {
	const {
		popularActionIds = DEFAULT_POPULAR_ACTION_IDS,
		excludedActionIds = DEFAULT_EXCLUDED_ACTION_IDS,
		customItems = [],
	} = options ?? {}

	const editor = useEditor()
	const actions = useActions()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				trackEvent('open-command-bar', { source: 'command-bar' })
			} else {
				trackEvent('close-command-bar', { source: 'command-bar' })
			}
		},
		[trackEvent]
	)

	const [isOpen, onOpenChange] = useMenuIsOpen(COMMAND_BAR_MENU_ID, handleOpenChange)
	const [query, setQuery] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [historyIds, setHistoryIds] = useState<string[]>(() => {
		try {
			const stored = localStorage.getItem(getHistoryStorageKey(editor.contextId))
			return stored ? JSON.parse(stored) : []
		} catch {
			return []
		}
	})

	// Actions are reactive via useValue hooks in ActionsProvider, so this
	// useMemo recomputes when the actions object identity changes.
	const allItems = useMemo((): CommandBarItem[] => {
		const readonly = editor.getIsReadonly()
		const result: CommandBarItem[] = []

		for (const action of Object.values(actions)) {
			if (excludedActionIds.has(action.id)) continue
			if (readonly && !action.readonlyOk) continue

			const label = resolveActionLabel(action, msg)
			if (!label) continue

			const icon =
				action.icon && typeof action.icon === 'string' ? (action.icon as string) : undefined
			const searchTargets = [label.toLowerCase(), action.id.toLowerCase()]
			if (action.kbd) searchTargets.push(action.kbd.toLowerCase())

			const enabled = action.enabled()
			result.push({
				id: action.id,
				label,
				searchTargets,
				displayKbd: getDisplayKbd(action.kbd),
				icon,
				checkbox: action.checkbox,
				enabled,
				checked: action.checked ? action.checked() : undefined,
				disabledDescription:
					!enabled && action.disabledDescription ? msg(action.disabledDescription) : undefined,
			})
		}

		for (const item of customItems) {
			result.push(item)
		}

		return result
	}, [actions, editor, msg, excludedActionIds, customItems])

	const filteredItems = useMemo((): CommandBarItem[] => {
		const q = query.toLowerCase().trim()

		if (!q) {
			const seen = new Set<string>()
			const result: CommandBarItem[] = []

			for (const id of popularActionIds) {
				const item = allItems.find((a) => a.id === id)
				if (item) {
					result.push(item)
					seen.add(id)
				}
			}

			for (const id of historyIds) {
				if (seen.has(id)) continue
				const item = allItems.find((a) => a.id === id)
				if (item) {
					result.push(item)
					seen.add(id)
				}
			}

			result.sort((a, b) => {
				if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
				return 0
			})

			return result
		}

		const matches = allItems.filter((a) => a.searchTargets.some((target) => target.includes(q)))

		matches.sort((a, b) => {
			if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
			return a.label.localeCompare(b.label)
		})

		return matches
	}, [query, allItems, historyIds, popularActionIds])

	const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, filteredItems.length - 1))
	if (clampedSelectedIndex !== selectedIndex) {
		setSelectedIndex(clampedSelectedIndex)
	}

	const open = useCallback(() => {
		onOpenChange(true)
		setQuery('')
		setSelectedIndex(0)
	}, [onOpenChange])

	const close = useCallback(() => {
		onOpenChange(false)
		setQuery('')
		setSelectedIndex(0)
	}, [onOpenChange])

	const actionsRef = useRef(actions)
	actionsRef.current = actions

	const executeItem = useCallback(
		(item: CommandBarItem) => {
			if (!item.enabled) return

			trackEvent('command-bar-action', { source: 'command-bar', actionId: item.id })

			setHistoryIds((prev) => {
				const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(0, MAX_HISTORY_SIZE)
				try {
					localStorage.setItem(getHistoryStorageKey(editor.contextId), JSON.stringify(next))
				} catch {
					// ignore storage errors
				}
				return next
			})

			close()

			editor.timers.requestAnimationFrame(() => {
				const action = actionsRef.current[item.id] as TLUiActionItem | undefined
				if (action) {
					if (!action.enabled()) return
					action.onSelect('command-bar')
				}
			})
		},
		[close, editor, trackEvent]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowDown':
				case 'Tab': {
					e.preventDefault()
					if (e.shiftKey) {
						setSelectedIndex((i) => Math.max(i - 1, 0))
					} else {
						setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1))
					}
					break
				}
				case 'ArrowUp': {
					e.preventDefault()
					setSelectedIndex((i) => Math.max(i - 1, 0))
					break
				}
				case 'Enter': {
					e.preventDefault()
					const item = filteredItems[clampedSelectedIndex]
					if (item) executeItem(item)
					break
				}
				case 'Escape': {
					e.preventDefault()
					close()
					break
				}
			}
		},
		[filteredItems, clampedSelectedIndex, executeItem, close]
	)

	return {
		isOpen,
		query,
		setQuery,
		selectedIndex: clampedSelectedIndex,
		setSelectedIndex,
		filteredItems,
		handleKeyDown,
		executeItem,
		open,
		close,
	}
}
