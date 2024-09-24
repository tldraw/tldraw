import glob from 'glob'
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

async function getChildWorkspaces(parent: Package): Promise<Package[]> {
	if (!parent.packageJson.workspaces) return []

	const foundPackages = []
	for (const workspace of parent.packageJson.workspaces) {
		const workspacePath = path.join(parent.path, workspace)
		for (const packageJsonFilePath of glob.sync(path.join(workspacePath, 'package.json'))) {
			const child = await readPackage(packageJsonFilePath)
			foundPackages.push(child)
			if (child.packageJson.workspaces) {
				foundPackages.push(...(await getChildWorkspaces(child)))
			}
		}
	}

	return foundPackages
}

export async function getAllWorkspacePackages() {
	const rootWorkspace = await readPackage(path.join(REPO_ROOT, 'package.json'))
	return await getChildWorkspaces(rootWorkspace)
}
