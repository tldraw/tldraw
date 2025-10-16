import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin to replace zod locale imports with our minimal shim
 * This catches both direct imports and re-exports within the zod package
 * @param {string} shimPath - Path to the shim file
 * @returns {import('vite').Plugin}
 */
export function zodLocalePlugin(shimPath) {
	const resolvedShimPath = path.resolve(__dirname, shimPath)
	
	return {
		name: 'zod-locale-replacer',
		enforce: 'pre', // Run before other plugins
		
		resolveId(source, importer) {
			// Catch absolute imports to zod locales
			if (source === 'zod/v4/locales/index.js' || source === 'zod/v4/locales/index.cjs') {
				return resolvedShimPath
			}
			
			// Catch relative imports within zod package
			if (importer && importer.includes('node_modules/zod') && 
			    (source.includes('../locales/index.js') || source.includes('../locales/index.cjs'))) {
				return resolvedShimPath
			}
			
			return null // Let other resolvers handle it
		}
	}
}

