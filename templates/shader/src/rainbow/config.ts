import { atom, react } from 'tldraw'
import { WebGLManagerConfig } from '../WebGLManager'

/**
 * Configuration interface for the rainbow shader manager.
 */
export interface ShaderManagerConfig extends WebGLManagerConfig {
	/** Radius of the rainbow effect around shape segments (in pixels) */
	radius: number
}

/**
 * Default configuration values for the shader.
 */
export const DEFAULT_CONFIG: ShaderManagerConfig = {
	startPaused: true,
	quality: 0.5,
	radius: 500,
	pixelate: true,
}

/** Storage key for persisting shader configuration in localStorage */
const STORAGE_KEY = 'shader-rainbow-config-1'

let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = JSON.parse(value)
} catch {
	// noop
}

/**
 * Reactive atom containing the shader configuration.
 * Changes to this atom are automatically persisted to localStorage.
 */
export const shaderConfig = atom<ShaderManagerConfig>('shader-config', initialValue)

/**
 * Resets the shader configuration to default values.
 */
export function resetShaderConfig() {
	shaderConfig.set(DEFAULT_CONFIG)
}

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shaderConfig.get()))
})
