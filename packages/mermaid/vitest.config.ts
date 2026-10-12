import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		fsModuleCache: true,
		pool: 'threads',
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
	},
})
