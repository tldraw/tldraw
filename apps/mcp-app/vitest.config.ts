import { defineConfig } from 'vitest/config'

// The vite config sets `root: 'src/widget'` for the singlefile widget build,
// which would scope test discovery to the widget directory. Tests live across
// `src/`, so give vitest its own config.
export default defineConfig({
	test: {
		fsModuleCache: true,
		include: ['src/**/*.test.ts'],
		// Two files boot their own `wrangler dev` and write/remove dist/ fixtures; in
		// parallel they race on those files and one of them reads the other's stub.
		fileParallelism: false,
		// fileParallelism pins this project to one worker. A normal run tolerates that, but
		// `vitest doctor` errors on projects that share a group order with differing worker
		// counts, so give this one its own. Measured to cost nothing on a full run.
		sequence: { groupOrder: 1 },
	},
})
