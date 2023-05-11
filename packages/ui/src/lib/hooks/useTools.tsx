import { App, TL_GEO_TYPES, useApp } from '@tldraw/editor'
import * as React from 'react'
import { EmbedDialog } from '../components/EmbedDialog'
import { TLUiIconType } from '../icon-types'
import { useDialogs } from './useDialogsProvider'
import { useEvents } from './useEventsProvider'
import { useInsertMedia } from './useInsertMedia'
import { TLTranslationKey } from './useTranslation/TLTranslationKey'

/** @public */
export interface ToolItem {
	id: string
	label: TLTranslationKey
	shortcutsLabel?: TLTranslationKey
	icon: TLUiIconType
	onSelect: () => void
	kbd?: string
	readonlyOk: boolean
	meta?: {
		[key: string]: any
	}
}

/** @public */
export type ToolsContextType = Record<string, ToolItem>

/** @public */
export const ToolsContext = React.createContext({} as ToolsContextType)

/** @public */
export type ToolsProviderProps = {
	overrides?: (
		app: App,
		tools: ToolsContextType,
		helpers: { insertMedia: () => void }
	) => ToolsContextType
	children: any
}

/** @public */
export function ToolsProvider({ overrides, children }: ToolsProviderProps) {
	const app = useApp()
	const trackEvent = useEvents()

	const { addDialog } = useDialogs()
	const insertMedia = useInsertMedia()

	const tools = React.useMemo<ToolsContextType>(() => {
		const tools = makeTools([
			{
				id: 'select',
				label: 'tool.select',
				icon: 'tool-pointer',
				kbd: 'v',
				readonlyOk: true,
				onSelect() {
					app.setSelectedTool('select')
					trackEvent('toolbar', 'select-tool', { id: 'select' })
				},
			},
			{
				id: 'hand',
				label: 'tool.hand',
				icon: 'tool-hand',
				kbd: 'h',
				readonlyOk: true,
				onSelect() {
					app.setSelectedTool('hand')
					trackEvent('toolbar', 'select-tool', { id: 'hand' })
				},
			},
			{
				id: 'eraser',
				label: 'tool.eraser',
				icon: 'tool-eraser',
				kbd: 'e',
				readonlyOk: true,
				onSelect() {
					app.setSelectedTool('eraser')
					trackEvent('toolbar', 'select-tool', { id: 'eraser' })
				},
			},
			{
				id: 'draw',
				label: 'tool.draw',
				readonlyOk: true,
				icon: 'tool-pencil',
				kbd: 'd,b,x',
				onSelect() {
					app.setSelectedTool('draw')
					trackEvent('toolbar', 'select-tool', { id: 'draw' })
				},
			},
			...[...TL_GEO_TYPES].map((id) => ({
				id,
				label: `tool.${id}` as TLTranslationKey,
				readonlyOk: true,
				meta: {
					geo: id,
				},
				kbd: id === 'rectangle' ? 'r' : id === 'ellipse' ? 'o' : undefined,
				icon: ('geo-' + id) as TLUiIconType,
				onSelect() {
					app.batch(() => {
						app.updateInstanceState(
							{ propsForNextShape: { ...app.instanceState.propsForNextShape, geo: id } },
							true
						)
						app.setSelectedTool('geo')
						trackEvent('toolbar', 'select-tool', { id: `geo-${id}` })
					})
				},
			})),
			{
				id: 'arrow',
				label: 'tool.arrow',
				readonlyOk: true,
				icon: 'tool-arrow',
				kbd: 'a',
				onSelect() {
					app.setSelectedTool('arrow')
					trackEvent('toolbar', 'select-tool', { id: 'arrow' })
				},
			},
			{
				id: 'line',
				label: 'tool.line',
				readonlyOk: true,
				icon: 'tool-line',
				kbd: 'l',
				onSelect() {
					app.setSelectedTool('line')
					trackEvent('toolbar', 'select-tool', { id: 'line' })
				},
			},
			{
				id: 'frame',
				label: 'tool.frame',
				readonlyOk: true,
				icon: 'tool-frame',
				kbd: 'f',
				onSelect() {
					app.setSelectedTool('frame')
					trackEvent('toolbar', 'select-tool', { id: 'frame' })
				},
			},
			{
				id: 'text',
				label: 'tool.text',
				readonlyOk: true,
				icon: 'tool-text',
				kbd: 't',
				onSelect() {
					app.setSelectedTool('text')
					trackEvent('toolbar', 'select-tool', { id: 'text' })
				},
			},
			{
				id: 'asset',
				label: 'tool.asset',
				readonlyOk: true,
				icon: 'tool-media',
				kbd: '$u',
				onSelect() {
					insertMedia()
					trackEvent('toolbar', 'select-tool', { id: 'media' })
				},
			},
			{
				id: 'note',
				label: 'tool.note',
				readonlyOk: true,
				icon: 'tool-note',
				kbd: 'n',
				onSelect() {
					app.setSelectedTool('note')
					trackEvent('toolbar', 'select-tool', { id: 'note' })
				},
			},
			{
				id: 'embed',
				label: 'tool.embed',
				readonlyOk: true,
				icon: 'tool-embed',
				onSelect() {
					addDialog({ component: EmbedDialog })
					trackEvent('toolbar', 'select-tool', { id: 'embed' })
				},
			},
		])

		if (overrides) {
			return overrides(app, tools, { insertMedia })
		}

		return tools
	}, [app, trackEvent, overrides, insertMedia, addDialog])

	return <ToolsContext.Provider value={tools}>{children}</ToolsContext.Provider>
}

function makeTools(tools: ToolItem[]) {
	return Object.fromEntries(tools.map((t) => [t.id, t]))
}

/** @public */
export function useTools() {
	const ctx = React.useContext(ToolsContext)

	if (!ctx) {
		throw new Error('useTools must be used within a ToolProvider')
	}

	return ctx
}
