// This module is part of the headless core. It must not import React or touch the DOM.
import type { TLShape } from '@tldraw/tlschema'
import type { SnapManager } from '../../editor/managers/SnapManager/SnapManager'
import { TLPipe, defineCapability, defineSlot } from '../plugin'

/** @public */
export const snappingCapability = defineCapability<SnapManager>('snapping')

/**
 * Decides whether a shape is a snap target. The initial value is `ShapeUtil.canSnap`, so a shape
 * util keeps working as before. A plugin can contribute a pipe to change the result for any
 * shape type without changing its util.
 *
 * @example
 * ```ts
 * const snapOnlyToFrames = definePlugin({
 *   id: 'snapOnlyToFrames',
 *   setup(ctx) {
 *     ctx.contribute(canSnapToShapeSlot, (canSnap, shape) => canSnap && shape.type === 'frame')
 *   },
 * })
 * ```
 *
 * @public
 */
export const canSnapToShapeSlot = defineSlot<TLPipe<boolean, [TLShape]>>('snapping.canSnapToShape')
