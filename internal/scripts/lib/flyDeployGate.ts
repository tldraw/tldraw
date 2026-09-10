import { createHash, Hash } from 'crypto'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { exec } from './exec'

// Every `flyctl deploy` updates each machine in place, bouncing the clients connected to it, even
// when nothing that shapes the app has changed. This gate stamps a hash of those inputs into the
// app's [env] and reads it back from the running machines next time, so an unchanged app is left
// alone. Only the view syncer builds an image; the rest run Zero's stock registry image.
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
		// Anything the whitespace split can't separate into sources and a destination, such as the
		// JSON-array form, would otherwise contribute nothing to the hash and never be missed.
		if (operands.length < 2) {
			throw new Error(
				`Dockerfile instruction \`${line.trim()}\` does not split into sources and a destination. ` +
					`Only plain paths are supported: no JSON-array COPY.`
			)
		}
		for (const source of operands.slice(0, -1)) {
			if (!sources.includes(source)) sources.push(source)
		}
	}
	return sources
}

// A trailing `\` continues an instruction on the next physical line; without joining them first the
// wrapped sources never reach the COPY match. Comments are dropped first, as Docker does, or a `\`
// ending one would swallow the instruction below it.
function joinContinuedLines(dockerfile: string): string[] {
	const lines: string[] = []
	let continued = ''
	for (const line of dockerfile.split('\n').filter((line) => !/^\s*#/.test(line))) {
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

export interface DeployedInputHash {
	/** The hash every running machine was deployed with, or null when the caller must deploy. */
	hash: string | null
	/** Why there is no usable hash, for the deploy log: a skipped deploy is hard to explain later. */
	reason: 'stamped' | 'no-machines' | 'unstamped' | 'mixed' | 'unhealthy'
}

/**
 * The hash the running machines were deployed with, or null when they don't all agree on one, so
 * that the caller deploys and converges them.
 *
 * A machine only counts when it is started and its checks pass, and a machine that has reported no
 * check yet does not count either. A rolling update writes the new config, stamp included, before
 * it waits on health, and a failed check does not revert it, so without this a rollout that failed
 * on its last machine would be skipped on the retry. An unhealthy machine is reported as such
 * rather than as a disagreement, so the log says a rollout is in flight instead of blaming the
 * stamps.
 */
export function parseDeployedInputHash(machineListJson: string): DeployedInputHash {
	const machines = (JSON.parse(machineListJson) ?? []) as FlyMachine[]
	if (machines.length === 0) return { hash: null, reason: 'no-machines' }
	const hashes = new Set<string | undefined>()
	for (const machine of machines) {
		const checks = machine.checks ?? []
		const healthy =
			machine.state === 'started' &&
			checks.length > 0 &&
			checks.every((check) => check.status === 'passing')
		if (!healthy) return { hash: null, reason: 'unhealthy' }
		hashes.add(machine.config?.env?.[DEPLOY_INPUT_HASH_ENV])
	}
	if (hashes.size !== 1) return { hash: null, reason: 'mixed' }
	const [hash] = hashes
	if (hash === undefined) return { hash: null, reason: 'unstamped' }
	return { hash, reason: 'stamped' }
}

export async function getDeployedInputHash(appName: string): Promise<DeployedInputHash> {
	// Collected rather than logged: on the single-node app [env] holds ZERO_ADMIN_PASSWORD and the
	// DB connection strings. Only stdout is parsed, so a flyctl warning on stderr can't break it.
	const stdout: string[] = []
	await exec('flyctl', ['machine', 'list', '-a', appName, '--json'], {
		processStdoutLine: (line) => stdout.push(line),
	})
	return parseDeployedInputHash(stdout.join('\n'))
}
