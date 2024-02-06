/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`)

/**
 * @param {Context} context
 */
function enforceConsistentDependenciesAcrossTheProject({ Yarn }) {
	for (const dependency of Yarn.dependencies()) {
		if (dependency.type === 'peerDependencies') continue

		for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
			if (otherDependency.type === 'peerDependencies') continue

			dependency.update(otherDependency.range)
		}
	}

	for (const workspace of Yarn.workspaces()) {
		if (workspace.cwd === '.') continue

		workspace.set('packageManager', undefined)
	}
}

module.exports = defineConfig({
	constraints: async (ctx) => {
		enforceConsistentDependenciesAcrossTheProject(ctx)
	},
})
