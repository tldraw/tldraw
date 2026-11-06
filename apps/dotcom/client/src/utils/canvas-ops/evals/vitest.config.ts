import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Separate from the app's vitest config so the evals, which call a model and cost money, never
// run with the unit tests. `pnpm canvas-ops-evals` from apps/dotcom/client.
export default defineConfig({
	root: fileURLToPath(new URL('../../../..', import.meta.url)),
	test: {
		environment: 'jsdom',
		setupFiles: ['./setupTests.js'],
		globals: true,
		include: ['src/utils/canvas-ops/evals/*.eval.ts'],
		testTimeout: 15 * 60_000,
	},
})
