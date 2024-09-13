import {
	Editor,
	FileHelpers,
	MigrationFailureReason,
	MigrationResult,
	Result,
	SerializedSchema,
	SerializedStore,
	TLAssetId,
	TLRecord,
	TLSchema,
	TLStore,
	UnknownRecord,
	createTLStore,
	exhaustiveSwitchError,
	fetch,
	transact,
} from '@tldraw/editor'
import { TLUiToastsContextType } from '../../ui/context/toasts'
import { TLUiTranslationKey } from '../../ui/hooks/useTranslation/TLUiTranslationKey'
import { buildFromV1Document } from '../tldr/buildFromV1Document'

/** @public */
export const TLDRAW_FILE_MIMETYPE = 'application/vnd.tldraw+json' as const

/** @public */
export const TLDRAW_FILE_EXTENSION = '.tldr' as const

// When incrementing this, you'll need to update parseTldrawJsonFile to handle
// both your new changes and the old file format
const LATEST_TLDRAW_FILE_FORMAT_VERSION = 1

/** @public */
export interface TldrawFile {
	tldrawFileFormatVersion: number
	schema: SerializedSchema
	records: UnknownRecord[]
}

/** @public */
export function isV1File(data: any) {
	try {
		if (data.document?.version) {
			return true
		}
		return false
	} catch (e) {
		return false
	}
}

/** @public */
function isV2File(data: any): data is TldrawFile {
	return (
		data.tldrawFileFormatVersion !== undefined &&
		data.schema !== undefined &&
		data.records !== undefined
	)
}

function parseFile(json: any) {
	let data
	try {
		data = JSON.parse(json)
		if (isV2File(data)) {
			return { type: 'v2File' as const, data }
		} else if (isV1File(data)) {
			return { type: 'v1File' as const, data }
		}
	} catch (e) {
		return { type: 'notATldrawFile' as const, cause: e }
	}

	return { type: 'notATldrawFile' as const, cause: null }
}

/** @public */
export type TldrawFileParseError =
	| { type: 'v1File'; data: any }
	| { type: 'notATldrawFile'; cause: unknown }
	| { type: 'fileFormatVersionTooNew'; version: number }
	| { type: 'migrationFailed'; reason: MigrationFailureReason }
	| { type: 'invalidRecords'; cause: unknown }

/** @public */
export function parseTldrawJsonFile({
	json,
	schema,
}: {
	schema: TLSchema
	json: string
}): Result<TLStore, TldrawFileParseError> {
	const result = parseFile(json)
	switch (result.type) {
		case 'v2File': {
			const { data } = result
			// if the file format version isn't supported, we can't open it - it's
			// probably from a newer version of tldraw
			if (data.tldrawFileFormatVersion > LATEST_TLDRAW_FILE_FORMAT_VERSION) {
				return Result.err({
					type: 'fileFormatVersionTooNew',
					version: data.tldrawFileFormatVersion,
				})
			}
			let migrationResult: MigrationResult<SerializedStore<TLRecord>>
			// even if the file version is up to date, it might contain old-format
			// records. lets create a store with the records and migrate it to the
			// latest version
			try {
				const records = pruneUnusedAssets(data.records as TLRecord[])
				const storeSnapshot = Object.fromEntries(records.map((r) => [r.id, r]))
				migrationResult = schema.migrateStoreSnapshot({ store: storeSnapshot, schema: data.schema })
			} catch (e) {
				// junk data in the migration
				return Result.err({ type: 'invalidRecords', cause: e })
			}

			// if the migration failed, we can't open the file
			if (migrationResult.type === 'error') {
				return Result.err({ type: 'migrationFailed', reason: migrationResult.reason })
			}

			// at this stage, the store should have records at the latest versions, so
			// we should be able to validate them. if any of the records at this stage
			// are invalid, we don't open the file
			try {
				return Result.ok(
					createTLStore({
						initialData: migrationResult.value,
						schema,
					})
				)
			} catch (e) {
				// junk data in the records (they're not validated yet!) could cause the
				// migrations to crash. We treat any throw from a migration as an
				// invalid record
				return Result.err({ type: 'invalidRecords', cause: e })
			}
		}
		case 'v1File': {
			return Result.err({ type: 'v1File', data: result.data })
		}
		case 'notATldrawFile':
			return Result.err({ type: 'notATldrawFile', cause: result.cause })
	}
}

function pruneUnusedAssets(records: TLRecord[]) {
	const usedAssets = new Set<TLAssetId>()
	for (const record of records) {
		if (record.typeName === 'shape' && 'assetId' in record.props && record.props.assetId) {
			usedAssets.add(record.props.assetId)
		}
	}
	return records.filter((r) => r.typeName !== 'asset' || usedAssets.has(r.id))
}

/** @public */
export async function serializeTldrawJson(editor: Editor): Promise<string> {
	const records: TLRecord[] = []
	for (const record of editor.store.allRecords()) {
		switch (record.typeName) {
			case 'asset':
				if (
					record.type !== 'bookmark' &&
					record.props.src &&
					!record.props.src.startsWith('data:')
				) {
					let assetSrcToSave
					try {
						let src = record.props.src
						if (!src.startsWith('http')) {
							src =
								(await editor.resolveAssetUrl(record.id, { shouldResolveToOriginal: true })) || ''
						}
						// try to save the asset as a base64 string
						assetSrcToSave = await FileHelpers.blobToDataUrl(await (await fetch(src)).blob())
					} catch {
						// if that fails, just save the original src
						assetSrcToSave = record.props.src
					}

					records.push({
						...record,
						props: {
							...record.props,
							src: assetSrcToSave,
						},
					})
				} else {
					records.push(record)
				}
				break
			default:
				records.push(record)
				break
		}
	}

	return JSON.stringify({
		tldrawFileFormatVersion: LATEST_TLDRAW_FILE_FORMAT_VERSION,
		schema: editor.store.schema.serialize(),
		records: pruneUnusedAssets(records),
	})
}

/** @public */
export async function serializeTldrawJsonBlob(editor: Editor): Promise<Blob> {
	return new Blob([await serializeTldrawJson(editor)], { type: TLDRAW_FILE_MIMETYPE })
}

/** @internal */
export async function parseAndLoadDocument(
	editor: Editor,
	document: string,
	msg: (id: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>) => string,
	addToast: TLUiToastsContextType['addToast'],
	onV1FileLoad?: () => void,
	forceDarkMode?: boolean
) {
	const parseFileResult = parseTldrawJsonFile({
		schema: editor.store.schema,
		json: document,
	})
	if (!parseFileResult.ok) {
		let description
		switch (parseFileResult.error.type) {
			case 'notATldrawFile':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				reportError(parseFileResult.error.cause)
				description = msg('file-system.file-open-error.not-a-tldraw-file')
				break
			case 'fileFormatVersionTooNew':
				description = msg('file-system.file-open-error.file-format-version-too-new')
				break
			case 'migrationFailed':
				if (parseFileResult.error.reason === MigrationFailureReason.TargetVersionTooNew) {
					description = msg('file-system.file-open-error.file-format-version-too-new')
				} else {
					description = msg('file-system.file-open-error.generic-corrupted-file')
				}
				break
			case 'invalidRecords':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				reportError(parseFileResult.error.cause)
				description = msg('file-system.file-open-error.generic-corrupted-file')
				break
			case 'v1File': {
				buildFromV1Document(editor, parseFileResult.error.data.document)
				onV1FileLoad?.()
				return
			}
			default:
				exhaustiveSwitchError(parseFileResult.error, 'type')
		}
		addToast({
			title: msg('file-system.file-open-error.title'),
			description,
			severity: 'error',
		})

		return
	}

	// tldraw file contain the full state of the app,
	// including ephemeral data. it up to the opener to
	// decide what to restore and what to retain. Here, we
	// just restore everything, so if the user has opened
	// this file before they'll get their camera etc.
	// restored. we could change this in the future.
	transact(() => {
		editor.loadSnapshot(parseFileResult.value.getStoreSnapshot())
		editor.clearHistory()

		const bounds = editor.getCurrentPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true })
		}
	})

	if (forceDarkMode) editor.user.updateUserPreferences({ colorScheme: 'dark' })
}
