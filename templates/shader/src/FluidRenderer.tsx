import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor, useIsDarkMode } from 'tldraw'
import { FluidManager, FluidManagerConfig } from './FluidManager'

export const FluidRenderer = memo(({ config = {} }: { config?: Partial<FluidManagerConfig> }) => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rFluidManager = useRef<FluidManager | null>(null)
	const darkMode = useIsDarkMode()

	// Initialize FluidManager
	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new FluidManager(canvas, editor, config)
		rFluidManager.current = manager

		manager.initialize(darkMode)

		return () => {
			manager.dispose()
			rFluidManager.current = null
		}
	}, [darkMode, editor, config])

	return (
		<canvas
			ref={rCanvas}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: 1000,
			}}
		/>
	)
})
