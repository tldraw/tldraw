declare module 'lazyrepo/src/project/Project' {
	export type Workspace = import('lazyrepo/src/project/project-types').Workspace
	export class Project {
		root: Workspace
		workspacesByName: ReadonlyMap<string, Workspace>
		workspacesByDir: ReadonlyMap<string, Workspace>
		packageManager: 'npm' | 'yarn' | 'pnpm'

		static fromCwd(cwd: string): Project
	}
}
