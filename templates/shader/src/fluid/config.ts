import { atom, react } from 'tldraw'
import { DEFAULT_CONFIG, FluidManagerConfig } from './FluidManager'

/** Storage key for persisting fluid configuration in localStorage */
const STORAGE_KEY = 'shader-fluid-config-1'

let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = JSON.parse(value)
} catch {
	// noop
}

/**
 * Reactive atom containing the fluid simulation configuration.
 * Changes to this atom are automatically persisted to localStorage.
 */
export const fluidConfig = atom<FluidManagerConfig>('fluid-config', initialValue)

/**
 * Resets the fluid configuration to default values.
 */
export function resetFluidConfig() {
	fluidConfig.set(DEFAULT_CONFIG)
}

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(fluidConfig.get()))
})
