import { Editor, TLPointerEventInfo, useMaybeEditor, useValue } from '@tldraw/editor'
import * as React from 'react'
import { TLUiIconJsx } from '../components/primitives/TldrawUiIcon'
import { useA11y } from '../context/a11y'
import { TLUiEventSource, useUiEvents } from '../context/events'
import { TLUiOverrideHelpers, useDefaultHelpers } from '../overrides'
import { legacyToolItems } from '../toolItems'
import { TLUiToolItemsContext, uiToolItemsSlot } from '../uiSlots'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export interface TLUiToolItem<
	TranslationKey extends string = string,
	IconType extends string = string,
> {
	id: string
	label: TranslationKey
	shortcutsLabel?: TranslationKey
	icon: IconType | TLUiIconJsx
	onSelect(source: TLUiEventSource): void
	onDragStart?(source: TLUiEventSource, info: TLPointerEventInfo): void
	/**
	 * The keyboard shortcut for this tool. This is a string that can be a single key,
	 * or a combination of keys.
	 * For example, `cmd+z` or `cmd+shift+z` or `cmd+u,ctrl+u`, or just `v` or `a`.
	 * We have backwards compatibility with the old system, where we used to use
	 * symbols to denote cmd/alt/shift, using `!` for shift, `$` for cmd, and `?` for alt.
	 */
	kbd?: string
	readonlyOk?: boolean
	meta?: {
		[key: string]: any
	}
}

/** @public */
export type TLUiToolsContextType = Record<string, TLUiToolItem>

/** @internal */
export const ToolsContext = React.createContext<null | TLUiToolsContextType>(null)

const EMPTY_CONTRIBUTIONS: readonly never[] = []

/** @public */
export interface TLUiToolsProviderProps {
	overrides?(
		editor: Editor,
		tools: TLUiToolsContextType,
		helpers: Partial<TLUiOverrideHelpers>
	): TLUiToolsContextType
	children: React.ReactNode
}

/** @internal */
export function ToolsProvider({ overrides, children }: TLUiToolsProviderProps) {
	const editor = useMaybeEditor()
	const trackEvent = useUiEvents()

	const a11y = useA11y()
	const msg = useTranslation()
	const helpers = useDefaultHelpers()

	const onToolSelect = React.useCallback(
		(source: TLUiEventSource, tool: TLUiToolItem, id?: string) => {
			a11y.announce({ msg: msg(tool.label) })
			trackEvent('select-tool', { source, id: id ?? tool.id })
		},
		[a11y, msg, trackEvent]
	)

	const contributions = useValue(
		'ui tool items',
		() => editor?.plugins.list(uiToolItemsSlot) ?? EMPTY_CONTRIBUTIONS,
		[editor]
	)

	const tools = React.useMemo<TLUiToolsContextType>(() => {
		if (!editor) return {}
		const ctx: TLUiToolItemsContext = { editor, helpers, onToolSelect, trackEvent }
		const contributed = new Map(
			contributions.flatMap((items) => items(ctx)).map((item) => [item.id, item])
		)
		// The built-in items keep their usual order, which the command palette and the keyboard
		// shortcuts follow. A contributed item takes the place of the built-in item with its id.
		const toolsArray: TLUiToolItem[] = []
		for (const legacy of legacyToolItems) {
			const isAvailable = legacy.isAvailable(ctx)
			for (const item of legacy.items(ctx)) {
				const contribution = contributed.get(item.id)
				if (contribution) {
					toolsArray.push(contribution)
					contributed.delete(item.id)
				} else if (isAvailable) {
					toolsArray.push(item)
				}
			}
		}
		toolsArray.push(...contributed.values())

		toolsArray.forEach((t) => (t.onSelect = t.onSelect.bind(t)))

		const tools = Object.fromEntries(toolsArray.map((t) => [t.id, t]))

		if (overrides) {
			return overrides(editor, tools, helpers)
		}

		return tools
	}, [overrides, editor, helpers, onToolSelect, trackEvent, contributions])

	return <ToolsContext.Provider value={tools}>{children}</ToolsContext.Provider>
}

/** @public */
export function useTools() {
	const ctx = React.useContext(ToolsContext)

	if (!ctx) {
		throw new Error('useTools must be used within a ToolProvider')
	}

	return ctx
}
