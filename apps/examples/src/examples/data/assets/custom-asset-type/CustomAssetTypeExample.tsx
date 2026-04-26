import {
	AssetUtil,
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLAsset,
	TLAssetId,
	TLBaseAsset,
	TLShape,
	TLShapePartial,
	Tldraw,
	VecModel,
	createShapeId,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// --- Custom asset type ---

// [1]
const FILE_ASSET_TYPE = 'file' as const

interface FileAssetProps {
	name: string
	size: number
	mimeType: string
	src: string | null
}

type TLFileAsset = TLBaseAsset<typeof FILE_ASSET_TYPE, FileAssetProps>

declare module 'tldraw' {
	interface TLGlobalAssetPropsMap {
		[FILE_ASSET_TYPE]: FileAssetProps
	}
}

// [2]
class FileAssetUtil extends AssetUtil<TLFileAsset> {
	static override type = FILE_ASSET_TYPE

	static supportedMimeTypes = [
		'application/pdf',
		'text/plain',
		'text/csv',
		'application/json',
		'application/zip',
		'application/xml',
		'text/xml',
	] as const

	static supportedExtensions = ['.pdf', '.txt', '.csv', '.json', '.zip', '.xml'] as const

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
		return [...FileAssetUtil.supportedMimeTypes]
	}

	// [5]
	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLFileAsset> {
		return {
			id: assetId,
			type: FILE_ASSET_TYPE,
			typeName: 'asset',
			props: {
				name: file.name,
				size: file.size,
				mimeType: file.type,
				src: null,
			},
			meta: {},
		}
	}
}

// --- Custom shape to display file assets ---

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

// [6]
class FileCardShapeUtil extends BaseBoxShapeUtil<FileCardShape> {
	static override type = FILE_CARD_TYPE
	static override handledAssetTypes = [FILE_ASSET_TYPE] as const

	override getDefaultProps() {
		return {
			assetId: null as TLAssetId | null,
			w: 200,
			h: 64,
		}
	}

	// [7]
	override createShapeForAsset(asset: TLAsset, position: VecModel): TLShapePartial {
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
							{/* [8] */}
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

	override getIndicatorPath(shape: FileCardShape) {
		const path = new Path2D()
		path.roundRect(0, 0, shape.props.w, shape.props.h, 8)
		return path
	}
}

// [9]
export default function CustomAssetTypeExample() {
	const instructionText = `Drag a file with these supported extensions ${FileAssetUtil.supportedExtensions.join(', ')} onto the board`

	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUtils={[FileAssetUtil]}
				shapeUtils={[FileCardShapeUtil]}
				persistenceKey="custom-asset-type-example"
				onMount={(editor) => {
					if (editor.getCurrentPageShapes().length === 0) {
						editor.createShapes([
							{
								id: createShapeId(),
								type: 'text',
								x: 100,
								y: 100,
								props: {
									richText: toRichText(instructionText),
								},
							},
						])
					}
				}}
			/>
		</div>
	)
}

/*
This example shows how to use AssetUtil and ShapeUtil together to add support for
non-media file types. By default, tldraw supports images, videos, and bookmarks.
With a custom AssetUtil and ShapeUtil, you can handle any file type—like PDFs, CSVs,
or text files—and display them on the canvas with a custom shape.

[1]
Define a custom asset type using TLBaseAsset. The props describe what information we
store for each file: its name, size, MIME type, and a source URL for downloading.
We augment TLGlobalAssetPropsMap so that TLAsset includes our custom type.

[2]
FileAssetUtil extends AssetUtil and tells the editor how to handle our custom asset type.
It handles file-to-asset conversion and MIME type matching.

[3]
Static props define the schema validators for the asset's properties. These use
validators from T (e.g. T.string, T.number) for store validation.

[4]
getSupportedMimeTypes returns the MIME types this asset util handles. When a user drags
a file onto the canvas, the editor checks each registered AssetUtil to find one that
accepts the file's MIME type.

[5]
getAssetFromFile creates an asset record from a dropped file. This is called during the
file-handling pipeline to extract metadata before upload. The src is left as null here
because TLAssetStore.upload will provide the URL after the file is stored.

[6]
FileCardShapeUtil declares handledAssetTypes to tell the editor that this shape can be
created from file assets. It renders files as cards on the canvas.

[7]
createShapeForAsset returns a shape partial that the editor places on the canvas when
this asset is created. The shape util declares which asset types it handles, and the
editor calls this method to produce the shape.

[8]
If the asset has a src URL, the filename becomes a clickable download link.

[9]
We pass both the custom AssetUtil and ShapeUtil to the Tldraw component. The assetUtils
prop registers our FileAssetUtil alongside the default image, video, and bookmark utils.
No custom file handler is needed — the default handler automatically uses our AssetUtil
for matching MIME types and uploads files via TLAssetStore. In a real app, you'd provide
a custom TLAssetStore via the `assets` prop to upload files to your server (see the
"hosted images" example). Here we use the default store which inlines files as data URLs.

Try it: drag a PDF, text file, or CSV onto the canvas!
*/
