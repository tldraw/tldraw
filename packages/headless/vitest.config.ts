/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

// Deliberately a plain node environment with no setup files: this package exists to run the
// editor without a DOM, and a test-runner-provided DOM (jsdom, happy-dom) would hide exactly
// the failures these tests are meant to catch.
export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}', 'examples/**/*.{test,spec}.{js,ts}'],
		exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**', '**/.tsbuild*/**'],
	},
})
