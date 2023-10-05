import { StateNode, TLEventHandlers, TLGeoShape, Vec2d } from '@tldraw/editor'
import { updateHoveredId } from '../../../tools/selection-logic/updateHoveredId'

export class Idle extends StateNode {
	static override id = 'idle'

	getTextInjectionSites = () => {
		const hoverShape = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
			hitInside: true,
			hitLabels: false,
			margin: 0,
		})
		if (!hoverShape) {
			return {}
		}

		const textInjectionSites = this.editor
			.getShapeUtil(hoverShape)
			.getTextInjectionSites?.(hoverShape)

		if (!textInjectionSites?.length) {
			return {}
		}

		const currentPointInShapeSpace = this.editor.getPointInShapeSpace(
			hoverShape,
			this.editor.inputs.currentPagePoint
		)
		const hoveredSite = textInjectionSites.find(
			(site) => Vec2d.Dist(currentPointInShapeSpace, site) < 20
		)
		return { hoverShape, hoveredSite, textInjectionSites }
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredId(this.editor)
			}
		}

		const { hoverShape, textInjectionSites, hoveredSite } = this.getTextInjectionSites()
		if (hoveredSite) {
			this.editor.setCursor({ type: 'text', rotation: 0 })
		} else {
			this.editor.setCursor({ type: 'cross', rotation: 0 })
		}
		if (!hoverShape) {
			this.editor.clearTextInjectionSites()
		} else {
			this.editor.setTextInjectionSites(
				hoverShape,
				textInjectionSites.map((site) => {
					return {
						...site,
						hovered: site === hoveredSite,
					}
				})
			)
		}
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { hoverShape, hoveredSite } = this.getTextInjectionSites()
		if (hoveredSite) {
			this.editor.select(hoverShape)
			this.editor.setCurrentTool('select')
			this.editor.setEditingShape(hoverShape)
			this.editor.root.current.value!.transition('editing_shape', {
				...info,
				target: 'shape',
				shape: hoverShape,
			})
			if (hoverShape.type === 'geo') {
				this.editor.updateShapes([
					{
						id: hoverShape.id,
						type: 'geo',
						props: {
							verticalAlign:
								hoveredSite.align === 'center'
									? 'middle'
									: hoveredSite.align === 'top'
									? 'start'
									: 'end',
							align:
								hoveredSite.justify === 'center'
									? 'middle'
									: hoveredSite.justify === 'left'
									? 'start'
									: 'end',
						} satisfies Partial<TLGeoShape['props']>,
					},
				])
			}
		} else {
			this.parent.transition('pointing', info)
		}
	}

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (info.key === 'Enter') {
			if (this.editor.instanceState.isReadonly) return null
			const { onlySelectedShape } = this.editor
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingShape(onlySelectedShape.id)
				this.editor.root.current.value!.transition('editing_shape', {
					...info,
					target: 'shape',
					shape: onlySelectedShape,
				})
			}
		}
	}

	override onExit = () => {
		this.editor.clearTextInjectionSites()
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
