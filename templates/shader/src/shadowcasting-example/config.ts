import { atom, react } from 'tldraw'

export interface ShaderManagerConfig {
	quality: number
	shadowContrast: number
	pixelate: boolean
}

export const DEFAULT_CONFIG = {
	quality: 0.5,
	shadowContrast: 0.08,
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

export const shaderConfig = atom<Partial<ShaderManagerConfig>>('shader-config', initialValue)

export function resetShaderConfig() {
	shaderConfig.set(DEFAULT_CONFIG)
}

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shaderConfig.get()))
})
