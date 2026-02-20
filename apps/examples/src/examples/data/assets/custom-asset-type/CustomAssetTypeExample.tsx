import {
	AssetRecordType,
	AssetUtil,
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLAssetId,
	TLBaseAsset,
	TLShape,
	TLShapePartial,
	Tldraw,
	VecModel,
	createShapeId,
	getHashForBuffer,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// --- Custom asset type ---

// [1]
const FILE_ASSET_TYPE = 'file' as const

type TLFileAsset = TLBaseAsset<
	typeof FILE_ASSET_TYPE,
	{
		name: string
		size: number
		mimeType: string
		src: string | null
	}
>

// [2]
class FileAssetUtil extends AssetUtil<any> {
	static override type = FILE_ASSET_TYPE

	// [3]
	static override props = {
		name: T.string,
		size: T.number,
		mimeType: T.string,
		src: T.string.nullable(),
	}

	override getDefaultProps(): TLFileAsset['props'] {
		return {
			name: '',
			size: 0,
			mimeType: '',
			src: null,
		}
	}

	// [4]
	override getSupportedMimeTypes() {
		return [
			'application/pdf',
			'text/plain',
			'text/csv',
			'application/json',
			'application/zip',
			'application/xml',
			'text/xml',
		]
	}

	// [5]
	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLFileAsset> {
		const hash = getHashForBuffer(await file.arrayBuffer())
		const id = assetId ?? (`asset:${hash}` as TLAssetId)

		return {
			id,
			type: FILE_ASSET_TYPE,
			typeName: 'asset',
			props: {
				name: file.name,
				size: file.size,
				mimeType: file.type,
				src: '',
			},
			meta: {},
		}
	}

	// [6]
	override createShape(asset: TLFileAsset, position: VecModel): TLShapePartial {
		return {
			id: createShapeId(),
			type: FILE_CARD_TYPE,
			x: position.x,
			y: position.y,
			props: {
				assetId: asset.id,
				w: 200,
				h: 64,
			},
		}
	}
}

// --- Custom shape to display file assets ---

// [7]
const FILE_CARD_TYPE = 'file-card' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[FILE_CARD_TYPE]: {
			assetId: TLAssetId | null
			w: number
			h: number
		}
	}
}

type FileCardShape = TLShape<typeof FILE_CARD_TYPE>

function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	const value = bytes / Math.pow(1024, i)
	return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`
}

// [8]
class FileCardShapeUtil extends BaseBoxShapeUtil<FileCardShape> {
	static override type = FILE_CARD_TYPE

	override getDefaultProps() {
		return {
			assetId: null as TLAssetId | null,
			w: 200,
			h: 64,
		}
	}

	override component(shape: FileCardShape) {
		const asset = shape.props.assetId
			? (this.editor.getAsset(shape.props.assetId) as unknown as TLFileAsset | undefined)
			: null

		const name = asset?.props.name ?? 'Unknown file'
		const size = asset?.props.size ?? 0
		const src = asset?.props.src

		return (
			<HTMLContainer>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '10px 14px',
						background: 'var(--color-background)',
						border: '1px solid var(--color-muted-2)',
						borderRadius: 8,
						height: '100%',
						boxSizing: 'border-box',
						fontFamily: 'sans-serif',
						overflow: 'hidden',
					}}
				>
					<div style={{ fontSize: 24, flexShrink: 0 }}>📄</div>
					<div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 13,
								fontWeight: 500,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								color: 'var(--color-text-1)',
							}}
						>
							{/* [9] */}
							{src ? (
								<a
									href={src}
									target="_blank"
									rel="noreferrer"
									style={{ color: 'inherit', textDecoration: 'underline' }}
								>
									{name}
								</a>
							) : (
								name
							)}
						</div>
						<div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
							{formatFileSize(size)}
						</div>
					</div>
				</div>
			</HTMLContainer>
		)
	}

	override indicator(shape: FileCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
	}
}

// [10]
export default function CustomAssetTypeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUtils={[FileAssetUtil]}
				shapeUtils={[FileCardShapeUtil]}
				onMount={(editor) => {
					// [11]
					editor.registerExternalAssetHandler('file', async ({ file, assetId }) => {
						const assetUtil = editor.getAssetUtilForMimeType(file.type)
						if (!assetUtil) throw new Error(`Unsupported file type: ${file.type}`)

						const hash = getHashForBuffer(await file.arrayBuffer())
						assetId ??= AssetRecordType.createId(hash)

						const asset = await assetUtil.getAssetFromFile(file, assetId)
						if (!asset) throw new Error('Could not create asset')

						// In a real app, you'd upload the file to a server here and set
						// asset.props.src to the URL. For this example we use a data URL.
						const reader = new FileReader()
						const src = await new Promise<string>((resolve) => {
							reader.onload = () => resolve(reader.result as string)
							reader.readAsDataURL(file)
						})

						return AssetRecordType.create({ ...asset, props: { ...asset.props, src } })
					})
				}}
			/>
		</div>
	)
}

/*
This example shows how to use the AssetUtil API to add support for non-media file types.
By default, tldraw supports images, videos, and bookmarks. With a custom AssetUtil, you
can handle any file type—like PDFs, CSVs, or text files—and display them on the canvas
with a custom shape.

[1]
Define a custom asset type using TLBaseAsset. The props describe what information we
store for each file: its name, size, MIME type, and a source URL for downloading.

[2]
FileAssetUtil extends AssetUtil and tells the editor how to handle our custom asset type.

[3]
Static props define the schema validators for the asset's properties. These use
validators from T (e.g. T.string, T.number) for store validation.

[4]
getSupportedMimeTypes returns the MIME types this asset util handles. When a user drags
a file onto the canvas, the editor checks each registered AssetUtil to find one that
accepts the file's MIME type.

[5]
getAssetFromFile creates an asset record from a dropped file. This is called during the
file-handling pipeline to extract metadata before upload.

[6]
createShape returns a shape partial that the editor places on the canvas when this
asset is created. Here we create a file-card shape that references the asset.

[7]
We define a custom shape type to display file assets on the canvas. The shape has an
assetId prop that references the file asset, plus width and height for layout.

[8]
FileCardShapeUtil renders the file as a card showing the filename, size, and a download
link. It reads the asset from the editor's store to get the file metadata.

[9]
If the asset has a src URL, the filename becomes a clickable download link.

[10]
We pass both the custom AssetUtil and ShapeUtil to the Tldraw component. The assetUtils
prop registers our FileAssetUtil alongside the default image, video, and bookmark utils.

[11]
We override the default 'file' external asset handler to support our custom asset type.
The handler uses getAssetUtilForMimeType to find the right AssetUtil for each file,
then creates the asset. In a real application, you'd upload the file to your server
and set the src to a permanent URL. This example uses data URLs for simplicity.

Try it: drag a PDF, text file, or CSV onto the canvas!
*/
