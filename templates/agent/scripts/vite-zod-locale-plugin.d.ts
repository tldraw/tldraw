import type { Plugin } from 'vite'

/**
 * Vite plugin to replace zod locale imports with a minimal shim
 * @param shimPath - Absolute path to the shim file (use fileURLToPath(new URL('./path', import.meta.url)))
 */
export function zodLocalePlugin(shimPath: string): Plugin
