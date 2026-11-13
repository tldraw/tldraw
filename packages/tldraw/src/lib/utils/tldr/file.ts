import {
	Box,
	compact,
	createTLStore,
	defineMessages,
	Editor,
	exhaustiveSwitchError,
	fetch,
	FileHelpers,
	maybeSnapToGrid,
	MigrationFailureReason,
	MigrationResult,
	PageRecordType,
	RecordId,
	Result,
	SerializedSchema,
	SerializedSchemaV1,
	SerializedSchemaV2,
	SerializedStore,
	sortByIndex,
	StoreSnapshot,
	T,
	TLAsset,
	TLAssetId,
	TLBinding,
	TLContent,
	TLImageAsset,
	TLPage,
	TLPageId,
	TLRecord,
	TLSchema,
	TLShape,
	TLShapeId,
	TLStore,
	TLUser,
	TLVideoAsset,
	transact,
	UnknownRecord,
	Vec,
	VecLike,
} from '@tldraw/editor'
import type { TLDefaultExternalContentHandlerOpts } from '../../defaultExternalContentHandlers'
import { TLUiToastsContextType } from '../../ui/context/toasts'
import { useTranslation } from '../../ui/hooks/useTranslation/useTranslation'
import { buildFromV1Document } from '../tldr/buildFromV1Document'

const messages = defineMessages({
	assetsFilesUploadFailed: { id: 'assets.files.upload-failed', defaultMessage: 'Upload failed' },
	fileSystemFileOpenErrorFileFormatVersionTooNew: {
		id: 'file-system.file-open-error.file-format-version-too-new',
		defaultMessage:
			'The file you tried to open is from a newer version of tldraw. Please reload the page and try again.',
	},
	fileSystemFileOpenErrorGenericCorruptedFile: {
		id: 'file-system.file-open-error.generic-corrupted-file',
		defaultMessage: 'The file you tried to open is corrupted.',
	},
	fileSystemFileOpenErrorNotATldrawFile: {
		id: 'file-system.file-open-error.not-a-tldraw-file',
		defaultMessage: 'The file you tried to open doesn’t look like a tldraw file.',
	},
	fileSystemFileOpenErrorTitle: {
		id: 'file-system.file-open-error.title',
		defaultMessage: 'Could not open file',
	},
	fileSystemImportErrorTitle: {
		id: 'file-system.import-error.title',
		defaultMessage: 'Could not import file',
	},
	fileSystemImportErrorTooManyShapes: {
		id: 'file-system.import-error.too-many-shapes',
		defaultMessage: 'A page in this file has more than {max} shapes.',
	},
	fileSystemImportErrorTooManyPages: {
		id: 'file-system.import-error.too-many-pages',
		defaultMessage: 'Importing this file would go over the limit of {max} pages.',
	},
	fileSystemImportedPages: {
		id: 'file-system.imported-pages',
		defaultMessage: 'Imported {count, plural, one {# page} other {# pages}}.',
	},
})

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

// An asset is in use while any other record names it: a shape's assetId, or an asset id anywhere
// in a record, such as a custom record that keeps shapes for later.
function pruneUnusedAssets(records: TLRecord[]) {
	const assetIds = new Set<string>(records.filter((r) => r.typeName === 'asset').map((r) => r.id))
	if (assetIds.size === 0) return records
	const usedAssets = new Set<string>()
	const visit = (value: unknown) => {
		if (typeof value === 'string') {
			if (assetIds.has(value)) usedAssets.add(value)
		} else if (value && typeof value === 'object') {
			for (const child of Object.values(value)) visit(child)
		}
	}
	for (const record of records) {
		if (record.typeName !== 'asset') visit(record)
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
	msg: ReturnType<typeof useTranslation>,
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
				description = msg(messages.fileSystemFileOpenErrorNotATldrawFile)
				break
			case 'fileFormatVersionTooNew':
				description = msg(messages.fileSystemFileOpenErrorFileFormatVersionTooNew)
				break
			case 'migrationFailed':
				if (parseFileResult.error.reason === MigrationFailureReason.TargetVersionTooNew) {
					description = msg(messages.fileSystemFileOpenErrorFileFormatVersionTooNew)
				} else {
					description = msg(messages.fileSystemFileOpenErrorGenericCorruptedFile)
				}
				break
			case 'invalidRecords':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				reportError(parseFileResult.error.cause)
				description = msg(messages.fileSystemFileOpenErrorGenericCorruptedFile)
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
			title: msg(messages.fileSystemFileOpenErrorTitle),
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
	msg: ReturnType<typeof useTranslation>,
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
					title: msg(messages.assetsFilesUploadFailed),
					severity: 'error',
				})
				console.error(error)
				return
			}
		})
	)
}

const IMPORT_GAP = 100
// Far enough right of the page's content that staged shapes can't overlap it
const IMPORT_STAGING_OFFSET = 100_000

/**
 * Import the contents of dropped `.tldr` files into the editor's current document. A single-page
 * file is placed on the current page in empty space; a multi-page file (or a single page that
 * won't fit on the current page) is added as new pages. The files import together as one undoable
 * step, and if their pages would go over the page limit then nothing is imported. Media stored in
 * a file as data urls is uploaded the same way pasted media is.
 *
 * @internal
 */
export async function importTldrawFiles(
	editor: Editor,
	{ files, point }: { files: File[]; point: VecLike },
	{ toasts, msg }: Pick<TLDefaultExternalContentHandlerOpts, 'toasts' | 'msg'>
) {
	if (editor.getIsReadonly()) return

	const parsedFiles: { pages: TLPage[]; contents: TLContent[] }[] = []
	for (const file of files) {
		const parseResult = parseTldrawJsonFile({
			schema: editor.store.schema,
			json: await file.text(),
		})
		if (!parseResult.ok) {
			toasts.addToast({
				title: msg(messages.fileSystemImportErrorTitle.id),
				description: getImportErrorDescription(editor, parseResult.error, msg),
				severity: 'error',
			})
			continue
		}
		const fileStore = parseResult.value
		const records = fileStore.allRecords()
		fileStore.dispose()

		const pages = records.filter((r): r is TLPage => r.typeName === 'page').sort(sortByIndex)
		const contents = pages.map((page) => getPageContent(editor, records, page.id))
		parsedFiles.push({ pages, contents })
	}

	// Decide every file's destination up front, so the page limit is checked for the whole drop.
	const contentForCurrentPage: TLContent[] = []
	const pagesToAdd: { page: TLPage; content: TLContent }[] = []
	let currentPageShapeCount = editor.getCurrentPageShapeIds().size
	for (const { pages, contents } of parsedFiles) {
		if (pages.length === 1) {
			const content = contents[0]
			if (content.shapes.length === 0) continue
			if (currentPageShapeCount + content.shapes.length <= editor.options.maxShapesPerPage) {
				contentForCurrentPage.push(content)
				currentPageShapeCount += content.shapes.length
				continue
			}
		}
		pages.forEach((page, i) => pagesToAdd.push({ page, content: contents[i] }))
	}

	if (!contentForCurrentPage.length && !pagesToAdd.length) return

	// putContentOntoCurrentPage would refuse these, leaving an empty page behind
	if (pagesToAdd.some(({ content }) => content.shapes.length > editor.options.maxShapesPerPage)) {
		toasts.addToast({
			title: msg(messages.fileSystemImportErrorTitle.id),
			description: msg(messages.fileSystemImportErrorTooManyShapes.id, {
				max: editor.options.maxShapesPerPage,
			}),
			severity: 'error',
		})
		return
	}

	if (editor.getPages().length + pagesToAdd.length > editor.options.maxPages) {
		toasts.addToast({
			title: msg(messages.fileSystemImportErrorTitle.id),
			description: msg(messages.fileSystemImportErrorTooManyPages.id, {
				max: editor.options.maxPages,
			}),
			severity: 'error',
		})
		return
	}

	// Locked shapes in the file still have to move into place
	editor.run(
		() => {
			editor.markHistoryStoppingPoint('import tldraw files')

			const placedIds: TLShapeId[] = []
			for (const content of contentForCurrentPage) {
				placedIds.push(...putContentInEmptySpace(editor, content, point))
			}

			if (pagesToAdd.length) {
				const originalPageId = editor.getCurrentPageId()
				for (const { page, content } of pagesToAdd) {
					const newPageId = PageRecordType.createId()
					editor.createPage({ id: newPageId, name: page.name, meta: page.meta })
					editor.setCurrentPage(newPageId)
					if (content.shapes.length === 0) continue
					editor.putContentOntoCurrentPage(content, { preservePosition: true })
					// The new page's camera starts at the origin, which may be nowhere near the content.
					const bounds = editor.getCurrentPageBounds()
					if (bounds) editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true })
				}
				editor.setCurrentPage(originalPageId)
			}

			if (placedIds.length) {
				editor.select(...placedIds)
				const bounds = editor.getSelectionPageBounds()
				if (bounds) {
					editor.zoomToBounds(bounds, {
						targetZoom: 1,
						animation: { duration: editor.options.animationMediumMs },
					})
				}
			}
		},
		{ ignoreShapeLock: true }
	)

	if (pagesToAdd.length) {
		toasts.addToast({
			title: msg(messages.fileSystemImportedPages.id, { count: pagesToAdd.length }),
			severity: 'success',
		})
	}
}

function getImportErrorDescription(
	editor: Editor,
	error: TldrawFileParseError,
	msg: TLDefaultExternalContentHandlerOpts['msg']
) {
	if (error.type === 'notATldrawFile' || error.type === 'invalidRecords') {
		editor.annotateError(error.cause, {
			origin: 'file-system.import.parse',
			willCrashApp: false,
			tags: { parseErrorType: error.type },
		})
		reportError(error.cause)
	}
	switch (error.type) {
		case 'fileFormatVersionTooNew':
			return msg(messages.fileSystemFileOpenErrorFileFormatVersionTooNew.id)
		case 'migrationFailed':
			return error.reason === MigrationFailureReason.TargetVersionTooNew
				? msg(messages.fileSystemFileOpenErrorFileFormatVersionTooNew.id)
				: msg(messages.fileSystemFileOpenErrorGenericCorruptedFile.id)
		case 'invalidRecords':
			return msg(messages.fileSystemFileOpenErrorGenericCorruptedFile.id)
		// Importing v1 documents isn't supported; opening one still is.
		case 'v1File':
		case 'notATldrawFile':
			return msg(messages.fileSystemFileOpenErrorNotATldrawFile.id)
		default:
			exhaustiveSwitchError(error, 'type')
	}
}

function getPageContent(editor: Editor, records: TLRecord[], pageId: TLPageId): TLContent {
	const shapesByParent = new Map<string, TLShape[]>()
	for (const record of records) {
		if (record.typeName !== 'shape') continue
		const siblings = shapesByParent.get(record.parentId)
		if (siblings) siblings.push(record)
		else shapesByParent.set(record.parentId, [record])
	}

	// Parents before children, and siblings in z-order: putContentOntoCurrentPage gives root
	// shapes fresh indices in the order it sees them.
	const shapes: TLShape[] = []
	const visit = (parentId: string) => {
		for (const shape of (shapesByParent.get(parentId) ?? []).sort(sortByIndex)) {
			shapes.push(shape)
			visit(shape.id)
		}
	}
	visit(pageId)

	const shapeIds = new Set<string>(shapes.map((s) => s.id))
	const assetIds = new Set<string>()
	for (const shape of shapes) {
		if ('assetId' in shape.props && shape.props.assetId) assetIds.add(shape.props.assetId)
	}

	return {
		// The file's records were migrated to the editor's schema when it was parsed
		schema: editor.store.schema.serialize(),
		shapes,
		rootShapeIds: shapes.filter((s) => s.parentId === pageId).map((s) => s.id as TLShapeId),
		bindings: records.filter(
			(r): r is TLBinding =>
				r.typeName === 'binding' && shapeIds.has(r.fromId) && shapeIds.has(r.toId)
		),
		assets: records.filter((r): r is TLAsset => r.typeName === 'asset' && assetIds.has(r.id)),
		// Notes are attributed to users; putContentOntoCurrentPage only creates ones that are missing
		users: records.filter((r): r is TLUser => r.typeName === 'user'),
	}
}

/**
 * Put content on the current page where it won't overlap existing shapes: centered on `point`
 * if that space is free, otherwise to the right of everything on the page. Returns the ids of
 * the root shapes it placed.
 */
function putContentInEmptySpace(editor: Editor, content: TLContent, point: VecLike): TLShapeId[] {
	const occupied = compact(
		editor.getCurrentPageShapes().map((shape) => editor.getShapePageBounds(shape))
	)
	const pageBounds = editor.getCurrentPageBounds()
	const target = Vec.From(point)

	// We can't measure the content until its shapes exist, so put it somewhere far from
	// everything first. Putting it on top of existing shapes could reparent it into a frame.
	const staging = new Vec((pageBounds?.maxX ?? 0) + IMPORT_STAGING_OFFSET, pageBounds?.midY ?? 0)
	editor.selectNone()
	editor.putContentOntoCurrentPage(content, { point: staging, select: true })

	// Selection is empty if the put was refused, e.g. by the shape limit
	const contentBounds = editor.getSelectionPageBounds()
	if (!contentBounds) return []

	let dest = Box.FromCenter(target, contentBounds.size)
	const padded = dest.clone().expandBy(IMPORT_GAP)
	if (occupied.some((b) => b.collides(padded))) {
		dest = new Box(
			pageBounds!.maxX + IMPORT_GAP,
			pageBounds!.minY,
			contentBounds.w,
			contentBounds.h
		)
	}
	const delta = Vec.Sub(maybeSnapToGrid(dest.point, editor), contentBounds.point)

	const placed = editor.getSelectedShapes()
	editor.updateShapes(
		placed.map((shape) => ({
			id: shape.id,
			type: shape.type,
			x: shape.x + delta.x,
			y: shape.y + delta.y,
		}))
	)
	return placed.map((shape) => shape.id)
}
