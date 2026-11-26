// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { computed } from '@tldraw/state'
import { StyleProp, StylePropValue, TLShape, TLShapePartial } from '@tldraw/tlschema'
import { getOwnProperty } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { TLHistoryBatchOptions } from '../../editor/types/history-types'
import { ReadonlySharedStyleMap, SharedStyle, SharedStyleMap } from '../../utils/SharedStylesMap'

/**
 * Reads and sets styles and opacity: the shared styles of the selection or the current tool, and
 * the styles for the next shapes. The editor's methods of the same names use it. Groups have no
 * styles of their own, so a style change on a group applies to the shapes in it.
 *
 * @public
 */
export class StyleController {
	constructor(private readonly editor: Editor) {}

	/**
	 * Groups have no styles of their own: a style read or write on a selection applies to the
	 * non-group shapes beneath each group, however deeply nested. Returns those shapes.
	 *
	 * @internal
	 */
	private _getStyleableShapes(shapes: TLShape[]): TLShape[] {
		const result: TLShape[] = []
		const visit = (shape: TLShape) => {
			if (this.editor.isShapeOfType(shape, 'group')) {
				for (const childId of this.editor.getSortedChildIdsForParent(shape.id)) {
					const child = this.editor.getShape(childId)
					if (child) visit(child)
				}
			} else {
				result.push(shape)
			}
		}
		for (const shape of shapes) visit(shape)
		return result
	}

	/**
	 * A derived map containing all current styles among the user's selected shapes.
	 *
	 * @internal
	 */
	@computed
	private _getSelectionSharedStyles(): ReadonlySharedStyleMap {
		const sharedStyles = new SharedStyleMap()
		for (const shape of this._getStyleableShapes(this.editor.getSelectedShapes())) {
			for (const [style, propKey] of this.editor.styleProps[shape.type]) {
				sharedStyles.applyValue(style, getOwnProperty(shape.props, propKey))
			}
		}

		return sharedStyles
	}

	/**
	 * A map of all the current styles either in the current selection, or that are relevant to the
	 * current tool.
	 *
	 * @example
	 * ```ts
	 * const color = editor.getSharedStyles().get(DefaultColorStyle)
	 * if (color && color.type === 'shared') {
	 *   print('All selected shapes have the same color:', color.value)
	 * }
	 * ```
	 *
	 * @public
	 */
	@computed<ReadonlySharedStyleMap>({ isEqual: (a, b) => a.equals(b) })
	getSharedStyles(): ReadonlySharedStyleMap {
		// If we're in selecting and if we have a selection, return the shared styles from the
		// current selection
		if (this.editor.isIn('select') && this.editor.getSelectedShapeIds().length > 0) {
			return this._getSelectionSharedStyles()
		}

		// If the current tool is associated with a shape, return the styles for that shape.
		// Otherwise, just return an empty map.
		const currentTool = this.editor.root.getCurrent()!
		const styles = new SharedStyleMap()

		if (!currentTool) return styles

		if (currentTool.shapeType) {
			for (const style of this.editor.styleProps[currentTool.shapeType].keys()) {
				styles.applyValue(style, this.editor.getStyleForNextShape(style))
			}
		}

		return styles
	}

	/**
	 * Get the currently selected shared opacity.
	 * If any shapes are selected, this returns the shared opacity of the selected shapes.
	 * Otherwise, this returns the chosen opacity for the next shape.
	 *
	 * @public
	 */
	@computed getSharedOpacity(): SharedStyle<number> {
		if (this.editor.isIn('select') && this.editor.getSelectedShapeIds().length > 0) {
			let opacity: number | null = null
			for (const shape of this._getStyleableShapes(this.editor.getSelectedShapes())) {
				if (opacity === null) {
					opacity = shape.opacity
				} else if (opacity !== shape.opacity) {
					return { type: 'mixed' }
				}
			}

			if (opacity !== null) return { type: 'shared', value: opacity }
		}
		return { type: 'shared', value: this.getOpacityForNextShape() }
	}

	/**
	 * Set the opacity for the next shapes. This will effect subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForNextShapes(0.5)
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 * @param historyOptions - The history options for the change.
	 */
	setOpacityForNextShapes(opacity: number, historyOptions?: TLHistoryBatchOptions): Editor {
		this.editor.updateInstanceState({ opacityForNextShape: opacity }, historyOptions)
		return this.editor
	}

	@computed private getOpacityForNextShape(): number {
		return this.editor.getInstanceState().opacityForNextShape
	}

	/**
	 * Set the current opacity. This will effect any selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForSelectedShapes(0.5)
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 */
	setOpacityForSelectedShapes(opacity: number): Editor {
		const selectedShapes = this.editor.getSelectedShapes()

		if (selectedShapes.length > 0) {
			this.editor.updateShapes(
				this._getStyleableShapes(selectedShapes).map((shape) => ({
					id: shape.id,
					type: shape.type,
					opacity,
				}))
			)
		}

		return this.editor
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp} for the next shapes. This change will be applied to subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForNextShapes(DefaultColorStyle, 'red')
	 * editor.setStyleForNextShapes(DefaultColorStyle, 'red', { ephemeral: true })
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 * @param historyOptions - The history options for the change.
	 *
	 * @public
	 */
	setStyleForNextShapes<T>(
		style: StyleProp<T>,
		value: T,
		historyOptions?: TLHistoryBatchOptions
	): Editor {
		const stylesForNextShape = this.editor.getInstanceState().stylesForNextShape

		this.editor.updateInstanceState(
			{ stylesForNextShape: { ...stylesForNextShape, [style.id]: value } },
			historyOptions
		)

		return this.editor
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp}. This change will be applied to the currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 *
	 * @public
	 */
	setStyleForSelectedShapes<S extends StyleProp<any>>(style: S, value: StylePropValue<S>): Editor {
		const selectedShapes = this.editor.getSelectedShapes()

		if (selectedShapes.length > 0) {
			const updates: TLShapePartial[] = []
			for (const shape of this._getStyleableShapes(selectedShapes)) {
				const stylePropKey = this.editor.styleProps[shape.type].get(style)
				if (stylePropKey) {
					updates.push({
						id: shape.id,
						type: shape.type,
						props: { [stylePropKey]: value },
					})
				}
			}

			this.editor.updateShapes(updates)
		}

		return this.editor
	}
}
