import { createHash, Hash } from 'crypto'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { exec } from './exec'

// Every `flyctl deploy` builds a fresh image and replaces every machine, which bounces every
// client connected to the app, even when nothing that shapes the app has changed. This gate
// hashes those inputs, stamps the hash into the app's [env], and reads it back from the running
// machines on the next deploy so an unchanged app is left alone.
//
// Not covered: a base image re-tagged under the same version, or a newer apk package. Bump the
// marker in the template, or set ZERO_FORCE_DEPLOY, to redeploy in that case.

export const DEPLOY_INPUT_HASH_ENV = 'TLDRAW_DEPLOY_INPUT_HASH'
export const DEPLOY_INPUT_HASH_PLACEHOLDER = '__DEPLOY_INPUT_HASH'

export interface FlyDeployInputs {
	/** The rendered fly config, with DEPLOY_INPUT_HASH_PLACEHOLDER still in place. */
	config: string
	/** COPY/ADD sources are resolved against contextDir and hashed too. */
	dockerfile?: { content: string; contextDir: string }
	/**
	 * Every value passed to `flyctl secrets set --stage`. Staged secrets only take effect on the
	 * next deploy, so a changed secret must count as a changed input or it would never apply.
	 */
	secrets?: string[]
}

export function hashFlyDeployInputs(inputs: FlyDeployInputs): string {
	const hash = createHash('sha256')
	addPart(hash, 'config', inputs.config)
	if (inputs.dockerfile) {
		addPart(hash, 'dockerfile', inputs.dockerfile.content)
		for (const source of dockerfileCopySources(inputs.dockerfile.content)) {
			addPath(hash, inputs.dockerfile.contextDir, source)
		}
	}
	for (const secret of inputs.secrets ?? []) {
		addPart(hash, 'secret', secret)
	}
	return hash.digest('hex')
}

// Length-prefixed so that two parts can't be re-split into the same byte stream.
function addPart(hash: Hash, label: string, value: string | Buffer) {
	hash.update(`${label}:${Buffer.byteLength(value)}\n`)
	hash.update(value)
}

function addPath(hash: Hash, contextDir: string, relativePath: string) {
	const absolutePath = path.join(contextDir, relativePath)
	let stat
	try {
		stat = statSync(absolutePath)
	} catch {
		throw new Error(
			`Dockerfile copies ${relativePath} but it does not exist in the build context ${contextDir}. ` +
				`Only plain paths are supported: no globs, JSON-array COPY, or URLs.`
		)
	}
	if (stat.isDirectory()) {
		for (const entry of readdirSync(absolutePath).sort()) {
			addPath(hash, contextDir, path.join(relativePath, entry))
		}
		return
	}
	addPart(hash, `file:${relativePath}`, readFileSync(absolutePath))
}

/**
 * The build-context sources of every COPY/ADD instruction. Parsed from the Dockerfile rather than
 * listed by hand so a new COPY can't silently fall outside the hash.
 */
export function dockerfileCopySources(dockerfile: string): string[] {
	const sources: string[] = []
	for (const line of joinContinuedLines(dockerfile)) {
		const match = line.match(/^\s*(?:COPY|ADD)\s+(.*)$/i)
		if (!match) continue
		const tokens = match[1].trim().split(/\s+/)
		// `--from` copies from another build stage, not from the context.
		if (tokens.some((token) => token.startsWith('--from'))) continue
		const operands = tokens.filter((token) => !token.startsWith('--'))
		for (const source of operands.slice(0, -1)) {
			if (!sources.includes(source)) sources.push(source)
		}
	}
	return sources
}

// A trailing `\` continues an instruction on the next physical line. Without joining them first,
// the sources on the wrapped lines never reach the COPY match and escape the hash.
function joinContinuedLines(dockerfile: string): string[] {
	const lines: string[] = []
	let continued = ''
	for (const line of dockerfile.split('\n')) {
		const trimmed = line.trimEnd()
		if (trimmed.endsWith('\\')) {
			continued += trimmed.slice(0, -1)
			continue
		}
		lines.push(continued + line)
		continued = ''
	}
	if (continued) lines.push(continued)
	return lines
}

export function stampDeployInputHash(config: string, hash: string): string {
	if (!config.includes(DEPLOY_INPUT_HASH_PLACEHOLDER)) {
		throw new Error(
			`Fly config has no ${DEPLOY_INPUT_HASH_PLACEHOLDER} placeholder; without it the deployed machines never carry the hash and the deploy gate never matches`
		)
	}
	return config.replaceAll(DEPLOY_INPUT_HASH_PLACEHOLDER, hash)
}

interface FlyMachine {
	state?: string
	checks?: { status?: string }[]
	config?: { env?: Record<string, string | undefined> }
}

/**
 * The hash the running machines were deployed with, or null when they don't all agree on one
 * (no machines yet, a deploy that predates the stamp, or a rollout that stopped half way), so
 * that the caller deploys and converges them.
 *
 * A machine only counts when it is started and its checks pass, and a machine that has reported no
 * check yet does not count either. A rolling update writes the new config, stamp included, before
 * it waits on health, and a failed check does not revert it, so without this a rollout that failed
 * on its last machine would be skipped on the retry.
 */
export function parseDeployedInputHash(machineListJson: string): string | null {
	const machines = (JSON.parse(machineListJson) ?? []) as FlyMachine[]
	if (machines.length === 0) return null
	const hashes = new Set<string | undefined>()
	for (const machine of machines) {
		const checks = machine.checks ?? []
		const healthy =
			machine.state === 'started' &&
			checks.length > 0 &&
			checks.every((check) => check.status === 'passing')
		hashes.add(healthy ? machine.config?.env?.[DEPLOY_INPUT_HASH_ENV] : undefined)
	}
	if (hashes.size !== 1) return null
	const [hash] = hashes
	return hash ?? null
}

export async function getDeployedInputHash(appName: string): Promise<string | null> {
	// Collected rather than logged: on the single-node app [env] holds ZERO_ADMIN_PASSWORD and the
	// DB connection strings. Only stdout is parsed, so a flyctl warning on stderr can't break it.
	const stdout: string[] = []
	await exec('flyctl', ['machine', 'list', '-a', appName, '--json'], {
		processStdoutLine: (line) => stdout.push(line),
	})
	return parseDeployedInputHash(stdout.join('\n'))
}
