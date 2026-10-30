import {
	FILE_PREFIX,
	HistoryListResponse,
	HistoryPointsResponse,
	HistoryRawResponse,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { fetch, TLStoreSnapshot } from 'tldraw'

const base = (fileId: string) => `/api/${FILE_PREFIX}/${fileId}`

async function json<T>(res: Response): Promise<T> {
	if (!res.ok) throw new Error(`History request failed: ${res.status}`)
	return (await res.json()) as T
}

export async function fetchHistoryPage(
	fileId: string,
	opts: { before?: string; raw?: boolean } = {}
): Promise<HistoryListResponse | HistoryRawResponse> {
	const params = new URLSearchParams({ v: '2' })
	if (opts.before) params.set('before', opts.before)
	if (opts.raw) params.set('raw', '1')
	return json(await fetch(`${base(fileId)}/history?${params}`))
}

export async function fetchHistoryPoints(
	fileId: string,
	from: string,
	to: string
): Promise<HistoryPointsResponse> {
	const params = new URLSearchParams({ from, to })
	return json(await fetch(`${base(fileId)}/history/points?${params}`))
}

export async function fetchVersionSnapshot(fileId: string, ts: string): Promise<TLStoreSnapshot> {
	const data = await json<RoomSnapshot>(await fetch(`${base(fileId)}/history/${ts}`))
	return {
		schema: data.schema,
		store: Object.fromEntries(data.documents.map((record) => [record.state.id, record.state])),
	} as TLStoreSnapshot
}

export async function restoreVersion(
	fileId: string,
	body: { timestamp: string; undoes?: string }
): Promise<{ restoreId: string; preRestoreTs: string | null; restoredTs: string }> {
	return json(
		await fetch(`/api/app/file/${fileId}/restore`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	)
}

export async function saveNamedVersion(fileId: string, name: string): Promise<{ ts: string }> {
	return json(
		await fetch(`${base(fileId)}/history/name`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		})
	)
}
