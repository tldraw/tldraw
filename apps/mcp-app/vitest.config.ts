import { defineConfig } from 'vitest/config'

// The vite config sets `root: 'src/widget'` for the singlefile widget build,
// which would scope test discovery to the widget directory. Tests live across
// `src/`, so give vitest its own config.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
	},
})
