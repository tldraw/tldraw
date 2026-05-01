import { OverlayUtil, TLOverlay, TLShape, TLShapeId, createComputedCache } from '@tldraw/editor'
import type { Editor } from '@tldraw/editor'
import { TLIndicatorPath } from '@tldraw/editor'
import { getArrowTargetState } from '../shapes/arrow/arrowTargetState'
import { DraggingHandle } from '../tools/SelectTool/childStates/DraggingHandle'
import { PointingHandle } from '../tools/SelectTool/childStates/PointingHandle'

/** @public */
export interface TLArrowHintOverlay extends TLOverlay {
	props: {
		targetId: TLShapeId
		handles: {
			top: { x: number; y: number; isEnabled: boolean }
			bottom: { x: number; y: number; isEnabled: boolean }
			left: { x: number; y: number; isEnabled: boolean }
			right: { x: number; y: number; isEnabled: boolean }
		}
		anchorX: number
		anchorY: number
		snap: string
		isExact: boolean
		isPrecise: boolean
		arrowKind: string
		showEdgeHints: boolean
	}
}

const indicatorPathCache = createComputedCache(
	'arrowHintIndicatorPath',
	(editor: Editor, shape: TLShape) => {
		const util = editor.getShapeUtil(shape)
		return util.getIndicatorPath(shape)
	},
	{
		areRecordsEqual(a, b) {
			return a.props === b.props
		},
	}
)

/**
 * Overlay util for arrow target hints (target shape indicator + edge snap circles).
 *
 * @public
 */
export class ArrowHintOverlayUtil extends OverlayUtil<TLArrowHintOverlay> {
	static override type = 'arrow_hint'
	override options = {
		zIndex: 1000,
		lineWidth: 1.5,
		edgeRadius: 8,
		edgePointRadius: 12,
		handleRadius: 4,
	}

	override isActive(): boolean {
		const editor = this.editor
		if (editor.isInAny('arrow.idle', 'arrow.pointing')) return true

		if (editor.isIn('select.pointing_handle')) {
			const node: PointingHandle = editor.getStateDescendant('select.pointing_handle')!
			if (
				node.info.shape.type === 'arrow' &&
				(node.info.handle.id === 'start' || node.info.handle.id === 'end')
			) {
				return true
			}
		}

		if (editor.isIn('select.dragging_handle')) {
			const node: DraggingHandle = editor.getStateDescendant('select.dragging_handle')!
			if (
				node.info.shape.type === 'arrow' &&
				(node.info.handle.id === 'start' || node.info.handle.id === 'end')
			) {
				return true
			}
		}

		return false
	}

	override getOverlays(): TLArrowHintOverlay[] {
		const targetInfo = getArrowTargetState(this.editor)
		if (!targetInfo) return []

		const { handlesInPageSpace, snap, anchorInPageSpace, arrowKind, isExact, isPrecise } =
			targetInfo
		const showEdgeHints = !isExact && arrowKind === 'elbow'

		return [
			{
				id: 'arrow_hint',
				type: 'arrow_hint',
				props: {
					targetId: targetInfo.target.id,
					handles: {
						top: {
							x: handlesInPageSpace.top.point.x,
							y: handlesInPageSpace.top.point.y,
							isEnabled: handlesInPageSpace.top.isEnabled,
						},
						bottom: {
							x: handlesInPageSpace.bottom.point.x,
							y: handlesInPageSpace.bottom.point.y,
							isEnabled: handlesInPageSpace.bottom.isEnabled,
						},
						left: {
							x: handlesInPageSpace.left.point.x,
							y: handlesInPageSpace.left.point.y,
							isEnabled: handlesInPageSpace.left.isEnabled,
						},
						right: {
							x: handlesInPageSpace.right.point.x,
							y: handlesInPageSpace.right.point.y,
							isEnabled: handlesInPageSpace.right.isEnabled,
						},
					},
					anchorX: anchorInPageSpace.x,
					anchorY: anchorInPageSpace.y,
					snap,
					isExact,
					isPrecise,
					arrowKind,
					showEdgeHints,
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLArrowHintOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
		const { targetId, handles, anchorX, anchorY, snap, showEdgeHints } = overlay.props

		// Draw the target shape indicator
		const shape = editor.getShape(targetId)
		if (shape) {
			const pageTransform = editor.getShapePageTransform(shape)
			const indicatorPath = indicatorPathCache.get(editor, targetId)
			if (pageTransform && indicatorPath) {
				ctx.save()
				ctx.transform(
					pageTransform.a,
					pageTransform.b,
					pageTransform.c,
					pageTransform.d,
					pageTransform.e,
					pageTransform.f
				)
				ctx.strokeStyle = colors.selectionStroke
				ctx.lineWidth = this.options.lineWidth / zoom
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				this._renderIndicatorPath(ctx, indicatorPath)
				ctx.restore()
			}
		}

		if (!showEdgeHints) return

		// Draw the anchor snap circle
		if (snap === 'edge' || snap === 'edge-point') {
			const snapRadius =
				(snap === 'edge-point' ? this.options.edgePointRadius : this.options.edgeRadius) / zoom
			ctx.beginPath()
			ctx.arc(anchorX, anchorY, snapRadius, 0, Math.PI * 2)
			ctx.fillStyle = colors.selectionFill
			ctx.fill()
		}

		// Draw edge handle circles using a single fill+stroke for all handles
		const handleRadius = this.options.handleRadius / zoom
		ctx.fillStyle = colors.selectedContrast
		ctx.strokeStyle = colors.selectionStroke
		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.beginPath()
		for (const handle of Object.values(handles)) {
			if (!handle.isEnabled) continue
			// Separate subpath for each circle
			ctx.moveTo(handle.x + handleRadius, handle.y)
			ctx.arc(handle.x, handle.y, handleRadius, 0, Math.PI * 2)
		}
		ctx.fill()
		ctx.stroke()
	}

	/** @internal */
	private _renderIndicatorPath(ctx: CanvasRenderingContext2D, indicatorPath: TLIndicatorPath) {
		if (indicatorPath instanceof Path2D) {
			ctx.stroke(indicatorPath)
		} else {
			const { path, clipPath, additionalPaths } = indicatorPath

			if (clipPath) {
				ctx.save()
				ctx.clip(clipPath, 'evenodd')
				ctx.stroke(path)
				ctx.restore()
			} else {
				ctx.stroke(path)
			}

			if (additionalPaths) {
				for (const additionalPath of additionalPaths) {
					ctx.stroke(additionalPath)
				}
			}
		}
	}
}
