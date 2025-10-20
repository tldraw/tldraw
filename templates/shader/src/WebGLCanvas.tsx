import { forwardRef } from 'react'
import { Atom, useValue } from 'tldraw'
import { WebGLManagerConfig } from './WebGLManager'

export const WebGLCanvas = forwardRef<
	HTMLCanvasElement,
	{ config: Atom<WebGLManagerConfig, unknown> }
>(({ config }, ref) => {
	const isPixelated = useValue('config', () => config.get().pixelate, [])
	const canvasClassName = `shader-app__canvas${isPixelated ? ' shader-app__canvas--pixelated' : ''}`
	return <canvas ref={ref} className={canvasClassName} />
})
