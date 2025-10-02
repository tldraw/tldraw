import { DefaultStylePanel, Tldraw, useEditor } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { ShaderManager } from './ShaderManager'
import { DEFAULT_CONFIG, shaderConfig } from './config'

export const SmokeRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rSmokeManager = useRef<ShaderManager | null>(null)

	// Initialize SmokeManager
	useLayoutEffect(() => {
		const canvas = rCanvas.current!

		// Get quality from config
		const config = shaderConfig.get()
		const quality = config.quality ?? DEFAULT_CONFIG.quality

		const manager = new ShaderManager(editor, canvas, quality)
		rSmokeManager.current = manager

		// Set initial canvas size with quality applied
		manager.resize()

		// Listen for window resize
		window.addEventListener('resize', manager.resize)

		return () => {
			window.removeEventListener('resize', manager.resize)
			manager.dispose()
			rSmokeManager.current = null
		}
	}, [editor])

	return <canvas ref={rCanvas} className="shader-canvas shader-canvas-pixelated" />
})

export function HackableExample() {
	return (
		<Tldraw
			persistenceKey="shader"
			components={{
				Background: SmokeRenderer,
				StylePanel: () => {
					return (
						<div style={{ display: 'flex', flexDirection: 'row' }}>
							<DefaultStylePanel />
						</div>
					)
				},
			}}
		/>
	)
}
