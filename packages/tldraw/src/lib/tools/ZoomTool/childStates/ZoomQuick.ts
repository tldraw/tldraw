import { Box, StateNode, TLKeyboardEventInfo, TLPointerEventInfo, Vec } from '@tldraw/editor'

const ANIMATION_DURATION = 220

export class ZoomQuick extends StateNode {
	static override id = 'zoom_quick'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	didZoom = false
	keysPressed: string[] = []
	zoomBrush = null as Box | null
	initialViewport = new Box()
	originScreenPoint = null as null | Vec
	viewportInFlightFromPreviousQuickZoom = null as null | Box
	previousZoomTimeout = null as null | number

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		this.info = info
		this.zoomBrush = null
		this.keysPressed = ['z', 'shift']
		this.didZoom = false
		this.originScreenPoint = this.editor.inputs.currentScreenPoint.clone()

		// So, technically, upon releasing the Z key we will be taking 220ms to zoom to the new spot.
		// However, if you press Z again in the meantime, we need to finish that previous animation so
		// that we can accurately start the new state cycle.
		if (this.viewportInFlightFromPreviousQuickZoom) {
			this.editor.zoomToBounds(this.viewportInFlightFromPreviousQuickZoom, {
				inset: 0,
				immediate: true,
			})
			this.initialViewport = this.viewportInFlightFromPreviousQuickZoom
			if (this.previousZoomTimeout) {
				clearTimeout(this.previousZoomTimeout)
			}
			this.viewportInFlightFromPreviousQuickZoom = null
		} else {
			this.initialViewport = this.editor.getViewportPageBounds()
		}

		// Zoom out to fit the entire canvas in the viewport.
		this.editor.zoomToFit({ animation: { duration: ANIMATION_DURATION } })
	}

	override onExit() {
		this.editor.updateInstanceState({ zoomBrush: null })
	}

	override onPointerMove() {
		if (
			this.zoomBrush ||
			!Vec.DistMin(this.editor.inputs.currentScreenPoint, this.originScreenPoint!, 16)
		) {
			this.updateBrush()
		}
	}

	override onPointerUp() {
		this.updateBrush()
		this.zoomToNewViewport()
	}

	override onCancel() {
		this.cancel()
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		// We have to wait until both Shift and Z are released in non-Quick Zoom's case.
		// N.B. 'Ω' is Alt-Z on Mac, which can happen if you release Shift before the Alt+Z.
		this.keysPressed = this.keysPressed.filter((key) =>
			info.key === 'Ω' ? key !== 'z' : key !== info.key.toLowerCase()
		)

		if (this.keysPressed.length === 0) {
			this.complete()
		}
	}

	private updateBrush() {
		// If we did a proactive click to zoom, we still have the keyUp event that triggers the zoom, don't update anymore.
		if (this.didZoom) return

		const {
			inputs: { currentPagePoint },
		} = this.editor

		const screenBounds = this.editor.getViewportScreenBounds()

		// Don't have an enormous brush, max out to 1/4 of the screen size.
		const maxScreenFactor = 4
		const brushWidth = Math.min(
			screenBounds.w / this.editor.getZoomLevel() / maxScreenFactor / 2,
			this.initialViewport.w / 2
		)
		const brushHeight = Math.min(
			screenBounds.h / this.editor.getZoomLevel() / maxScreenFactor / 2,
			this.initialViewport.h / 2
		)

		const topLeft = currentPagePoint.clone().addXY(-brushWidth, -brushHeight)
		const bottomRight = currentPagePoint.clone().addXY(brushWidth, brushHeight)
		this.zoomBrush = Box.FromPoints([topLeft, bottomRight])
		this.editor.updateInstanceState({ zoomBrush: this.zoomBrush.toJson() })
	}

	private cancel() {
		// If canceled, revert back to the original location and zoom level.
		this.zoomBrush = null
		this.editor.updateInstanceState({ zoomBrush: null })
		this.zoomToNewViewport()
		this.transitionBacktoPreviousTool()
	}

	private zoomToNewViewport() {
		// If we did a proactive click to zoom, we still have the keyUp event that triggers the zoom, don't do it twice.
		if (this.didZoom) return

		// Go to the new location, or revert back to the original location and zoom level.
		const newViewport = this.zoomBrush ?? this.initialViewport
		this.editor.zoomToBounds(newViewport, { inset: 0, animation: { duration: ANIMATION_DURATION } })

		// See in onEnter on why we do this.
		this.viewportInFlightFromPreviousQuickZoom = newViewport
		this.previousZoomTimeout = this.editor.timers.setTimeout(() => {
			this.viewportInFlightFromPreviousQuickZoom = null
		}, ANIMATION_DURATION + 33 /* fudge an extra frame */)

		this.zoomBrush = null
		this.editor.updateInstanceState({ zoomBrush: null })
		this.didZoom = true
	}

	private complete() {
		this.zoomToNewViewport()
		this.transitionBacktoPreviousTool()
	}

	private transitionBacktoPreviousTool() {
		// Go back to the previous tool. If we are already in select we want to transition to idle
		if (this.info.onInteractionEnd && this.info.onInteractionEnd !== 'select') {
			this.editor.setCurrentTool(this.info.onInteractionEnd, this.info)
		} else {
			this.editor.setCurrentTool('select')
		}
	}
}
