import { useEditor } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { WebGLCanvas } from '../webgl-canvas/WebGLCanvas'
import { RainbowShaderManager } from './RainbowShaderManager'
import { shaderConfig } from './config'

export const RainbowRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<RainbowShaderManager | null>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new RainbowShaderManager(editor, canvas, shaderConfig)
		rShaderManager.current = manager

		manager.refresh()

		return () => {
			manager.dispose()
			rShaderManager.current = null
		}
	}, [editor])

	return <WebGLCanvas ref={rCanvas} config={shaderConfig} />
})
