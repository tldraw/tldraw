import { useEditor } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { WebGLCanvas } from '../webgl-canvas/WebGLCanvas'
import { ShadowCastingShaderManager } from './ShadowCastingShaderManager'
import { shaderConfig } from './config'

export const ShadowCastingRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<ShadowCastingShaderManager | null>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new ShadowCastingShaderManager(editor, canvas, shaderConfig)
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
