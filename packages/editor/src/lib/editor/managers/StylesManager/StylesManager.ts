import { computed } from '@tldraw/state'
import { StyleProp, StylePropValue, TLShape, TLShapePartial } from '@tldraw/tlschema'
import { getOwnProperty } from '@tldraw/utils'
import { ReadonlySharedStyleMap, SharedStyle, SharedStyleMap } from '../../../utils/SharedStylesMap'
import type { Editor } from '../../Editor'
import { TLHistoryBatchOptions } from '../../types/history-types'
import { EditorManager } from '../EditorManager'

/**
 * Shared styles and opacity of the selection, and the styles applied to the next shape.
 *
 * @internal
 */
export class StylesManager extends EditorManager {
	/* --------------------- Styles --------------------- */

	/**
	 * Groups have no styles of their own: a style read or write on a selection applies to the
	 * non-group shapes beneath each group, however deeply nested. Returns those shapes.
	 *
	 * @internal
	 */
	_getStyleableShapes(shapes: TLShape[]): TLShape[] {
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
	_getSelectionSharedStyles(): ReadonlySharedStyleMap {
		const sharedStyles = new SharedStyleMap()
		for (const shape of this._getStyleableShapes(this.editor.getSelectedShapes())) {
			for (const [style, propKey] of this.editor.styleProps[shape.type]) {
				sharedStyles.applyValue(style, getOwnProperty(shape.props, propKey))
			}
		}

		return sharedStyles
	}

	getStyleForNextShape<T>(style: StyleProp<T>): T {
		const value = this.editor.getInstanceState().stylesForNextShape[style.id]
		return value === undefined ? style.defaultValue : (value as T)
	}

	getShapeStyleIfExists<T>(shape: TLShape, style: StyleProp<T>): T | undefined {
		const styleKey = this.editor.styleProps[shape.type].get(style)
		if (styleKey === undefined) return undefined
		return getOwnProperty(shape.props, styleKey) as T | undefined
	}

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
		return { type: 'shared', value: this.editor.getInstanceState().opacityForNextShape }
	}

	setOpacityForNextShapes(opacity: number, historyOptions?: TLHistoryBatchOptions): Editor {
		this.editor.updateInstanceState({ opacityForNextShape: opacity }, historyOptions)
		return this.editor
	}

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
