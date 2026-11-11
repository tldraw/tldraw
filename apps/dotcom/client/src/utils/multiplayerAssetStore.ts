import { TLAssetStore, fetch, uniqueId } from 'tldraw'
import { loadLocalFile } from '../tla/utils/slurping'
import { USER_CONTENT_URL } from './config'
import { resolveUserContentImageUrl } from './resolveUserContentImageUrl'

const MAX_R2_OBJECT_NAME_BYTES = 1024

// Assets are uploaded to and served from a separate tldrawusercontent worker (USER_CONTENT_URL).
// Same R2 bucket as before — the worker just adds auth gating and Cloudflare Image Transformations.
// For app files, a fileId query param triggers server-side write-access validation and DB association.
async function getUrl(file: File, fileId: string | undefined) {
	const id = uniqueId()

	const namePrefix = `${id}-`
	const maxFileNameLength = MAX_R2_OBJECT_NAME_BYTES - namePrefix.length
	const objectName = namePrefix + file.name.replace(/\W/g, '-').slice(0, maxFileNameLength)
	const url = `${USER_CONTENT_URL}/${objectName}`
	if (fileId) {
		return {
			fetchUrl: `${url}?${new URLSearchParams({ fileId }).toString()}`,
			src: url,
		}
	}
	return { fetchUrl: url, src: url }
}

export function multiplayerAssetStore(opts?: {
	getFileId?(): string
	getToken?(): Promise<string | undefined>
}) {
	const { getFileId, getToken } = opts ?? {}
	return {
		upload: async (_asset, file, abortSignal?) => {
			const fileId = getFileId?.()
			const { fetchUrl, src } = await getUrl(file, fileId)
			const headers: Record<string, string> = {}
			if (fileId && getToken) {
				const token = await getToken()
				if (token && token !== 'not-logged-in') {
					headers['Authorization'] = `Bearer ${token}`
				}
			}
			const response = await fetch(fetchUrl, {
				method: 'POST',
				body: file,
				signal: abortSignal,
				headers,
			})

			if (!response.ok) {
				throw new Error(`Failed to upload asset: ${response.statusText}`)
			}

			if (fileId) {
				const meta = { fileId }
				return { src, meta }
			}
			return { src }
		},

		async resolve(asset, context) {
			if (!asset.props.src) return null

			if (asset.props.src.startsWith('asset:')) {
				if (!asset.meta.hidden) {
					const res = await loadLocalFile(asset)
					if (res) {
						return res.url
					}
				} else {
					return asset.props.src
				}
			}

			return resolveUserContentImageUrl(asset, context)
		},
	} satisfies TLAssetStore
}
