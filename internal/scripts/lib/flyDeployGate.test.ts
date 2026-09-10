import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
	DEPLOY_INPUT_HASH_ENV,
	DEPLOY_INPUT_HASH_PLACEHOLDER,
	dockerfileCopySources,
	hashFlyDeployInputs,
	parseDeployedInputHash,
	stampDeployInputHash,
} from './flyDeployGate'

function makeContext(files: Record<string, string>) {
	const dir = mkdtempSync(path.join(tmpdir(), 'fly-gate-'))
	for (const [rel, content] of Object.entries(files)) {
		mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
		writeFileSync(path.join(dir, rel), content)
	}
	return dir
}

describe('dockerfileCopySources', () => {
	it('returns every source of COPY and ADD, dropping flags and the destination', () => {
		const dockerfile = [
			'FROM rocicorp/zero:1.0.0',
			'COPY nginx.conf.template /etc/nginx/nginx.conf.template',
			'COPY --chown=zero:zero start.sh supervisord.conf /',
			'ADD docker/ /opt/docker',
			'RUN chmod +x /start.sh',
		].join('\n')
		expect(dockerfileCopySources(dockerfile)).toEqual([
			'nginx.conf.template',
			'start.sh',
			'supervisord.conf',
			'docker/',
		])
	})

	it('ignores sources copied from another build stage', () => {
		const dockerfile = ['FROM a AS build', 'COPY --from=build /out /out', 'COPY x /x'].join('\n')
		expect(dockerfileCopySources(dockerfile)).toEqual(['x'])
	})

	it('follows a line continuation to the sources on the wrapped lines', () => {
		const dockerfile = [
			'FROM rocicorp/zero:1.0.0',
			'COPY nginx.conf.template \\',
			'     supervisord.conf \\',
			'     start.sh /etc/',
		].join('\n')
		expect(dockerfileCopySources(dockerfile)).toEqual([
			'nginx.conf.template',
			'supervisord.conf',
			'start.sh',
		])
	})

	it('does not let a trailing backslash in a comment swallow the next instruction', () => {
		const dockerfile = ['FROM x', '# see foo \\', 'COPY start.sh /start.sh', 'COPY b /b'].join('\n')
		expect(dockerfileCopySources(dockerfile)).toEqual(['start.sh', 'b'])
	})

	it('throws on an instruction it cannot split into sources and a destination', () => {
		const dockerfile = ['FROM x', 'COPY ["a","/b"]'].join('\n')
		expect(() => dockerfileCopySources(dockerfile)).toThrow(/only plain paths are supported/i)
	})
})

describe('hashFlyDeployInputs', () => {
	it('is stable for identical inputs and changes with any input', () => {
		const dir = makeContext({ 'start.sh': 'echo hi', 'conf/a.ini': 'a=1' })
		const dockerfile = 'FROM x\nCOPY start.sh /start.sh\nCOPY conf /etc/conf'
		const base = {
			config: 'app = "x"\n[env]\nH = "__DEPLOY_INPUT_HASH"',
			dockerfile: { content: dockerfile, contextDir: dir },
			secrets: ['A=1', 'B=2'],
		}
		const hash = hashFlyDeployInputs(base)
		expect(hash).toMatch(/^[0-9a-f]{64}$/)
		expect(hashFlyDeployInputs(base)).toBe(hash)

		expect(hashFlyDeployInputs({ ...base, config: base.config + '\n' })).not.toBe(hash)
		expect(hashFlyDeployInputs({ ...base, secrets: ['A=1', 'B=3'] })).not.toBe(hash)
		expect(
			hashFlyDeployInputs({
				...base,
				dockerfile: { ...base.dockerfile, content: dockerfile + ' ' },
			})
		).not.toBe(hash)

		writeFileSync(path.join(dir, 'conf/a.ini'), 'a=2')
		expect(hashFlyDeployInputs(base)).not.toBe(hash)
	})

	it('ignores files the Dockerfile does not copy', () => {
		const dir = makeContext({ 'start.sh': 'echo hi', 'unrelated.txt': 'x' })
		const inputs = {
			config: 'app = "x"',
			dockerfile: { content: 'FROM x\nCOPY start.sh /start.sh', contextDir: dir },
		}
		const hash = hashFlyDeployInputs(inputs)
		writeFileSync(path.join(dir, 'unrelated.txt'), 'y')
		expect(hashFlyDeployInputs(inputs)).toBe(hash)
	})

	it('fails loudly when a copied source is missing rather than silently hashing less', () => {
		const dir = makeContext({})
		expect(() =>
			hashFlyDeployInputs({
				config: '',
				dockerfile: { content: 'COPY missing.sh /', contextDir: dir },
			})
		).toThrow(/missing\.sh/)
	})
})

describe('stampDeployInputHash', () => {
	it('replaces the placeholder with the hash', () => {
		const config = `[env]\n${DEPLOY_INPUT_HASH_ENV} = "${DEPLOY_INPUT_HASH_PLACEHOLDER}"\n`
		expect(stampDeployInputHash(config, 'abc')).toBe(`[env]\n${DEPLOY_INPUT_HASH_ENV} = "abc"\n`)
	})

	it('refuses a config without the placeholder, since the gate would then never match', () => {
		expect(() => stampDeployInputHash('[env]\nX = "1"\n', 'abc')).toThrow(
			DEPLOY_INPUT_HASH_PLACEHOLDER
		)
	})
})

describe('parseDeployedInputHash', () => {
	const machine = (
		hash: string | undefined,
		{ state = 'started', checks = ['passing'] }: { state?: string; checks?: string[] } = {}
	) => ({
		state,
		checks: checks.map((status) => ({ name: 'keepalive', status })),
		config: { env: hash === undefined ? {} : { [DEPLOY_INPUT_HASH_ENV]: hash } },
	})

	it('returns the hash when every machine is healthy and carries the same one', () => {
		expect(parseDeployedInputHash(JSON.stringify([machine('abc'), machine('abc')]))).toEqual({
			hash: 'abc',
			reason: 'stamped',
		})
	})

	it('returns null for an app with no machines', () => {
		expect(parseDeployedInputHash('[]')).toEqual({ hash: null, reason: 'no-machines' })
		expect(parseDeployedInputHash('null')).toEqual({ hash: null, reason: 'no-machines' })
	})

	it('returns null when machines predate the stamp, so the first deploy after the change runs', () => {
		expect(
			parseDeployedInputHash(JSON.stringify([machine(undefined), machine(undefined)]))
		).toEqual({ hash: null, reason: 'unstamped' })
	})

	it('returns null when machines disagree, so the deploy converges them', () => {
		expect(parseDeployedInputHash(JSON.stringify([machine('abc'), machine('def')]))).toEqual({
			hash: null,
			reason: 'mixed',
		})
		expect(parseDeployedInputHash(JSON.stringify([machine('abc'), machine(undefined)]))).toEqual({
			hash: null,
			reason: 'mixed',
		})
	})

	it('does not trust a stamp on a machine that has not reported a check yet', () => {
		const noChecks = { state: 'started', config: { env: { [DEPLOY_INPUT_HASH_ENV]: 'abc' } } }
		expect(parseDeployedInputHash(JSON.stringify([noChecks]))).toEqual({
			hash: null,
			reason: 'unhealthy',
		})
		expect(parseDeployedInputHash(JSON.stringify([machine('abc', { checks: [] })]))).toEqual({
			hash: null,
			reason: 'unhealthy',
		})
	})

	it('does not trust a stamp on a machine that is stopped or failing its checks', () => {
		expect(
			parseDeployedInputHash(JSON.stringify([machine('abc'), machine('abc', { state: 'stopped' })]))
		).toEqual({ hash: null, reason: 'unhealthy' })
		expect(
			parseDeployedInputHash(
				JSON.stringify([machine('abc'), machine('abc', { checks: ['passing', 'critical'] })])
			)
		).toEqual({ hash: null, reason: 'unhealthy' })
	})
})
