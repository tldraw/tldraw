import { Editor, compact, useEditor } from '@tldraw/editor'
import React from 'react'
import { TLUiToolItem, TLUiToolsContextType, useTools } from './useTools'

/** @public */
export type TLUiToolbarItem = {
	id: string
	type: 'item'
	readonlyOk: boolean
	toolItem: TLUiToolItem
}

/** @public */
export function toolbarItem(toolItem: TLUiToolItem): TLUiToolbarItem {
	return {
		id: toolItem.id,
		type: 'item',
		readonlyOk: toolItem.readonlyOk,
		toolItem,
	}
}

/** @public */
export type TLUiToolbarSchemaContextType = TLUiToolbarItem[]

/** @internal */
export const ToolbarSchemaContext = React.createContext([] as TLUiToolbarSchemaContextType)

/** @public */
export type TLUiToolbarSchemaProviderProps = {
	overrides?: (
		editor: Editor,
		schema: TLUiToolbarSchemaContextType,
		more: { tools: TLUiToolsContextType }
	) => TLUiToolbarSchemaContextType
	children: any
}

/** @internal */
export function ToolbarSchemaProvider({ overrides, children }: TLUiToolbarSchemaProviderProps) {
	const editor = useEditor()

	const tools = useTools()

	const toolbarSchema = React.useMemo<TLUiToolbarSchemaContextType>(() => {
		const schema: TLUiToolbarSchemaContextType = compact([
			toolbarItem(tools.select),
			toolbarItem(tools.hand),
			toolbarItem(tools.draw),
			toolbarItem(tools.eraser),
			toolbarItem(tools.arrow),
			toolbarItem(tools.text),
			toolbarItem(tools.note),
			toolbarItem(tools.asset),
			toolbarItem(tools['rectangle']),
			toolbarItem(tools['ellipse']),
			toolbarItem(tools['diamond']),
			toolbarItem(tools['triangle']),
			toolbarItem(tools['trapezoid']),
			toolbarItem(tools['rhombus']),
			toolbarItem(tools['hexagon']),
			toolbarItem(tools['cloud']),
			// toolbarItem(tools['octagon']),
			toolbarItem(tools['star']),
			toolbarItem(tools['oval']),
			toolbarItem(tools['x-box']),
			toolbarItem(tools['check-box']),
			toolbarItem(tools['arrow-left']),
			toolbarItem(tools['arrow-up']),
			toolbarItem(tools['arrow-down']),
			toolbarItem(tools['arrow-right']),
			toolbarItem(tools.line),
			toolbarItem(tools.highlight),
			toolbarItem(tools.frame),
			toolbarItem(tools.laser),
		])

		if (overrides) {
			return overrides(editor, schema, { tools })
		}

		return schema
	}, [editor, overrides, tools])

	return (
		<ToolbarSchemaContext.Provider value={toolbarSchema}>{children}</ToolbarSchemaContext.Provider>
	)
}

/** @public */
export function useToolbarSchema() {
	const ctx = React.useContext(ToolbarSchemaContext)

	if (!ctx) {
		throw new Error('useToolbarSchema must be used within a ToolbarSchemaProvider')
	}

	return ctx
}
