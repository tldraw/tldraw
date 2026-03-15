/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
		browser: {
			enabled: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
})
