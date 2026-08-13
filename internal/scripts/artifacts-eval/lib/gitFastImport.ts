import { spawn } from 'child_process'
import { execFile } from 'child_process'
import { mkdirSync } from 'fs'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function execGit(args: string[], cwd: string): Promise<string> {
	const { stdout } = await execFileAsync('git', args, {
		cwd,
		maxBuffer: 1024 * 1024 * 256,
	})
	return stdout.trim()
}

/** Run git and return stderr too (push progress goes to stderr). */
export async function execGitFull(
	args: string[],
	cwd: string
): Promise<{ stdout: string; stderr: string }> {
	const { stdout, stderr } = await execFileAsync('git', args, {
		cwd,
		maxBuffer: 1024 * 1024 * 256,
	})
	return { stdout, stderr }
}

export async function initRepo(dir: string) {
	mkdirSync(dir, { recursive: true })
	await execGit(['init', '--quiet', '-b', 'main'], dir)
	// Deterministic, minimal repos: no gpg, no hooks surprises.
	await execGit(['config', 'commit.gpgsign', 'false'], dir)
	await execGit(['config', 'gc.auto', '0'], dir)
}

export interface FastImportCommit {
	/** ISO timestamp; used for author/committer date and the commit message. */
	timestamp: string
	files: Array<{ path: string; content: Buffer | string }>
	deletes: string[]
}

const AUTHOR = 'tldraw-eval <eval@tldraw.com>'

/**
 * Streams commits into `git fast-import`. Commits go onto refs/heads/main sequentially;
 * fast-import continues from the branch tip automatically, so no `from` bookkeeping is needed
 * after the first commit.
 */
export class FastImportWriter {
	private proc
	private stdinErr: Error | null = null

	constructor(private dir: string) {
		this.proc = spawn('git', ['fast-import', '--quiet'], {
			cwd: dir,
			stdio: ['pipe', 'inherit', 'inherit'],
		})
		this.proc.stdin.on('error', (err) => {
			this.stdinErr = err
		})
	}

	private async write(data: Buffer | string) {
		if (this.stdinErr) throw this.stdinErr
		const buf = typeof data === 'string' ? Buffer.from(data) : data
		if (!this.proc.stdin.write(buf)) {
			await new Promise<void>((resolve) => this.proc.stdin.once('drain', resolve))
		}
	}

	async commit({ timestamp, files, deletes }: FastImportCommit) {
		const unixTime = Math.floor(new Date(timestamp).getTime() / 1000)
		const message = `Snapshot at ${timestamp}`
		let head = `commit refs/heads/main\n`
		head += `author ${AUTHOR} ${unixTime} +0000\n`
		head += `committer ${AUTHOR} ${unixTime} +0000\n`
		head += `data ${Buffer.byteLength(message)}\n${message}\n`
		await this.write(head)
		for (const path of deletes) {
			await this.write(`D ${path}\n`)
		}
		for (const file of files) {
			const content = typeof file.content === 'string' ? Buffer.from(file.content) : file.content
			await this.write(`M 100644 inline ${file.path}\ndata ${content.length}\n`)
			await this.write(content)
			await this.write('\n')
		}
		await this.write('\n')
	}

	async finish(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			this.proc.on('close', (code) => {
				if (code === 0) resolve()
				else reject(new Error(`git fast-import exited with code ${code} in ${this.dir}`))
			})
			this.proc.stdin.end()
		})
	}
}

/** Total bytes of all objects (packed + loose) per `git count-objects -v`, in bytes. */
export async function repoObjectBytes(dir: string): Promise<number> {
	const out = await execGit(['count-objects', '-v'], dir)
	let kib = 0
	for (const line of out.split('\n')) {
		const [key, value] = line.split(': ')
		// `size` and `size-pack` are reported in KiB.
		if (key === 'size' || key === 'size-pack') kib += parseInt(value, 10)
	}
	return kib * 1024
}

export async function gcAggressive(dir: string) {
	await execGit(['gc', '--aggressive', '--prune=now', '--quiet'], dir)
}

export async function commitCount(dir: string): Promise<number> {
	return parseInt(await execGit(['rev-list', '--count', 'main'], dir), 10)
}
