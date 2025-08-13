import { defineWorkspace } from 'vitest/config'

// Vitest workspace configuration
// This allows running tests across the entire monorepo from the root
export default defineWorkspace([
	// Include all packages that have vitest.config.ts files
	'packages/utils/vitest.config.ts',
	'packages/validate/vitest.config.ts',
	'packages/state/vitest.config.ts',
	'packages/state-react/vitest.config.ts',
	'packages/store/vitest.config.ts',
	'packages/ai/vitest.config.ts',
	// Add more packages here as they're migrated
])
