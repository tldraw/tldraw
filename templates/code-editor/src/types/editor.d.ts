import { Editor, TLShape, TLShapeId } from 'tldraw'

/**
 * The API available in the code execution environment.
 * This provides helper functions for common shape operations.
 */
export interface EditorAPI {
	createRect(
		x: number,
		y: number,
		w: number,
		h: number,
		options?: Record<string, unknown>
	): TLShapeId
	createCircle(x: number, y: number, radius: number, options?: Record<string, unknown>): TLShapeId
	createText(x: number, y: number, text: string, options?: Record<string, unknown>): TLShapeId
	createArrow(
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		options?: Record<string, unknown>
	): TLShapeId
	clear(): void
	getAllShapes(): TLShape[]
	getGeneratedShapes(): TLShape[]
}

/**
 * Global variables available in the code execution scope.
 * These are injected when code is executed.
 */
declare global {
	const editor: Editor
	const api: EditorAPI
}

export {}
