import { useEditor, useValue } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { ShadowCastingShaderManager } from './ShadowCastingShaderManager'
import { DEFAULT_CONFIG, shaderConfig } from './config'

export const ShadowCastingRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<ShadowCastingShaderManager | null>(null)
	const rLastMousePos = useRef<{ clientX: number; clientY: number } | null>(null)
	const config = useValue('config', () => shaderConfig.get(), [])

	// Initialize manager - recreate when config changes (especially quality)
	useLayoutEffect(() => {
		const canvas = rCanvas.current!

		// Get quality and shadowContrast from config
		const quality = config.quality ?? DEFAULT_CONFIG.quality
		const shadowContrast = config.shadowContrast ?? DEFAULT_CONFIG.shadowContrast

		const manager = new ShadowCastingShaderManager(editor, canvas, quality, shadowContrast)
		rShaderManager.current = manager

		// Set initial canvas size with quality applied
		manager.resize()

		// Refresh geometries after resize to ensure correct scaling
		manager.refresh()

		// Update light position with new quality if we have a previous mouse position
		if (rLastMousePos.current) {
			const rect = canvas.getBoundingClientRect()
			const x = (rLastMousePos.current.clientX - rect.left) * quality
			const y = canvas.height - (rLastMousePos.current.clientY - rect.top) * quality
			manager.setLightPosition(x, y)
		}

		// Track cursor position and update light
		const handleMouseMove = (e: MouseEvent) => {
			// Store last mouse position
			rLastMousePos.current = { clientX: e.clientX, clientY: e.clientY }

			const rect = canvas.getBoundingClientRect()
			// Convert screen coordinates to canvas coordinates (scaled by quality)
			const x = (e.clientX - rect.left) * quality
			// Flip Y coordinate (canvas Y=0 is at top, shader Y=0 is at bottom)
			const y = canvas.height - (e.clientY - rect.top) * quality
			manager.setLightPosition(x, y)
		}

		// Listen for window resize
		window.addEventListener('resize', manager.resize)
		window.addEventListener('mousemove', handleMouseMove)

		return () => {
			window.removeEventListener('resize', manager.resize)
			window.removeEventListener('mousemove', handleMouseMove)
			manager.dispose()
			rShaderManager.current = null
		}
	}, [editor, config])

	const pixelate = config.pixelate ?? DEFAULT_CONFIG.pixelate
	const canvasClassName = `shader-canvas${pixelate ? ' shader-canvas-pixelated' : ''}`

	return <canvas ref={rCanvas} className={canvasClassName} />
})
