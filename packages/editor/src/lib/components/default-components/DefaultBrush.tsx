import { BoxModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import { getComputedStyle } from '../../exports/domUtils'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'

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
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = editor.getInstanceState().devicePixelRatio
		const zoom = editor.getCamera().z

		const w = Math.max(1, brush.w)
		const h = Math.max(1, brush.h)

		const canvasW = Math.ceil(w * zoom * dpr)
		const canvasH = Math.ceil(h * zoom * dpr)
		canvas.width = canvasW
		canvas.height = canvasH
		canvas.style.width = w + 'px'
		canvas.style.height = h + 'px'

		ctx.scale(zoom * dpr, zoom * dpr)

		const style = getComputedStyle(canvas)
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
