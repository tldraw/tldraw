import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { exec } from '../../../scripts/lib/exec'
import { Queue } from './Queue'
import { APP_USER_EMAIL, APP_USER_NAME, TLDRAW_ORG, TLDRAW_PUBLIC_REPO } from './config'

const globalGitQueue = new Queue()

const repos = {
	public: {
		org: TLDRAW_ORG,
		name: TLDRAW_PUBLIC_REPO,
		path: 'tldraw-public',
		queue: new Queue(),
	},
} as const

export function prefixOutput(prefix: string) {
	return {
		processStdoutLine: (line: string) => process.stdout.write(`${prefix}${line}\n`),
		processStderrLine: (line: string) => process.stderr.write(`${prefix}${line}\n`),
	}
}

export function createGit(pwd: string) {
	const git = async (command: string, ...args: (string | null)[]) =>
		exec('git', [command, ...args], { pwd, ...prefixOutput(`[git ${command}] `) })

	git.trimmed = async (command: string, ...args: (string | null)[]) =>
		(await git(command, ...args)).trim()

	git.lines = async (command: string, ...args: (string | null)[]) =>
		(await git(command, ...args)).trim().split('\n')

	git.cd = (dir: string) => createGit(path.join(pwd, dir))

	return git
}

export type Git = ReturnType<typeof createGit>

export async function getPersistentDataPath() {
	try {
		await fs.writeFile('/tldraw_repo_sync_data/check', 'ok')
		return '/tldraw_repo_sync_data'
	} catch {
		const tempPersistent = path.join(os.tmpdir(), 'tldraw_repo_sync_data')
		await fs.mkdir(tempPersistent, { recursive: true })
		return tempPersistent
	}
}

async function initBaseRepo(repoKey: keyof typeof repos, installationToken: string) {
	const repo = repos[repoKey]

	const persistentDataPath = await getPersistentDataPath()
	const repoPath = path.join(persistentDataPath, repo.path)

	try {
		await fs.rm(repoPath, { recursive: true, force: true })
	} catch {
		// dw
	}

	const repoUrl = `https://x-access-token:${installationToken}@github.com/${repo.org}/${repo.name}.git`
	await globalGitQueue.enqueue(() => exec('git', ['clone', '--mirror', repoUrl, repoPath]))
}

export async function getBaseRepo(repoKey: keyof typeof repos, installationToken: string) {
	const repo = repos[repoKey]

	return await repo.queue.enqueue(async () => {
		const persistentDataPath = await getPersistentDataPath()
		const repoPath = path.join(persistentDataPath, repo.path)
		const git = createGit(repoPath)

		try {
			await fs.readFile(path.join(repoPath, 'HEAD'))
		} catch {
			await initBaseRepo(repoKey, installationToken)
			return { repo, path: repoPath }
		}

		const remote = await git.trimmed('remote', 'get-url', 'origin')
		if (!remote.endsWith(`@github.com/${repo.org}/${repo.name}.git`)) {
			await initBaseRepo(repoKey, installationToken)
			return { repo, path: repoPath }
		}

		// update remote with a fresh JWT:
		await git(
			'remote',
			'set-url',
			'origin',
			`https://x-access-token:${installationToken}@github.com/${repo.org}/${repo.name}.git`
		)

		// make sure we're up to date with origin:
		await git('remote', 'update')

		return { repo, path: repoPath }
	})
}

export async function withWorkingRepo<T>(
	repoKey: keyof typeof repos,
	installationToken: string,
	ref: string,
	fn: (opts: { repoPath: string; git: Git }) => Promise<T>
) {
	const { repo, path: repoPath } = await getBaseRepo(repoKey, installationToken)
	const workingDir = path.join(
		os.tmpdir(),
		`tldraw_repo_sync_${Math.random().toString(36).slice(2)}`
	)

	await globalGitQueue.enqueue(() => exec('git', ['clone', '--no-checkout', repoPath, workingDir]))
	const git = createGit(workingDir)

	try {
		// update remote with a fresh JWT:
		await git(
			'remote',
			'set-url',
			'origin',
			`https://x-access-token:${installationToken}@github.com/${repo.org}/${repo.name}.git`
		)

		await git('checkout', ref)
		await setLocalAuthorInfo(workingDir)

		return await fn({ repoPath: workingDir, git })
	} finally {
		await fs.rm(workingDir, { recursive: true })
	}
}

export async function setLocalAuthorInfo(pwd: string) {
	const git = createGit(pwd)
	await git('config', '--local', 'user.name', APP_USER_NAME)
	await git('config', '--local', 'user.email', APP_USER_EMAIL)
}
