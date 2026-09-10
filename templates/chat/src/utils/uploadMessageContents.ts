import { FileUIPart, UIMessage } from 'ai'
import { FileHelpers } from 'tldraw'

interface UploadedMetadata {
	provider: 'openai'
	fileId: string
	expiresAt: string
}

const UPLOAD_METADATA_KEY = 'tldraw_uploaded'

// File IDs keep images out of repeated chat requests. Keep the originals locally for
// display, sketch editing, and uploading again after the files expire.
export async function uploadMessageContents(messages: UIMessage[]) {
	const messagesToSend = []
	const messagesToSave = []
	const promises = []

	for (const message of messages) {
		const partsToSend = []
		const partsToSave = []

		for (const part of message.parts) {
			if (part.type === 'file' && part.url.startsWith('data:')) {
				const metadata = getUploadedMetadata(part)
				if (metadata) {
					partsToSend.push({ ...getPartToSend(part), url: metadata.fileId })
					partsToSave.push(part)
				} else {
					const partToSend = getPartToSend(part)
					const partToSave = { ...part }

					const promise = (async () => {
						const response = await fetch('/api/upload', {
							method: 'POST',
							body: await FileHelpers.urlToBlob(part.url),
							headers: {
								'Content-Type': part.mediaType,
								'x-file-name': encodeURIComponent(part.filename || 'image.png'),
							},
						})

						const data: unknown = await response.json().catch(() => null)
						if (!response.ok) {
							throw new Error(
								data &&
									typeof data === 'object' &&
									'error' in data &&
									typeof data.error === 'string'
									? data.error
									: 'Could not upload the image. Please try again.'
							)
						}
						if (!isUploadedMetadata(data)) {
							throw new Error('The image upload returned an invalid file. Please try again.')
						}

						partToSend.url = data.fileId
						partToSave.providerMetadata = {
							...partToSave.providerMetadata,
							[UPLOAD_METADATA_KEY]: { ...data },
						}
					})()

					promises.push(promise)
					partsToSend.push(partToSend)
					partsToSave.push(partToSave)
				}
			} else {
				partsToSend.push(part.type === 'file' ? getPartToSend(part) : part)
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
	const metadata = part.providerMetadata?.[UPLOAD_METADATA_KEY]
	return isUploadedMetadata(metadata) ? metadata : undefined
}

function isUploadedMetadata(value: unknown): value is UploadedMetadata {
	if (!value || typeof value !== 'object') return false
	const metadata = value as Partial<UploadedMetadata>
	return (
		metadata.provider === 'openai' &&
		typeof metadata.fileId === 'string' &&
		metadata.fileId.startsWith('file-') &&
		typeof metadata.expiresAt === 'string' &&
		Date.parse(metadata.expiresAt) > Date.now()
	)
}

function getPartToSend(part: FileUIPart): FileUIPart {
	const partToSend = { ...part }
	if (partToSend.providerMetadata) {
		partToSend.providerMetadata = { ...partToSend.providerMetadata }
		delete partToSend.providerMetadata[UPLOAD_METADATA_KEY]
		delete partToSend.providerMetadata.tldraw
	}
	return partToSend
}
