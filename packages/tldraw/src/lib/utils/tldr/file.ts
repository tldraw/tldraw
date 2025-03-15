import {
	Editor,
	FileHelpers,
	MigrationFailureReason,
	MigrationResult,
	RecordId,
	Result,
	SerializedSchema,
	SerializedSchemaV1,
	SerializedSchemaV2,
	SerializedStore,
	StoreSnapshot,
	T,
	TLAssetId,
	TLImageAsset,
	TLRecord,
	TLSchema,
	TLStore,
	TLVideoAsset,
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

const schemaV1 = T.object<SerializedSchemaV1>({
	schemaVersion: T.literal(1),
	storeVersion: T.positiveInteger,
	recordVersions: T.dict(
		T.string,
		T.object({
			version: T.positiveInteger,
			subTypeVersions: T.dict(T.string, T.positiveInteger).optional(),
			subTypeKey: T.string.optional(),
		})
	),
})

const schemaV2 = T.object<SerializedSchemaV2>({
	schemaVersion: T.literal(2),
	sequences: T.dict(T.string, T.positiveInteger),
})

const tldrawFileValidator: T.Validator<TldrawFile> = T.object({
	tldrawFileFormatVersion: T.nonZeroInteger,
	schema: T.numberUnion('schemaVersion', {
		1: schemaV1,
		2: schemaV2,
	}),
	records: T.arrayOf(
		T.object({
			id: T.string as any as T.Validator<RecordId<any>>,
			typeName: T.string,
		}).allowUnknownProperties()
	),
})

/** @public */
export function isV1File(data: any) {
	try {
		if (data.document?.version) {
			return true
		}
		return false
	} catch {
		return false
	}
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
	// first off, we parse .json file and check it matches the general shape of
	// a tldraw file
	let data
	try {
		data = tldrawFileValidator.validate(JSON.parse(json))
	} catch (e) {
		// could be a v1 file!
		try {
			data = JSON.parse(json)
			if (isV1File(data)) {
				return Result.err({ type: 'v1File', data })
			}
		} catch {
			// noop
		}

		return Result.err({ type: 'notATldrawFile', cause: e })
	}

	// if the file format version isn't supported, we can't open it - it's
	// probably from a newer version of tldraw
	if (data.tldrawFileFormatVersion > LATEST_TLDRAW_FILE_FORMAT_VERSION) {
		return Result.err({
			type: 'fileFormatVersionTooNew',
			version: data.tldrawFileFormatVersion,
		})
	}

	// even if the file version is up to date, it might contain old-format
	// records. lets create a store with the records and migrate it to the
	// latest version
	let migrationResult: MigrationResult<SerializedStore<TLRecord>>
	let storeSnapshot: SerializedStore<TLRecord>
	try {
		const records = pruneUnusedAssets(data.records as TLRecord[])
		storeSnapshot = Object.fromEntries(records.map((r) => [r.id, r]))
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
				snapshot: { store: storeSnapshot, schema: data.schema },
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
		const snapshot = parseFileResult.value.getStoreSnapshot()
		editor.loadSnapshot(snapshot)
		editor.clearHistory()

		extractAssets(editor, snapshot, msg, addToast)

		const bounds = editor.getCurrentPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true })
		}
	})

	if (forceDarkMode) editor.user.updateUserPreferences({ colorScheme: 'dark' })
}

async function extractAssets(
	editor: Editor,
	snapshot: StoreSnapshot<TLRecord>,
	msg: (id: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>) => string,
	addToast: TLUiToastsContextType['addToast']
) {
	const mediaAssets = new Map<TLAssetId, TLImageAsset | TLVideoAsset>()
	for (const record of Object.values(snapshot.store)) {
		if (
			record.typeName === 'asset' &&
			record.props.src &&
			record.props.src.startsWith('data:') &&
			(record.type === 'image' || record.type === 'video')
		) {
			mediaAssets.set(record.id, record)
		}
	}

	Promise.allSettled(
		[...mediaAssets].map(async ([id, asset]) => {
			try {
				const blob = await fetch(asset.props.src!).then((r) => r.blob())
				const file = new File([blob], asset.props.name, {
					type: asset.props.mimeType!,
				})

				const newAsset = await editor.getAssetForExternalContent({
					type: 'file',
					file,
				})

				if (!newAsset) {
					throw Error('Could not create an asset')
				}

				// Save the new asset under the old asset's id
				editor.updateAssets([{ ...newAsset, id }])
			} catch (error) {
				addToast({
					title: msg('assets.files.upload-failed'),
					severity: 'error',
				})
				console.error(error)
				return
			}
		})
	)
}
