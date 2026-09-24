import { readFileSync } from 'fs'
import path from 'path'
import { glob } from 'glob'
import { REPO_ROOT, readJsonIfExists } from './file'
import { PackageJson } from './types'

export interface Package {
	packageJson: PackageJson
	relativePath: string
	path: string
	name: string
}

async function readPackage(packageJsonFile: string): Promise<Package> {
	const packageJsonPath = path.resolve(packageJsonFile)
	const packagePath = path.dirname(packageJsonPath)
	const relativePath = path.relative(REPO_ROOT, packagePath)

	const packageJsonRaw = await readJsonIfExists(packageJsonFile)
	if (!packageJsonRaw) {
		throw new Error(`No package.json found at ${packageJsonPath}`)
	}

	let packageJson: PackageJson
	try {
		packageJson = PackageJson.validate(packageJsonRaw)
	} catch (e: any) {
		throw new Error(`Invalid package.json in ${relativePath}: ${e.message}`)
	}

	return {
		packageJson,
		relativePath,
		path: packagePath,
		name: packageJson.name,
	}
}

// The `packages:` list in pnpm-workspace.yaml is a flat list of globs, so a regex is enough and
// keeps this script free of a yaml dependency.
function getWorkspaceGlobs() {
	const yaml = readFileSync(path.join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8')
	const list = yaml.match(/^packages:\n((?:\s+-[^\n]*\n)+)/m)
	if (!list) throw new Error('No packages list found in pnpm-workspace.yaml')
	return [...list[1].matchAll(/^\s+-\s*['"]?([^'"\n]+?)['"]?\s*$/gm)].map((m) => m[1])
}

async function getChildWorkspaces(): Promise<Package[]> {
	const foundPackages = []
	for (const workspace of getWorkspaceGlobs()) {
		const workspacePath = path.join(REPO_ROOT, workspace)
		for (const packageJsonFilePath of glob.sync(path.join(workspacePath, 'package.json'))) {
			foundPackages.push(await readPackage(packageJsonFilePath))
		}
	}

	return foundPackages
}

export async function getRootPackage() {
	return await readPackage(path.join(REPO_ROOT, 'package.json'))
}

export async function getAllWorkspacePackages() {
	return await getChildWorkspaces()
}
