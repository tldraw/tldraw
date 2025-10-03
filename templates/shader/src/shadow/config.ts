import { atom, react } from 'tldraw'
import { WebGLManagerConfig } from '../WebGLManager'

export interface ShaderManagerConfig extends WebGLManagerConfig {
	shadowContrast: number
}

export const DEFAULT_CONFIG: ShaderManagerConfig = {
	startPaused: true,
	quality: 0.5,
	shadowContrast: 0.5,
	pixelate: true,
}

const STORAGE_KEY = 'shader-shadowcasting-config-1'

let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = JSON.parse(value)
} catch {
	// noop
}

export const shaderConfig = atom<ShaderManagerConfig>('shader-config', initialValue)

export function resetShaderConfig() {
	shaderConfig.set(DEFAULT_CONFIG)
}

react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shaderConfig.get()))
})
