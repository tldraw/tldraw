import { App, featureFlags, useEditor } from '@tldraw/editor'
import { compact } from '@tldraw/utils'
import React from 'react'
import { useValue } from 'signia-react'
import { ToolItem, ToolsContextType, useTools } from './useTools'

/** @public */
export type ToolbarItem = {
	id: string
	type: 'item'
	readonlyOk: boolean
	toolItem: ToolItem
}

/** @public */
export function toolbarItem(toolItem: ToolItem): ToolbarItem {
	return {
		id: toolItem.id,
		type: 'item',
		readonlyOk: toolItem.readonlyOk,
		toolItem,
	}
}

/** @public */
export type ToolbarSchemaContextType = ToolbarItem[]

/** @public */
export const ToolbarSchemaContext = React.createContext([] as ToolbarSchemaContextType)

/** @public */
export type ToolbarSchemaProviderProps = {
	overrides?: (
		app: App,
		schema: ToolbarSchemaContextType,
		more: { tools: ToolsContextType }
	) => ToolbarSchemaContextType
	children: any
}

/** @public */
export function ToolbarSchemaProvider({ overrides, children }: ToolbarSchemaProviderProps) {
	const app = useEditor()

	const tools = useTools()
	const highlighterEnabled = useValue(featureFlags.highlighterTool)

	const toolbarSchema = React.useMemo<ToolbarSchemaContextType>(() => {
		const schema: ToolbarSchemaContextType = compact([
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
			toolbarItem(tools['pentagon']),
			toolbarItem(tools['hexagon']),
			// toolbarItem(tools['octagon']),
			toolbarItem(tools['star']),
			toolbarItem(tools['oval']),
			toolbarItem(tools['x-box']),
			toolbarItem(tools['check-box']),
			toolbarItem(tools['arrow-left']),
			toolbarItem(tools['arrow-up']),
			toolbarItem(tools['arrow-down']),
			toolbarItem(tools['arrow-right']),
			toolbarItem(tools.frame),
			toolbarItem(tools.line),
			highlighterEnabled ? toolbarItem(tools.highlight) : null,
			toolbarItem(tools.laser),
		])

		if (overrides) {
			return overrides(app, schema, { tools })
		}

		return schema
	}, [app, highlighterEnabled, overrides, tools])

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
