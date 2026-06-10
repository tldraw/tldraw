import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	// vite 8 / vitest 4 transform with oxc and ignore the deprecated `esbuild.jsx`
	// option, and this app's tsconfig uses `jsx: preserve` for its real build. Use
	// the react plugin so JSX in `.tsx` files is transformed for tests.
	//
	// `@vitejs/plugin-react` is typed against the root (rolldown) vite, whose
	// `PluginContextMeta` differs from the vite that vitest/config bundles, so the
	// plugin type is structurally incompatible here. Cast to sidestep the skew.
	plugins: [react() as any],
	test: {
		environment: 'jsdom',
		setupFiles: ['./setupTests.js'],
		globals: true,
		testTimeout: 30000,
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		exclude: ['**/e2e/**'],
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
