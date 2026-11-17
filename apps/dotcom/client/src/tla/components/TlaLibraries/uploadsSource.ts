import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryTarget,
} from '@tldraw/libraries'
import {
	AssetRecordType,
	atom,
	computed,
	createShapeId,
	createTLSchema,
	defineMessages,
	fetch,
	MediaHelpers,
	PageRecordType,
	type IndexKey,
	type TLImageAsset,
	type TLImageShape,
} from 'tldraw'
import { USER_CONTENT_URL } from '../../../utils/config'
import { isDevelopmentEnv, isPreviewEnv } from '../../../utils/env'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	images: { defaultMessage: 'Images' },
})

/** An upload, as the sync worker's `/app/my-uploads` lists it. */
interface Upload {
	objectName: string
	fileId: string
	uploadedAt: number
}

const LIBRARY_ID = LibraryRecordType.createId('uploads')

// The asset store names an upload `<id>-<file name>`, with the id 21 characters long and every
// non-word character of the file name turned into a dash, so `photo.png` is `<id>-photo-png`.
const ID_PREFIX_LENGTH = 22
// The images the worker lists.
const IMAGE_OBJECT_NAME = /-(png|jpe?g|gif|webp|avif|svg)$/i

// As big as a thumbnail rendered from shapes, and in a format a workspace library accepts as one.
const THUMBNAIL_SIZE = 512

const getObjectName = (src: string) => src.split('/').pop() ?? ''

const getDisplayName = (objectName: string) =>
	objectName.slice(ID_PREFIX_LENGTH).replace(IMAGE_OBJECT_NAME, '.$1')

// Resized by Cloudflare's Image Transformations, which only run where the zone is set up: in dev
// and previews, the upload itself. An SVG is its own thumbnail, as the transformations pass it
// through unchanged.
function getThumbnailUrl(objectName: string) {
	if (isDevelopmentEnv || isPreviewEnv || objectName.endsWith('-svg')) {
		return `${USER_CONTENT_URL}/${objectName}`
	}
	const size = `width=${THUMBNAIL_SIZE},height=${THUMBNAIL_SIZE}`
	return `${USER_CONTENT_URL}/cdn-cgi/image/${size},fit=scale-down,anim=false,format=webp/${objectName}`
}

/**
 * The images the user uploaded to their files, as one read-only library, newest first. They are
 * listed by the sync worker (`/app/my-uploads`): the user's own uploads only, in files that aren't
 * deleted. The list is loaded by {@link refresh}, and an upload this tab makes is listed at once by
 * {@link noteUpload}, since its row is written after the upload returns.
 *
 * An item places an image shape over an asset whose src is the upload and whose `fileId` is the
 * upload's file, as an image copied from that file would be: a board it's placed on, or a
 * workspace library it's copied to, makes its own copy of the upload, as for a pasted image. The
 * asset's id comes from the upload, so placing it again on a board reuses the asset.
 */
export class TldrawAppUploadsSource implements LibrarySource {
	readonly id = 'dotcom-uploads'

	private readonly listed = atom<Upload[]>('listed uploads', [])
	// Uploads this tab made that the last listing didn't have yet.
	private readonly noted = atom<Upload[]>('noted uploads', [])
	private readonly assets = new Map<string, Promise<TLImageAsset>>()

	private readonly uploads$ = computed('uploads', () => {
		const listed = this.listed.get()
		const listedNames = new Set(listed.map((upload) => upload.objectName))
		const noted = this.noted.get().filter((upload) => !listedNames.has(upload.objectName))
		return [...noted, ...listed]
	})

	private readonly library$ = computed('uploads library', () =>
		LibraryRecordType.create({ id: LIBRARY_ID, name: this.app.msg(messages.images) })
	)

	private readonly items$ = computed('upload items', () =>
		this.uploads$.get().map((upload) =>
			LibraryItemRecordType.create({
				id: LibraryItemRecordType.createId(upload.objectName),
				libraryId: LIBRARY_ID,
				name: getDisplayName(upload.objectName),
				thumbnail: getThumbnailUrl(upload.objectName),
				createdAt: upload.uploadedAt,
			})
		)
	)

	constructor(
		private readonly app: Pick<TldrawApp, 'msg'>,
		private readonly getToken: () => Promise<string | undefined>
	) {}

	/** Loads the list of uploads again. */
	async refresh() {
		const token = await this.getToken()
		const response = await fetch('/api/app/my-uploads', {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		})
		if (!response.ok) throw new Error(`Couldn't list the uploads: ${response.status}`)
		const { uploads } = (await response.json()) as { uploads: Upload[] }
		const names = new Set(uploads.map((upload) => upload.objectName))
		this.noted.update((noted) => noted.filter((upload) => !names.has(upload.objectName)))
		this.listed.set(uploads)
	}

	/** Lists an upload this tab just made, ahead of the others, until a listing has it. */
	noteUpload({ src, fileId }: { src: string; fileId: string }) {
		const objectName = getObjectName(src)
		if (!IMAGE_OBJECT_NAME.test(objectName)) return
		this.noted.update((noted) => [
			{ objectName, fileId, uploadedAt: Date.now() },
			...noted.filter((upload) => upload.objectName !== objectName),
		])
	}

	getLibraries(): TLLibrary[] {
		return [this.library$.get()]
	}

	getItems(libraryId: TLLibraryId): TLLibraryItem[] {
		return libraryId === LIBRARY_ID ? this.items$.get() : []
	}

	async getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		const upload = this.uploads$
			.get()
			.find((u) => LibraryItemRecordType.createId(u.objectName) === itemId)
		if (!upload) throw new LibraryNotFoundError(itemId)
		const asset = await this.getAsset(upload)
		const shape: TLImageShape = {
			id: createShapeId(),
			typeName: 'shape',
			type: 'image',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as IndexKey,
			parentId: PageRecordType.createId('page'),
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				w: asset.props.w,
				h: asset.props.h,
				assetId: asset.id,
				playing: true,
				url: '',
				crop: null,
				flipX: false,
				flipY: false,
				altText: '',
			},
		}
		return {
			formatVersion: 1,
			content: {
				shapes: [shape],
				bindings: [],
				rootShapeIds: [shape.id],
				assets: [asset],
				schema: createTLSchema().serialize(),
			},
		}
	}

	can(_action: TLLibraryAction, _target?: TLLibraryTarget) {
		return false
	}

	async createLibrary(): Promise<TLLibrary> {
		throw new LibraryPermissionError('createLibrary')
	}

	async renameLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('renameLibrary', libraryId)
	}

	async deleteLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('deleteLibrary', libraryId)
	}

	async addItem(libraryId: TLLibraryId): Promise<TLLibraryItem> {
		throw new LibraryPermissionError('addItem', libraryId)
	}

	async renameItem(): Promise<void> {
		throw new LibraryPermissionError('renameItem', LIBRARY_ID)
	}

	async deleteItem(): Promise<void> {
		throw new LibraryPermissionError('deleteItem', LIBRARY_ID)
	}

	/**
	 * The upload's asset, sized from the image as a pasted image is. Fetched once per upload; a
	 * fetch that fails is tried again next time.
	 */
	private getAsset(upload: Upload) {
		let asset = this.assets.get(upload.objectName)
		if (!asset) {
			asset = loadAsset(upload)
			asset.catch(() => this.assets.delete(upload.objectName))
			this.assets.set(upload.objectName, asset)
		}
		return asset
	}
}

async function loadAsset({ objectName, fileId }: Upload): Promise<TLImageAsset> {
	const src = `${USER_CONTENT_URL}/${objectName}`
	const response = await fetch(src)
	if (!response.ok) throw new LibraryNotFoundError(LibraryItemRecordType.createId(objectName))
	const blob = await response.blob()
	const size = await MediaHelpers.getImageSize(blob)
	return AssetRecordType.create({
		id: AssetRecordType.createId(objectName),
		type: 'image',
		props: {
			name: getDisplayName(objectName),
			src,
			w: size.w,
			h: size.h,
			mimeType: blob.type,
			isAnimated: await MediaHelpers.isAnimated(blob),
			fileSize: blob.size,
			...(size.pixelRatio === 1 ? {} : { pixelRatio: size.pixelRatio }),
		},
		meta: { fileId },
	}) as TLImageAsset
}
