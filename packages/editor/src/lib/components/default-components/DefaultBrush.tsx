import { BoxModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'
import { prepareCanvas } from './canvas-overlay-helpers'

/** @public */
export interface TLBrushProps {
	userId?: string
	brush: BoxModel
	color?: string
	opacity?: number
	className?: string
}

/** @public @react */
export const DefaultBrush = ({ brush, color, opacity, className }: TLBrushProps) => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	useTransform(rCanvas, brush.x, brush.y)

	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return
		const w = Math.max(1, brush.w)
		const h = Math.max(1, brush.h)

		const { ctx, zoom, style } = prepareCanvas(editor, canvas, w, h)
		const alpha = opacity ?? 1

		ctx.globalAlpha = alpha
		ctx.fillStyle = color ?? style.getPropertyValue('--tl-color-brush-fill')
		ctx.fillRect(0, 0, w, h)

		ctx.strokeStyle = color ?? style.getPropertyValue('--tl-color-brush-stroke')
		ctx.lineWidth = 1 / zoom
		ctx.strokeRect(0, 0, w, h)
	})

	return <canvas ref={rCanvas} className={classNames('tl-overlays__item', className)} />
}
