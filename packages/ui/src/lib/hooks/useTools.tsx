import { App, TL_GEO_TYPES, useApp } from '@tldraw/editor'
import * as React from 'react'
import { EmbedDialog } from '../components/EmbedDialog'
import { TLUiIconType } from '../icon-types'
import { useDialogs } from './useDialogsProvider'
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
				},
			},
			{
				id: 'embed',
				label: 'tool.embed',
				readonlyOk: true,
				icon: 'tool-embed',
				onSelect() {
					addDialog({ component: EmbedDialog })
				},
			},
		])

		if (overrides) {
			return overrides(app, tools, { insertMedia })
		}

		return tools
	}, [app, overrides, insertMedia, addDialog])

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
