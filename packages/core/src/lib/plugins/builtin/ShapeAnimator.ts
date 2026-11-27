// This module is part of the headless core. It must not import React or touch the DOM.
import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { lerp, structuredClone, uniqueId } from '@tldraw/utils'
import { DEFAULT_ANIMATION_OPTIONS } from '../../constants'
import type { Editor } from '../../editor/Editor'
import { applyPartialToRecordWithProps } from '../../editor/recordUtils'
import { TLCameraMoveOptions } from '../../editor/types/misc-types'
import { EASINGS } from '../../primitives/easings'

/**
 * Animates shape updates on each tick. `editor.animateShape` and `animateShapes` use it. An update
 * to an animating shape stops its animation.
 *
 * @public
 */
export class ShapeAnimator {
	constructor(private readonly editor: Editor) {}

	animatingShapes = new Map<TLShapeId, string>()

	/**
	 * Animate a shape.
	 *
	 * @example
	 * ```ts
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 })
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 }, { animation: { duration: 100, ease: t => t*t } })
	 * ```
	 *
	 * @param partial - The shape partial to update.
	 * @param opts - The animation's options.
	 *
	 * @public
	 */
	animateShape(
		partial: TLShapePartial | null | undefined,
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): Editor {
		return this.editor.animateShapes([partial], opts)
	}

	/**
	 * Animate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }])
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }], { animation: { duration: 100, ease: t => t*t } })
	 * ```
	 *
	 * @param partials - The shape partials to update.
	 * @param opts - The animation's options.
	 *
	 * @public
	 */
	animateShapes(
		partials: (TLShapePartial | null | undefined)[],
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): Editor {
		if (!opts.animation) return this.editor
		const { duration = 500, easing = EASINGS.linear } = opts.animation

		const animationId = uniqueId()

		let remaining = duration
		let t: number

		interface ShapeAnimation {
			start: TLShape
			end: TLShape
		}

		const animations: ShapeAnimation[] = []

		// Snapshot the lock override now: when this animation is started inside
		// editor.run(..., { ignoreShapeLock: true }), run() restores the flag before any tick
		// fires, so the final updateShapes below would refuse the locked shape and strand it
		const ignoreShapeLock = this.editor._shouldIgnoreShapeLock

		let partial: TLShapePartial | null | undefined, result: ShapeAnimation
		for (let i = 0, n = partials.length; i < n; i++) {
			partial = partials[i]
			if (!partial) continue

			const shape = this.editor.getShape(partial.id)!
			if (!shape) continue

			// Apply the same lock rule as updateShapes up front: the intermediate frames go through
			// _updateShapes, which doesn't check locks, so a locked shape would otherwise be moved by
			// every frame but the last and end up stranded at the penultimate one
			const unlocks = shape.isLocked && Object.hasOwn(partial, 'isLocked') && !partial.isLocked
			if (!ignoreShapeLock && !unlocks && this.editor.isShapeOrAncestorLocked(shape)) {
				continue
			}

			result = {
				start: structuredClone(shape),
				end: applyPartialToRecordWithProps(structuredClone(shape), partial),
			}

			animations.push(result)
			this.animatingShapes.set(shape.id, animationId)
		}

		const handleTick = (elapsed: number) => {
			remaining -= elapsed

			if (remaining < 0) {
				const { animatingShapes } = this
				const partialsToUpdate = partials.filter(
					(p) => p && animatingShapes.get(p.id) === animationId
				)
				if (partialsToUpdate.length) {
					// the regular update shapes also removes the shape from
					// the animating shapes set
					this.editor.run(() => this.editor.updateShapes(partialsToUpdate), { ignoreShapeLock })
				}

				this.editor.off('tick', handleTick)
				return
			}

			t = easing(1 - remaining / duration)

			const { animatingShapes } = this

			const updates: TLShapePartial[] = []

			let animationIdForShape: string | undefined
			for (let i = 0, n = animations.length; i < n; i++) {
				const { start, end } = animations[i]
				// Is the animation for this shape still active?
				animationIdForShape = animatingShapes.get(start.id)
				if (animationIdForShape !== animationId) continue

				updates.push({
					...end,
					x: lerp(start.x, end.x, t),
					y: lerp(start.y, end.y, t),
					opacity: lerp(start.opacity, end.opacity, t),
					rotation: lerp(start.rotation, end.rotation, t),
					props: this.editor.getShapeUtil(end).getInterpolatedProps?.(start, end, t) ?? end.props,
				})
			}

			// The _updateShapes method does NOT remove the
			// shapes from the animated shapes set
			this.editor._updateShapes(updates)
		}

		this.editor.on('tick', handleTick)

		return this.editor
	}
}
