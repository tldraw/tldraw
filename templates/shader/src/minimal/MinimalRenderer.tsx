import { useEditor } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { WebGLCanvas } from '../WebGLCanvas'
import { MinimalShaderManager } from './MinimalShaderManager'
import { shaderConfig } from './config'

export const MinimalRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<MinimalShaderManager | null>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new MinimalShaderManager(editor, canvas, shaderConfig)
		rShaderManager.current = manager

		const handlePointerMove = (e: PointerEvent) => manager.pointerMove(e.clientX, e.clientY)

		window.addEventListener('pointermove', handlePointerMove)

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			manager.dispose()
			rShaderManager.current = null
		}
	}, [editor])

	return <WebGLCanvas ref={rCanvas} config={shaderConfig} />
})
