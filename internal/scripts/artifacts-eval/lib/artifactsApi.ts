import { makeEnv } from '../../lib/makeEnv'

/**
 * Minimal REST client for the Cloudflare Artifacts API (beta).
 * Endpoint shapes follow developers.cloudflare.com/artifacts/api/rest-api/; response
 * schemas are beta and may drift, so raw results are preserved for inspection.
 */
export class ArtifactsApi {
	private accountId: string
	private token: string

	constructor() {
		const env = makeEnv(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])
		this.accountId = env.CLOUDFLARE_ACCOUNT_ID
		this.token = env.CLOUDFLARE_API_TOKEN
	}

	private url(path: string): string {
		return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/artifacts${path}`
	}

	private async request<T = any>(path: string, init?: RequestInit): Promise<T> {
		const res = await fetch(this.url(path), {
			...init,
			headers: {
				authorization: `Bearer ${this.token}`,
				'content-type': 'application/json',
				...init?.headers,
			},
		})
		const text = await res.text()
		let body: any
		try {
			body = JSON.parse(text)
		} catch {
			throw new Error(
				`Artifacts API ${path}: HTTP ${res.status}, non-JSON body: ${text.slice(0, 500)}`
			)
		}
		if (!res.ok || body.success === false) {
			throw new Error(
				`Artifacts API ${path}: HTTP ${res.status} ${JSON.stringify(body.errors ?? body).slice(0, 1000)}`
			)
		}
		return (body.result ?? body) as T
	}

	async getRepo(namespace: string, name: string): Promise<any | null> {
		try {
			return await this.request(`/namespaces/${namespace}/repos/${name}`)
		} catch (err) {
			if (String(err).includes('HTTP 404')) return null
			throw err
		}
	}

	async createRepo(namespace: string, name: string, description: string): Promise<any> {
		return await this.request(`/namespaces/${namespace}/repos`, {
			method: 'POST',
			body: JSON.stringify({ name, description }),
		})
	}

	async deleteRepo(namespace: string, name: string): Promise<void> {
		await this.request(`/namespaces/${namespace}/repos/${name}`, { method: 'DELETE' })
	}

	async createToken(namespace: string, repo: string, scope: 'read' | 'write'): Promise<any> {
		return await this.request(`/namespaces/${namespace}/tokens`, {
			method: 'POST',
			body: JSON.stringify({ repo, scope }),
		})
	}

	async log(namespace: string, repo: string, limit = 1000): Promise<any> {
		return await this.request(`/namespaces/${namespace}/repos/${repo}/log?limit=${limit}`)
	}

	async rawFile(namespace: string, repo: string, ref: string, path: string): Promise<Buffer> {
		const res = await fetch(this.url(`/namespaces/${namespace}/repos/${repo}/raw/${ref}/${path}`), {
			headers: { authorization: `Bearer ${this.token}` },
		})
		if (!res.ok) {
			throw new Error(`Artifacts raw read ${repo}:${ref}:${path}: HTTP ${res.status}`)
		}
		return Buffer.from(await res.arrayBuffer())
	}
}

/** From Cloudflare's sandbox example: token may carry `?expires=`; the secret goes before it. */
export function toAuthenticatedRemote(remote: string, token: string): string {
	const secret = token.split('?expires=')[0]
	return `https://x:${secret}@${remote.slice('https://'.length)}`
}

/**
 * Beta response shapes vary; pull the remote URL and token out of whatever the
 * create/get/token responses contain, with loud errors when they don't.
 */
export function extractRemote(repoResult: any): string {
	const remote = repoResult?.remote ?? repoResult?.remote_url ?? repoResult?.remoteUrl
	if (typeof remote !== 'string') {
		throw new Error(
			`Could not find remote URL in repo response: ${JSON.stringify(repoResult).slice(0, 1000)}`
		)
	}
	return remote
}

export function extractToken(result: any): string | null {
	const token = result?.token ?? result?.plaintext ?? result?.secret ?? result?.value
	return typeof token === 'string' ? token : null
}

/** Best-effort scan of repo details for a byte-count field (server-reported storage). */
export function extractReportedBytes(repoResult: any): number | null {
	if (!repoResult || typeof repoResult !== 'object') return null
	for (const [key, value] of Object.entries(repoResult)) {
		if (typeof value === 'number' && /size|bytes|storage/i.test(key)) return value
		if (value && typeof value === 'object') {
			const nested = extractReportedBytes(value)
			if (nested !== null) return nested
		}
	}
	return null
}
