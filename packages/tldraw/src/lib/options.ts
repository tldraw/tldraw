import { TldrawEditorOptions, defaultTldrawEditorOptions } from '@tldraw/editor'

export interface TldrawOptions extends TldrawEditorOptions {
	readonly adjacentShapeMargin: number
}

export const defaultTldrawOptions = {
	...defaultTldrawEditorOptions,
	adjacentShapeMargin: 10,
} as const satisfies TldrawOptions
