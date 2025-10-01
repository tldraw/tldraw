import { atom, react } from 'tldraw'
import { DEFAULT_CONFIG, FluidManagerConfig } from './FluidManager'

const STORAGE_KEY = 'shader-fluid-config-1'

let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = JSON.parse(value)
} catch {
	// noop
}

export const fluidConfig = atom<Partial<FluidManagerConfig>>('fluid-config', initialValue)

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(fluidConfig.get()))
})
