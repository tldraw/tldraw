import { Matrix2d, toDomPrecision } from '@tldraw/primitives'
import * as React from 'react'
import { track } from 'signia-react'
import { TLPointerEventInfo } from '../app/types/event-types'
import { useApp } from '../hooks/useEditor'
import { releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'

export const SelectionBg = track(function SelectionBg() {
	const app = useApp()

	const events = React.useMemo(() => {
		const onPointerDown = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			setPointerCapture(e.currentTarget, e)

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'selection',
				name: 'pointer_down',
				...getPointerInfo(e, app.getContainer()),
			}

			app.dispatch(info)
		}

		const onPointerMove = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'selection',
				name: 'pointer_move',
				...getPointerInfo(e, app.getContainer()),
			}

			app.dispatch(info)
		}

		const onPointerUp = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			releasePointerCapture(e.currentTarget, e)

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'selection',
				name: 'pointer_up',
				...getPointerInfo(e, app.getContainer()),
			}

			app.dispatch(info)
		}

		const onPointerEnter = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'selection',
				name: 'pointer_enter',
				...getPointerInfo(e, app.getContainer()),
			}

			app.dispatch(info)
		}

		const onPointerLeave = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const info: TLPointerEventInfo = {
				type: 'pointer',
				target: 'selection',
				name: 'pointer_leave',
				...getPointerInfo(e, app.getContainer()),
			}

			app.dispatch(info)
		}

		return {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerEnter,
			onPointerLeave,
		}
	}, [app])

	const { selectionBounds: bounds, selectedIds } = app
	if (!bounds) return null

	const shouldDisplay = app.isInAny(
		'select.idle',
		'select.brushing',
		'select.scribble_brushing',
		'select.pointing_shape',
		'select.pointing_selection',
		'text.resizing'
	)

	if (selectedIds.length === 1) {
		const shape = app.getShapeById(selectedIds[0])
		if (!shape) {
			return null
		}
		const util = app.getShapeUtil(shape)
		if (util.hideSelectionBoundsBg(shape)) {
			return null
		}
	}

	const transform = Matrix2d.toCssString(
		Matrix2d.Compose(
			Matrix2d.Translate(bounds.minX, bounds.minY),
			Matrix2d.Rotate(app.selectionRotation)
		)
	)

	return (
		<div
			className="tl-selection__bg"
			draggable={false}
			style={{
				transform,
				width: toDomPrecision(Math.max(1, bounds.width)),
				height: toDomPrecision(Math.max(1, bounds.height)),
				pointerEvents: shouldDisplay ? 'all' : 'none',
				opacity: shouldDisplay ? 1 : 0,
			}}
			{...events}
		/>
	)
})
