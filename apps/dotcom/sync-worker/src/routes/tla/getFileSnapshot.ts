import { RoomSnapshot } from '@tldraw/sync-core'
import { StatusError } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { reconstructLatestVersion } from '../../versionChainRead'

export async function returnFileSnapshot(env: Environment, fileSlug: string, isApp: boolean) {
	const snapshot = await getFileSnapshot(env, fileSlug, isApp)
	if (!snapshot) {
		throw new StatusError(404, 'File not found')
	}

	const tldrFile = {
		tldrawFileFormatVersion: 1,
		schema: snapshot.schema,
		records: snapshot.documents.map((doc) => doc.state),
	}

	return new Response(JSON.stringify(tldrFile, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${fileSlug}.tldr"`,
		},
	})
}

export async function getFileSnapshot(
	env: Environment,
	fileSlug: string,
	isApp: boolean
): Promise<RoomSnapshot | null> {
	if (!isApp) {
		return reconstructLatestVersion({
			chainBucket: env.ROOMS_HISTORY,
			roomKey: getR2KeyForRoom({ slug: fileSlug, isApp }),
		})
	}
	const snapshot = await env.ROOMS.get(getR2KeyForRoom({ slug: fileSlug, isApp }))
	if (!snapshot) {
		return null
	}

	return snapshot.json() as Promise<RoomSnapshot>
}
