import { react } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { createContext, useContext } from 'react'
import { Editor } from '../editor/Editor'
import { Mat } from '../primitives/Mat'
import { setStyleProperty } from '../utils/dom'

interface ShapeContainerEntry {
	container: HTMLDivElement
	bgContainer: HTMLDivElement | null
	disposeReactor: () => void
}

/**
 * Manages all shape container DOM elements imperatively. Replaces per-shape
 * React hooks for transforms, z-index, opacity, and culling with centralized
 * reactive subscriptions driven by the signals system.
 *
 * - Per-shape reactors handle transform, bounds, and clip-path (these change
 *   independently per shape, so per-shape subscriptions are efficient).
 * - A single list reactor handles z-index, opacity, and culling (these change
 *   together when z-order or erasing state changes).
 *
 * @internal
 */
export class ShapeContainerManager {
	private containers = new Map<TLShapeId, ShapeContainerEntry>()
	private disposeListReactor: () => void

	constructor(private editor: Editor) {
		// Single reactor for z-index, opacity, and culling across all shapes.
		// getRenderingShapes() returns the full metadata; getCulledShapes() returns
		// the set of shapes that should be hidden. When z-order changes, all indices
		// change together, so a single pass is efficient.
		this.disposeListReactor = react('shape container manager: list', () => {
			const renderingShapes = editor.getRenderingShapes()
			const culledShapes = editor.getCulledShapes()

			for (const { id, index, backgroundIndex, opacity } of renderingShapes) {
				const entry = this.containers.get(id)
				if (!entry) continue

				const { container, bgContainer } = entry

				// Z-index
				setStyleProperty(container, 'z-index', index)
				setStyleProperty(bgContainer, 'z-index', backgroundIndex)

				// Opacity
				setStyleProperty(container, 'opacity', opacity)
				setStyleProperty(bgContainer, 'opacity', opacity)

				// Culling
				const display = culledShapes.has(id) ? 'none' : 'block'
				setStyleProperty(container, 'display', display)
				setStyleProperty(bgContainer, 'display', display)
			}
		})
	}

	/**
	 * Register a shape's container elements. Creates a per-shape reactor that
	 * tracks the shape's page transform, geometry bounds, and clip path,
	 * applying them directly to the DOM elements.
	 */
	register(id: TLShapeId, container: HTMLDivElement, bgContainer: HTMLDivElement | null) {
		// Dispose any existing reactor for this shape (shouldn't happen, but be safe)
		this.containers.get(id)?.disposeReactor()

		const editor = this.editor

		const disposeReactor = react('shape container manager: shape ' + id, () => {
			const shape = editor.getShape(id)
			if (!shape) return

			// Clip path
			const clipPath = editor.getShapeClipPath(id) ?? 'none'
			setStyleProperty(container, 'clip-path', clipPath)
			setStyleProperty(bgContainer, 'clip-path', clipPath)

			// Page transform (position + rotation as CSS matrix)
			const pageTransform = editor.getShapePageTransform(id)
			const transform = Mat.toCssString(pageTransform)
			setStyleProperty(container, 'transform', transform)
			setStyleProperty(bgContainer, 'transform', transform)

			// Bounds (width / height)
			const bounds = editor.getShapeGeometry(shape).bounds
			const width = Math.max(bounds.width, 1) + 'px'
			const height = Math.max(bounds.height, 1) + 'px'
			setStyleProperty(container, 'width', width)
			setStyleProperty(container, 'height', height)
			setStyleProperty(bgContainer, 'width', width)
			setStyleProperty(bgContainer, 'height', height)
		})

		this.containers.set(id, { container, bgContainer, disposeReactor })
	}

	/**
	 * Unregister a shape's container elements. Disposes the per-shape reactor.
	 */
	unregister(id: TLShapeId) {
		const entry = this.containers.get(id)
		if (entry) {
			entry.disposeReactor()
			this.containers.delete(id)
		}
	}

	/**
	 * Dispose all reactors. Call when the canvas unmounts.
	 */
	dispose() {
		this.disposeListReactor()
		for (const entry of this.containers.values()) {
			entry.disposeReactor()
		}
		this.containers.clear()
	}
}

/** @internal */
export const ShapeContainerManagerContext = createContext<ShapeContainerManager | null>(null)

/** @internal */
export function useShapeContainerManager(): ShapeContainerManager {
	const manager = useContext(ShapeContainerManagerContext)
	if (!manager) {
		throw new Error('useShapeContainerManager must be used within ShapeContainerManagerContext')
	}
	return manager
}
