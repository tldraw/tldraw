import { atom, react } from 'tldraw'

/**
 * Configuration interface for the particle physics shader.
 */
export interface ParticleConfig {
	/** Number of particles (squared - 128 = 16,384 particles) */
	particleCount: number
	/** Size of each particle point sprite */
	particleSize: number
	/** Gravity strength */
	gravity: number
	/** Bounce damping factor (0-1) */
	damping: number
	/** Enable pixelated rendering style */
	pixelate: boolean
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: ParticleConfig = {
	particleCount: 128, // 128x128 = 16,384 particles
	particleSize: 2,
	gravity: 0.5,
	damping: 0.8,
	pixelate: true,
}

/** Storage key for persisting configuration in localStorage */
const STORAGE_KEY = 'shader-particle-config-1'

let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = { ...DEFAULT_CONFIG, ...JSON.parse(value) }
} catch {
	// noop
}

/**
 * Reactive atom containing the particle configuration.
 * Changes to this atom are automatically persisted to localStorage.
 */
export const particleConfig = atom<ParticleConfig>('particle-config', initialValue)

/**
 * Resets the particle configuration to default values.
 */
export function resetParticleConfig() {
	particleConfig.set(DEFAULT_CONFIG)
}

// When the config changes, save it to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(particleConfig.get()))
})
