import { TLShapeId } from '@tldraw/tlschema'
import { setStyleProperty } from '../../../utils/dom'

interface ShapeContainerEntry {
	container: HTMLDivElement
	bgContainer: HTMLDivElement | null
	isCulled: boolean
}

/**
 * Manages shape container display visibility for culling.
 *
 * Instead of each Shape component subscribing to the culled shapes set independently,
 * this registry centralizes the container refs and updates them from a single reactor.
 * This reduces per-shape subscription overhead from O(N) to O(1).
 *
 * @internal
 */
export class ShapeCullingManager {
	private containers = new Map<TLShapeId, ShapeContainerEntry>()

	/**
	 * Register a shape's container refs.
	 * Sets initial display state based on whether the shape is currently culled.
	 */
	register(
		id: TLShapeId,
		container: HTMLDivElement,
		bgContainer: HTMLDivElement | null,
		isCulled: boolean
	): void {
		const display = isCulled ? 'none' : 'block'
		setStyleProperty(container, 'display', display)
		setStyleProperty(bgContainer, 'display', display)

		this.containers.set(id, {
			container,
			bgContainer,
			isCulled,
		})
	}

	/**
	 * Unregister a shape's container refs on unmount.
	 */
	unregister(id: TLShapeId): void {
		this.containers.delete(id)
	}

	/**
	 * Update display properties for shapes whose culling state changed.
	 * Called from a single centralized reactor that subscribes to getCulledShapes().
	 */
	updateCulling(culledShapes: Set<TLShapeId>): void {
		for (const [id, entry] of this.containers) {
			const shouldBeCulled = culledShapes.has(id)
			if (shouldBeCulled !== entry.isCulled) {
				const display = shouldBeCulled ? 'none' : 'block'
				setStyleProperty(entry.container, 'display', display)
				setStyleProperty(entry.bgContainer, 'display', display)
				entry.isCulled = shouldBeCulled
			}
		}
	}
}
