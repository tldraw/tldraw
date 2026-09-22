import { glob } from 'glob'
import { defineConfig } from 'vitest/config'

// Package managers that link workspace packages into their dependents' node_modules (pnpm)
// would otherwise surface every package's config once per dependent.
const vitestPackages = glob.sync('{apps,packages}/**/vitest.config.ts', {
	ignore: '**/node_modules/**',
})

export default defineConfig({
	test: { projects: vitestPackages },
})
