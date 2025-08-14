import { existsSync } from 'fs'
import { join } from 'path'
import { defineWorkspace } from 'vitest/config'
import { getAllWorkspacePackages } from './internal/scripts/lib/workspace'

const packages = await getAllWorkspacePackages()

const vitestPackages: string[] = []
for (const pkg of packages) {
	if (existsSync(join(pkg.path, 'vitest.config.ts'))) {
		vitestPackages.push(join(pkg.relativePath, 'vitest.config.ts'))
	}
}

// Vitest workspace configuration
// This allows running tests across the entire monorepo from the root
export default defineWorkspace(vitestPackages)
