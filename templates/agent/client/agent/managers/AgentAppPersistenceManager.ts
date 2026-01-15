import { Atom, react } from 'tldraw'
import { BaseAgentAppManager } from './BaseAgentAppManager'

/**
 * The key prefix used for localStorage persistence.
 */
const STORAGE_PREFIX = 'tldraw-agent-app'

/**
 * Manager for app-level state persistence.
 *
 * Handles loading and saving app-level settings to localStorage.
 * Agent-level persistence (chat history, todos, etc.) is handled
 * by each agent's managers via TldrawAgent.persistValue().
 *
 * This manager coordinates persistence lifecycle and provides
 * a clean interface for future extension (e.g., server-side persistence).
 */
export class AgentAppPersistenceManager extends BaseAgentAppManager {
	/**
	 * Whether we're currently loading state to prevent premature saves.
	 */
	private isLoadingState = false

	/**
	 * Cleanup functions for state watchers.
	 */
	private autoSaveCleanupFns: (() => void)[] = []

	/**
	 * Check if state is currently being loaded.
	 */
	getIsLoadingState(): boolean {
		return this.isLoadingState
	}

	/**
	 * Load app-level state from localStorage.
	 * Call this after the app is initialized.
	 */
	loadState() {
		this.isLoadingState = true

		try {
			// Load model selection
			const modelSelection = this.loadValue<string>('model-selection')
			if (modelSelection) {
				this.app.setModelSelection(modelSelection as any)
			}

			// Load debug flags
			const debugFlags = this.loadValue<{ showContextBounds: boolean }>('debug-flags')
			if (debugFlags) {
				this.app.setDebugFlags(debugFlags)
			}
		} catch (e) {
			console.error('Failed to load app state:', e)
		} finally {
			this.isLoadingState = false
		}
	}

	/**
	 * Start auto-saving app-level state changes.
	 * Call this after loadState() to avoid saving during load.
	 */
	startAutoSave() {
		// Watch model selection
		const cleanupModelSelection = this.watchAndSave('model-selection', () =>
			this.app.getModelSelection()
		)
		this.autoSaveCleanupFns.push(cleanupModelSelection)

		// Watch debug flags
		const cleanupDebugFlags = this.watchAndSave('debug-flags', () => this.app.getDebugFlags())
		this.autoSaveCleanupFns.push(cleanupDebugFlags)
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.autoSaveCleanupFns.forEach((cleanup) => cleanup())
		this.autoSaveCleanupFns = []
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.stopAutoSave()
		this.isLoadingState = false
	}

	/**
	 * Dispose of the persistence manager.
	 */
	override dispose() {
		this.stopAutoSave()
		super.dispose()
	}

	// --- Helper methods ---

	/**
	 * Load a value from localStorage.
	 */
	private loadValue<T>(key: string): T | null {
		const localStorage = globalThis.localStorage
		if (!localStorage) return null

		try {
			const fullKey = `${STORAGE_PREFIX}:${key}`
			const stored = localStorage.getItem(fullKey)
			if (stored) {
				return JSON.parse(stored) as T
			}
		} catch {
			console.warn(`Couldn't load ${key} from localStorage`)
		}

		return null
	}

	/**
	 * Save a value to localStorage.
	 */
	private saveValue<T>(key: string, value: T): void {
		const localStorage = globalThis.localStorage
		if (!localStorage) return

		try {
			const fullKey = `${STORAGE_PREFIX}:${key}`
			localStorage.setItem(fullKey, JSON.stringify(value))
		} catch {
			console.warn(`Couldn't save ${key} to localStorage`)
		}
	}

	/**
	 * Watch a value and save it to localStorage when it changes.
	 * Returns a cleanup function.
	 */
	private watchAndSave<T>(key: string, getValue: () => T): () => void {
		return react(`save ${key} to localStorage`, () => {
			if (this.isLoadingState) return
			this.saveValue(key, getValue())
		})
	}

	/**
	 * Persist an atom's value to localStorage.
	 * Loads the initial value from localStorage and sets up a reaction to save changes.
	 *
	 * @param key - The key to use for localStorage (will be prefixed).
	 * @param $atom - The atom to persist.
	 * @returns A dispose function to stop persistence.
	 */
	persistAtom<T>(key: string, $atom: Atom<T>): () => void {
		const localStorage = globalThis.localStorage
		if (!localStorage) return () => {}

		const fullKey = `${STORAGE_PREFIX}:${key}`

		// Load initial value
		try {
			const stored = localStorage.getItem(fullKey)
			if (stored) {
				const value = JSON.parse(stored) as T
				$atom.set(value)
			}
		} catch {
			console.warn(`Couldn't load ${fullKey} from localStorage`)
		}

		// Watch for changes and save
		return react(`save ${fullKey} to localStorage`, () => {
			if (this.isLoadingState) return
			localStorage.setItem(fullKey, JSON.stringify($atom.get()))
		})
	}
}
