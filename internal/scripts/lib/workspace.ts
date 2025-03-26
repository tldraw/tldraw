import { Project } from 'lazyrepo/src/project/Project'
import path from 'path'
import { REPO_ROOT, readJsonIfExists } from './file'

export type PackageJson = { name: string; private?: boolean; workspaces?: string[] } & Record<
	string,
	any
>
export interface Package {
	packageJson: PackageJson
	relativePath: string
	path: string
	name: string
}

async function readPackage(packageJsonFile: string): Promise<Package> {
	const packageJsonPath = path.resolve(packageJsonFile)
	const packageJson = await readJsonIfExists(packageJsonFile)
	if (!packageJson) {
		throw new Error(`No package.json found at ${packageJsonPath}`)
	}

	const packagePath = path.dirname(packageJsonPath)

	return {
		packageJson,
		relativePath: path.relative(REPO_ROOT, packagePath),
		path: packagePath,
		name: packageJson.name,
	}
}

export async function getAllWorkspacePackages() {
	const project = Project.fromCwd(REPO_ROOT)
	const packages = []
	for (const workspace of project.workspacesByDir.keys()) {
		if (workspace === project.root.dir) continue
		packages.push(await readPackage(path.join(workspace, 'package.json')))
	}
	return packages
}
