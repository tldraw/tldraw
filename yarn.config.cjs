/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`)

/**
 * @param {Context} context
 */
// Templates are independently published starters, and mcp-app's
// extract-editor-api.ts needs the TS 5 compiler API that TS 7 doesn't export,
// so both stay on TypeScript 5 while the rest of the repo is on 7.
function staysOnTypescript5(workspace) {
	return workspace.cwd.startsWith('templates/') || workspace.cwd === 'apps/mcp-app'
}

// Templates take a new Next major on their own schedule — they're starters people copy out of the
// repo — so they stay on Next 15 while the docs site is on 16.
function staysOnNext15(workspace) {
	return workspace.cwd.startsWith('templates/')
}

// Dependencies where some workspaces intentionally sit on an older major than the rest.
function lagsBehindOnPurpose(ident, workspace) {
	if (ident === 'typescript') return staysOnTypescript5(workspace)
	if (ident === 'next') return staysOnNext15(workspace)
	return false
}

function enforceConsistentDependenciesAcrossTheProject({ Yarn }) {
	// check non-peer deps:
	for (const dependency of Yarn.dependencies()) {
		if (dependency.type === 'peerDependencies') continue

		for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
			if (otherDependency.type === 'peerDependencies') continue

			if (
				lagsBehindOnPurpose(dependency.ident, dependency.workspace) !==
				lagsBehindOnPurpose(dependency.ident, otherDependency.workspace)
			) {
				continue
			}

			dependency.update(otherDependency.range)
		}
	}

	// check peer deps:
	for (const dependency of Yarn.dependencies()) {
		if (dependency.type !== 'peerDependencies') continue

		for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
			if (otherDependency.type !== 'peerDependencies') continue

			dependency.update(otherDependency.range)
		}
	}

	for (const workspace of Yarn.workspaces()) {
		if (workspace.cwd === '.') continue

		workspace.set('packageManager', undefined)
	}
}

/**
 * Require a Node version where `require()` of an ES module works natively, so
 * published packages can depend on ESM-only modules without breaking CommonJS
 * consumers. Node 20 is EOL, so we require Node 22.12+, where `require(esm)` is
 * unflagged; earlier versions throw `ERR_REQUIRE_ESM`.
 *
 * @param {Context} context
 */
function enforceNodeEngineOnPackages({ Yarn }) {
	const nodeEngine = '>=22.12.0'
	for (const workspace of Yarn.workspaces()) {
		// only the published library packages under packages/*
		if (!workspace.cwd.startsWith('packages/')) continue
		workspace.set(['engines', 'node'], nodeEngine)
	}
}

module.exports = defineConfig({
	constraints: async (ctx) => {
		enforceConsistentDependenciesAcrossTheProject(ctx)
		enforceNodeEngineOnPackages(ctx)
	},
})
