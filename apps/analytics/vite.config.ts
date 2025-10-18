import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [],
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
	build: {
		outDir: 'public',
		lib: {
			entry: 'src/index.ts',
			name: 'TLAnalytics',
			fileName: () => `tl-analytics.js`,
			formats: ['umd'],
		},
		rollupOptions: {
			// React and ReactDOM are now bundled instead of external
		},
	},
})
