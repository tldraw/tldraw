import {
	atom,
	getStrokePoints,
	getSvgPathFromStrokePoints,
	OverlayUtil,
	StateNode,
	TLOverlay,
	TLPointerEventInfo,
	TLUiOverrides,
	VecModel,
} from 'tldraw'
import { extractShapesInLasso } from './extractGeometry'

/** Registers the extract tool with the UI so the S shortcut activates it. */
export const extractToolOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.extract = {
			id: 'extract',
			icon: 'tool-pointer',
			label: 'Extract',
			kbd: 's',
			onSelect: () => editor.setCurrentTool('extract'),
		}
		return tools
	},
}

/**
 * Draw a loop around part of the sketch to cut it free. On release the enclosed geometry becomes
 * its own selection, ready to drag, duplicate, or copy.
 */
export class ExtractTool extends StateNode {
	static override id = 'extract'
	static override initial = 'idle'
	static override children() {
		return [ExtractIdle, ExtractLassoing]
	}
}

class ExtractIdle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.editor.selectNone()
		this.parent.transition('lassoing', info)
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

export class ExtractLassoing extends StateNode {
	static override id = 'lassoing'

	points = atom<VecModel[]>('extract lasso points', [])

	override onEnter() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.points.set([{ x, y }])
	}

	override onPointerMove() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint().toFixed()
		this.points.set([...this.points.get(), { x, y }])
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.parent.transition('idle')
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private complete() {
		const { editor } = this
		const polygon = this.points.get()
		this.points.set([])

		if (polygon.length < 3) {
			this.parent.transition('idle')
			return
		}

		editor.markHistoryStoppingPoint('extract geometry')
		this.parent.transition('idle')
		// Image regions decode asynchronously, so the hand-off to the select tool waits for them.
		void extractShapesInLasso(editor, polygon).then((ids) => {
			if (editor.isDisposed || ids.length === 0) return
			editor.setSelectedShapes(ids)
			editor.setCurrentTool('select')
		})
	}
}

interface TLExtractLassoOverlay extends TLOverlay {
	props: { svgPath: string }
}

export class ExtractLassoOverlayUtil extends OverlayUtil<TLExtractLassoOverlay> {
	static override type = 'extract-lasso'

	override isActive() {
		return this.editor.isIn('extract.lassoing')
	}

	override getOverlays(): TLExtractLassoOverlay[] {
		const lassoing = this.editor.getStateDescendant<ExtractLassoing>('extract.lassoing')
		const points = lassoing?.points.get() ?? []
		if (points.length < 2) return []
		const svgPath = getSvgPathFromStrokePoints(getStrokePoints(points), true)
		return svgPath ? [{ id: 'extract-lasso', type: 'extract-lasso', props: { svgPath } }] : []
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLExtractLassoOverlay[]) {
		const overlay = overlays[0]
		if (!overlay) return
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
		const path = new Path2D(overlay.props.svgPath)

		ctx.globalAlpha = 0.25
		ctx.fillStyle = colors.selectionFill
		ctx.fill(path)
		ctx.globalAlpha = 1

		ctx.lineWidth = 1.5 / zoom
		ctx.setLineDash([6 / zoom, 4 / zoom])
		ctx.strokeStyle = colors.selectionStroke
		ctx.stroke(path)
		ctx.setLineDash([])
	}
}
