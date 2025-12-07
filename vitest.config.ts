import glob from 'glob'
import { defineConfig } from 'vitest/config'

const vitestPackages = glob.sync('./{apps,packages}/**/vitest.config.ts')

export default defineConfig({
	test: { projects: vitestPackages },
})
