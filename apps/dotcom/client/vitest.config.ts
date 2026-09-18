import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	// vite 8 / vitest 4 transform with oxc and ignore the deprecated `esbuild.jsx`
	// option, and this app's tsconfig uses `jsx: preserve` for its real build. Use
	// the react plugin so JSX in `.tsx` files is transformed for tests.
	plugins: [react()],
	test: {
		fsModuleCache: true,
		pool: 'threads',
		environment: 'jsdom',
		setupFiles: ['./setupTests.js'],
		globals: true,
		testTimeout: 30000,
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		// Extend rather than replace the defaults: `node_modules` here holds symlinks to every
		// workspace package, so dropping `**/node_modules/**` runs their tests too.
		exclude: [...configDefaults.exclude, '**/e2e/**'],
	},
	resolve: {
		alias: {
			'\\.(css|less)$': 'identity-obj-proxy',
		},
	},
	ssr: {
		noExternal: ['@tiptap/react'],
	},
})
