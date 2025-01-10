/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types');

/**
 * Enforces consistent dependencies across the project.
 * Updates non-peer dependencies to use the same version range.
 * Removes the `packageManager` field from all workspaces except the root.
 *
 * @param {import('@yarnpkg/types').Context} context - The Yarn project context.
 */
function enforceConsistentDependenciesAcrossTheProject({ Yarn }) {
  // Ensure consistency for dependencies
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === 'peerDependencies') continue;

    for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
      if (otherDependency.type === 'peerDependencies') continue;

      // Update the dependency range to match across workspaces
      dependency.update(otherDependency.range);
    }
  }

  // Remove `packageManager` field for all workspaces except the root
  for (const workspace of Yarn.workspaces()) {
    if (workspace.cwd === '.') continue;

    workspace.set('packageManager', undefined);
  }
}

module.exports = defineConfig({
  constraints: async (ctx) => {
    enforceConsistentDependenciesAcrossTheProject(ctx);
  },
});
