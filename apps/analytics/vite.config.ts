import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react()],
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
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
			},
		},
	},
})
