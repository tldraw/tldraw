import { useEditor, useValue } from 'tldraw'

import { memo, useLayoutEffect, useRef } from 'react'
import { ParticlePhysicsManager } from './ParticlePhysicsManager'
import { particleConfig } from './config'

/**
 * React component that renders the GPU particle physics simulation.
 * Creates a WebGL canvas overlay that displays thousands of particles
 * with physics simulation, gravity, and collision detection.
 */
export const ParticlePhysicsRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rManager = useRef<ParticlePhysicsManager | null>(null)
	const config = useValue('config', () => particleConfig.get(), [])

	// Initialize manager
	useLayoutEffect(() => {
		const canvas = rCanvas.current!

		try {
			const manager = new ParticlePhysicsManager(editor, canvas)
			rManager.current = manager

			// Set initial canvas size
			manager.resize()

			// Listen for window resize
			const handleResize = () => manager.resize()
			window.addEventListener('resize', handleResize)

			return () => {
				window.removeEventListener('resize', handleResize)
				manager.dispose()
				rManager.current = null
			}
		} catch (error) {
			console.error('Failed to initialize ParticlePhysicsManager:', error)
		}
	}, [editor])

	const pixelate = config.pixelate
	const canvasClassName = `shader-canvas${pixelate ? ' shader-canvas-pixelated' : ''}`

	return <canvas ref={rCanvas} className={canvasClassName} />
})
