import { DefaultStylePanel, Tldraw, useEditor } from 'tldraw'
import { ConfigPanel } from '../fluid-example/ConfigPanel'

import { memo, useLayoutEffect, useRef } from 'react'
import { SmokeManager } from './SmokeManager'

export const SmokeRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rSmokeManager = useRef<SmokeManager | null>(null)

	// Initialize SmokeManager
	useLayoutEffect(() => {
		const canvas = rCanvas.current!

		// Set initial canvas size before creating WebGL context
		const container = canvas.parentElement
		if (container) {
			const { width, height } = container.getBoundingClientRect()
			canvas.width = width
			canvas.height = height
		}

		const manager = new SmokeManager(editor, canvas)
		rSmokeManager.current = manager

		// Handle canvas resize
		function handleResize() {
			const container = canvas.parentElement
			if (container) {
				const { width, height } = container.getBoundingClientRect()
				// Only resize if dimensions actually changed
				if (canvas.width !== width || canvas.height !== height) {
					manager.resize(width, height)
				}
			}
		}

		// Listen for window resize
		window.addEventListener('resize', handleResize)

		// Listen for editor viewport changes
		const disposeViewportListener = editor.sideEffects.registerBeforeChangeHandler(
			'camera',
			(_, next) => {
				manager.refresh()
				return next
			}
		)

		return () => {
			window.removeEventListener('resize', handleResize)
			disposeViewportListener()
			manager.dispose()
			rSmokeManager.current = null
		}
	}, [editor])

	return <canvas ref={rCanvas} className="shader-canvas" />
})

export function SmokeExample() {
	return (
		<Tldraw
			persistenceKey="shader"
			components={{
				Background: SmokeRenderer,
				StylePanel: () => {
					return (
						<div style={{ display: 'flex', flexDirection: 'row' }}>
							<ConfigPanel />
							<DefaultStylePanel />
						</div>
					)
				},
			}}
		/>
	)
}
