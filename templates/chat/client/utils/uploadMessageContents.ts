import { FileUIPart, UIMessage } from 'ai'
import { FileHelpers } from 'tldraw'

interface UploadedMetadata {
	uploadedUrl: string
	expiresAt: string
}

const UPLOAD_METADATA_KEY = 'tldraw_uploaded'

/**
 * We upload files to Cloudflare R2 to handle larger files and provide temporary storage.
 * Files are automatically expired after 24 hours for privacy and storage efficiency.
 *
 * We process the messages into two versions:
 * 1. The messages to send to the server - these have the file data URLs replaced with uploaded versions.
 * 2. The messages we use locally - these store the upload for re-use in `providerMetadata`, but keep the originals for display or when the uploads expire.
 */
export async function uploadMessageContents(messages: UIMessage[]) {
	const now = new Date().toISOString()
	const messagesToSend = []
	const messagesToSave = []
	const promises = []

	for (const message of messages) {
		const partsToSend = []
		const partsToSave = []

		for (const part of message.parts) {
			if (part.type === 'file' && part.url.startsWith('data:')) {
				const metadata = getUploadedMetadata(part)
				if (metadata && metadata.expiresAt > now) {
					partsToSend.push({
						...part,
						url: metadata.uploadedUrl,
					})
					partsToSave.push(part)
				} else {
					const partToSend = { ...part }
					const partToSave = { ...part }

					const promise = (async () => {
						const response = await fetch('/api/upload', {
							method: 'POST',
							body: await FileHelpers.urlToBlob(part.url),
							headers: {
								'Content-Type': part.mediaType,
								'x-file-name': part.filename || 'image.png',
							},
						})

						const data: UploadedMetadata = await response.json()

						partToSend.url = data.uploadedUrl
						if (partToSend.providerMetadata) {
							partToSend.providerMetadata = { ...partToSend.providerMetadata }
							delete partToSend.providerMetadata.tldraw_uploaded
							delete partToSend.providerMetadata.tldraw
						}
						partToSave.providerMetadata = { ...partToSave.providerMetadata }
						partToSave.providerMetadata.tldraw_uploaded = data as any
					})()

					promises.push(promise)
					partsToSend.push(partToSend)
					partsToSave.push(partToSave)
				}
			} else {
				partsToSend.push(part)
				partsToSave.push(part)
			}
		}

		messagesToSend.push({
			...message,
			parts: partsToSend,
		})
		messagesToSave.push({
			...message,
			parts: partsToSave,
		})
	}

	await Promise.all(promises)

	return { messagesToSend, messagesToSave }
}

function getUploadedMetadata(part: FileUIPart): UploadedMetadata | undefined {
	return part.providerMetadata?.[UPLOAD_METADATA_KEY] as UploadedMetadata | undefined
}
