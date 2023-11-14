import { track } from '@tldraw/state'
import classNames from 'classnames'
import { HTMLProps, useLayoutEffect, useRef } from 'react'
import { useEditor } from '../hooks/useEditor'

/** @public */
export const PositionedOnCanvas = track(function PositionedOnCanvas({
	x: offsetX = 0,
	y: offsetY = 0,
	rotation = 0,
	...rest
}: {
	x?: number
	y?: number
	rotation?: number
} & HTMLProps<HTMLDivElement>) {
	const editor = useEditor()
	const rContainer = useRef<HTMLDivElement>(null)
	const camera = editor.getCamera()

	useLayoutEffect(() => {
		const { x, y, z } = editor.getCamera()
		const elm = rContainer.current
		if (!elm) return
		if (x === undefined) return

		elm.style.transform = `translate(${x}px, ${y}px) scale(${z}) rotate(${rotation}rad) translate(${offsetX}px, ${offsetY}px)`
	}, [camera, editor, offsetX, offsetY, rotation])

	return <div ref={rContainer} {...rest} className={classNames('tl-positioned', rest.className)} />
})
