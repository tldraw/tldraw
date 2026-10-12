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
			? this.editor.getAsset<TLFileAsset>(shape.props.assetId)
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
		path.rect(0, 0, shape.props.w, shape.props.h)
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
By default tldraw handles image, video, and bookmark assets. An `AssetUtil` teaches the
editor about a new asset type, and a `ShapeUtil` with `handledAssetTypes` tells it what
shape to create when one of those assets lands on the canvas.

[1]
The custom asset type. Augmenting `TLGlobalAssetPropsMap` makes `TLAsset` (and
`editor.getAsset`) aware of it, the same way `TLGlobalShapePropsMap` works for shapes.

[2]
`FileAssetUtil` handles MIME-type matching and file-to-asset conversion for the new type.

[3]
Static `props` are the store validators for the asset's props, using the same `T`
validators as shape utils.

[4]
When a file is dropped or pasted, the editor asks each registered `AssetUtil` whether it
supports the file's MIME type. Only files that match reach `getAssetFromFile`.

[5]
`getAssetFromFile` builds the asset record from a dropped file. `src` is left `null`
because the asset store's `upload` fills in the URL after the file is stored.

[6]
`handledAssetTypes` connects the shape to the asset type: when a `file` asset is
created, the editor finds this shape util and calls `createShapeForAsset`.

[7]
Return the shape partial to place on the canvas for a new asset. Returning `null` would
skip creating a shape.

[8]
Once the asset store has uploaded the file and set `src`, the filename becomes a link.

[9]
Register both utils. No custom external content handler is needed: the default file
handler picks the matching `AssetUtil` and uploads through the asset store. Here that is
the default store, which inlines files as data URLs; a real app would pass its own
`TLAssetStore` via the `assets` prop (see the "Hosted images" example).
*/
