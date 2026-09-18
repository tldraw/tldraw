import { glob } from 'glob'
import { defineConfig } from 'vitest/config'

// pnpm links workspace packages into their dependents' node_modules, so without the ignore
// every package's config is found once per dependent.
const vitestPackages = glob.sync('{apps,packages}/**/vitest.config.ts', {
	ignore: '**/node_modules/**',
})

export default defineConfig({
	test: { projects: vitestPackages },
})
