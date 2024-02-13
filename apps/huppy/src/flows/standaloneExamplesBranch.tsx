import { assert } from '@tldraw/utils'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Flow } from '../flow'
import { withWorkingRepo } from '../repo'
import { readJsonIfExists } from '../utils'

const filesToCopyFromRoot = ['.gitignore', '.prettierrc', 'LICENSE.md']
const packageDepsToSyncFromRoot = ['typescript', '@types/react', '@types/react-dom']

export const standaloneExamplesBranch = {
	name: 'standaloneExamplesBranch',

	onCustomHook: async (ctx, event) => {
		await withWorkingRepo(
			'public',
			ctx.installationToken,
			event.tagToRelease,
			async ({ git, repoPath }) => {
				const standaloneExamplesWorkDir = path.join(repoPath, '.git', 'standalone-examples')

				const currentCommitHash = await git.trimmed('rev-parse', 'HEAD')
				const branchName = `standalone-examples-${currentCommitHash}`
				await git('checkout', '-b', branchName)

				// copy examples into new folder
				console.log('Copying examples into new folder...')
				for (const file of await git.lines('ls-files', 'apps/examples')) {
					const relativePath = path.relative('apps/examples', file)
					await fs.mkdir(path.join(standaloneExamplesWorkDir, path.dirname(relativePath)), {
						recursive: true,
					})
					await fs.copyFile(
						path.join(repoPath, file),
						path.join(standaloneExamplesWorkDir, relativePath)
					)
				}

				for (const file of filesToCopyFromRoot) {
					await fs.copyFile(path.join(repoPath, file), path.join(standaloneExamplesWorkDir, file))
				}

				console.log('Creation tsconfig.json...')
				const tsconfig = await readJsonIfExists(path.join(repoPath, 'config/tsconfig.base.json'))
				tsconfig.includes = ['src']
				await fs.writeFile(
					path.join(standaloneExamplesWorkDir, 'tsconfig.json'),
					JSON.stringify(tsconfig, null, '\t')
				)

				console.log('Creation package.json...')
				const rootPackageJson = await readJsonIfExists(path.join(repoPath, 'package.json'))
				const examplesPackageJson = await readJsonIfExists(
					path.join(standaloneExamplesWorkDir, 'package.json')
				)

				for (const dep of packageDepsToSyncFromRoot) {
					examplesPackageJson.dependencies[dep] = rootPackageJson.dependencies[dep]
				}

				for (const name of Object.keys(
					examplesPackageJson.dependencies as Record<string, string>
				)) {
					if (!name.startsWith('@tldraw/')) continue
					const packageJsonFile = await readJsonIfExists(
						path.join(repoPath, 'packages', name.replace('@tldraw/', ''), 'package.json')
					)
					assert(packageJsonFile, `package.json for ${name} must exist`)
					if (event.canary) {
						const baseVersion = packageJsonFile.version.replace(/-.*$/, '')
						const canaryTag = `canary.${currentCommitHash.slice(0, 12)}`
						examplesPackageJson.dependencies[name] = `${baseVersion}-${canaryTag}`
					} else {
						examplesPackageJson.dependencies[name] = packageJsonFile.version
					}
				}

				await fs.writeFile(
					path.join(standaloneExamplesWorkDir, 'package.json'),
					JSON.stringify(examplesPackageJson, null, '\t')
				)

				console.log('Deleting existing repo contents...')
				for (const file of await fs.readdir(repoPath)) {
					if (file === '.git') continue
					await fs.rm(path.join(repoPath, file), { recursive: true, force: true })
				}

				console.log('Moving new repo contents into place...')
				for (const file of await fs.readdir(standaloneExamplesWorkDir)) {
					await fs.rename(path.join(standaloneExamplesWorkDir, file), path.join(repoPath, file))
				}

				await fs.rm(standaloneExamplesWorkDir, { recursive: true, force: true })

				console.log('Committing & pushing changes...')
				await git('add', '-A')
				await git(
					'commit',
					'-m',
					`[automated] Update standalone examples from ${event.tagToRelease}`
				)
				await git('push', '--force', 'origin', `${branchName}:examples`)
			}
		)
	},
} satisfies Flow<{ tagToRelease: string; canary: boolean }>
