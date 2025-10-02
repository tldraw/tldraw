import { useEditor, useValue } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { RainbowShaderManager } from './RainbowShaderManager'
import { DEFAULT_CONFIG, shaderConfig } from './config'

/**
 * React component that renders the rainbow shader effect.
 * Creates a WebGL canvas overlay that displays colorful halos around all shapes.
 * Automatically responds to shape changes, camera movements, and configuration updates.
 */
export const RainbowRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<RainbowShaderManager | null>(null)
	const config = useValue('config', () => shaderConfig.get(), [])

	// Initialize manager - recreate when config changes (especially quality)
	useLayoutEffect(() => {
		const canvas = rCanvas.current!

		// Get quality from config
		const quality = config.quality ?? DEFAULT_CONFIG.quality

		const manager = new RainbowShaderManager(editor, canvas, quality)
		rShaderManager.current = manager

		// Set initial canvas size with quality applied
		manager.resize()

		// Refresh geometries after resize to ensure correct scaling
		manager.refresh()

		// Listen for window resize
		window.addEventListener('resize', manager.resize)

		return () => {
			window.removeEventListener('resize', manager.resize)
			manager.dispose()
			rShaderManager.current = null
		}
	}, [editor, config])

	const pixelate = config.pixelate ?? DEFAULT_CONFIG.pixelate
	const canvasClassName = `shader-canvas${pixelate ? ' shader-canvas-pixelated' : ''}`

	return <canvas ref={rCanvas} className={canvasClassName} />
})
