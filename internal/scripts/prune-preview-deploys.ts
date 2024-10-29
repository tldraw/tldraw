import * as github from '@actions/github'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'GH_TOKEN'])

interface ListWorkersResult {
	success: boolean
	result: { id: string }[]
}

const _isPrClosedCache = new Map<number, boolean>()
async function isPrClosedForAWhile(prNumber: number) {
	if (_isPrClosedCache.has(prNumber)) {
		return _isPrClosedCache.get(prNumber)!
	}

	let prResult
	try {
		prResult = await github.getOctokit(env.GH_TOKEN).rest.pulls.get({
			owner: 'tldraw',
			repo: 'tldraw',
			pull_number: prNumber,
		})
	} catch (err: any) {
		if (err.status === 404) {
			_isPrClosedCache.set(prNumber, true)
			return true
		}
		throw err
	}
	const twoDays = 1000 * 60 * 60 * 24 * 2
	const result =
		prResult.data.state === 'closed' &&
		Date.now() - new Date(prResult.data.closed_at!).getTime() > twoDays
	_isPrClosedCache.set(prNumber, result)
	return result
}

async function ListPreviewWorkerDeployments() {
	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`,
		{
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'application/json',
			},
		}
	)

	const data = (await res.json()) as ListWorkersResult

	if (!data.success) {
		throw new Error('Failed to list workers ' + JSON.stringify(data))
	}

	return data.result.map((r) => r.id).filter((id) => id.match(/^pr-(\d+)-/))
}

async function deletePreviewWorkerDeployment(id: string) {
	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${id}`,
		{
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'application/json',
			},
		}
	)

	if (!res.ok) {
		throw new Error('Failed to delete worker ' + JSON.stringify(await res.json()))
	}
}

async function main() {
	const previewDeployments = await ListPreviewWorkerDeployments()
	for (const deployment of previewDeployments) {
		const prNumber = Number(deployment.match(/^pr-(\d+)-/)![1])
		if (await isPrClosedForAWhile(prNumber)) {
			nicelog(`Deleting ${deployment} because PR is closed`)
			await deletePreviewWorkerDeployment(deployment)
		} else {
			nicelog(`Skipping ${deployment} because PR is still open`)
		}
	}

	nicelog('Done')
}

main()

// clean up cloudflare preview deploys
