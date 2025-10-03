import { atom, react } from 'tldraw'
import { WebGLManagerConfig } from '../WebGLManager'

export interface ShaderManagerConfig extends WebGLManagerConfig {
	quality: number // or whatever
}

export const DEFAULT_CONFIG: ShaderManagerConfig = {
	quality: 0.5,
	pixelate: true,
	startPaused: false,
}

const STORAGE_KEY = 'shader-minimal-config-1'

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

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shaderConfig.get()))
})
