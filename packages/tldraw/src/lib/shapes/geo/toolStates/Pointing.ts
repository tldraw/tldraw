import {
	GeoShapeGeoStyle,
	StateNode,
	TLGeoShape,
	TLPointerEventInfo,
	Vec,
	createShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onPointerUp() {
		this.complete()
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			const { originPagePoint } = this.editor.inputs

			const id = createShapeId()

			const creatingMarkId = this.editor.markHistoryStoppingPoint(`creating_geo:${id}`)

			this.editor
				.createShapes<TLGeoShape>([
					{
						id,
						type: 'geo',
						x: originPagePoint.x,
						y: originPagePoint.y,
						props: {
							w: 1,
							h: 1,
							geo: this.editor.getStyleForNextShape(GeoShapeGeoStyle),
							scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
						},
					},
				])
				.select(id)
				.setCurrentTool('select.resizing', {
					...info,
					target: 'selection',
					handle: 'bottom_right',
					isCreating: true,
					creatingMarkId,
					creationCursorOffset: { x: 1, y: 1 },
					onInteractionEnd: 'geo',
				})
		}
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		const { originPagePoint } = this.editor.inputs

		const id = createShapeId()

		this.editor.markHistoryStoppingPoint(`creating_geo:${id}`)

		const scale = this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1

		const geo = this.editor.getStyleForNextShape(GeoShapeGeoStyle)

		const size =
			geo === 'star'
				? { w: 200, h: 190 }
				: geo === 'cloud'
					? { w: 300, h: 180 }
					: { w: 200, h: 200 }

		this.editor.createShapes<TLGeoShape>([
			{
				id,
				type: 'geo',
				x: originPagePoint.x,
				y: originPagePoint.y,
				props: {
					geo: this.editor.getStyleForNextShape(GeoShapeGeoStyle),
					scale,
					...size,
				},
			},
		])

		const shape = this.editor.getShape<TLGeoShape>(id)!
		if (!shape) return

		const { w, h } = shape.props

		const delta = new Vec(w / 2, h / 2).mul(scale)
		const parentTransform = this.editor.getShapeParentTransform(shape)
		if (parentTransform) delta.rot(-parentTransform.rotation())

		this.editor.select(id)
		this.editor.updateShape<TLGeoShape>({
			id: shape.id,
			type: 'geo',
			x: shape.x - delta.x,
			y: shape.y - delta.y,
			props: {
				geo: this.editor.getStyleForNextShape(GeoShapeGeoStyle),
				w: w * scale,
				h: h * scale,
			},
		})

		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setCurrentTool('select', {})
		}
	}

	private cancel() {
		// we should not have created any shapes yet, so no need to bail
		this.parent.transition('idle')
	}
}
