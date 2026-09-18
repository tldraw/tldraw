import { useEffect, useState } from 'react'
import {
	AssetUtil,
	BaseBoxShapeUtil,
	Editor,
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
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './audio-shape.css'

// There's a guide at the bottom of this file!

// --- Custom audio asset type ---

// [1]
const AUDIO_ASSET_TYPE = 'audio' as const

interface AudioAssetProps {
	name: string
	mimeType: string
	duration: number
	src: string | null
}

type TLAudioAsset = TLBaseAsset<typeof AUDIO_ASSET_TYPE, AudioAssetProps>

declare module 'tldraw' {
	interface TLGlobalAssetPropsMap {
		[AUDIO_ASSET_TYPE]: AudioAssetProps
	}
}

// [2]
class AudioAssetUtil extends AssetUtil<TLAudioAsset> {
	static override type = AUDIO_ASSET_TYPE

	static supportedMimeTypes = [
		'audio/mpeg',
		'audio/mp3',
		'audio/mp4',
		'audio/ogg',
		'audio/wav',
		'audio/x-wav',
		'audio/x-m4a',
		'audio/aac',
		'audio/flac',
		'audio/webm',
	] as const

	static override props = {
		name: T.string,
		mimeType: T.string,
		duration: T.number,
		src: T.srcUrl.nullable(),
	}

	override getDefaultProps(): TLAudioAsset['props'] {
		return {
			name: '',
			mimeType: '',
			duration: 0,
			src: null,
		}
	}

	override getSupportedMimeTypes() {
		return [...AudioAssetUtil.supportedMimeTypes]
	}

	// [3]
	override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<TLAudioAsset> {
		return {
			id: assetId,
			type: AUDIO_ASSET_TYPE,
			typeName: 'asset',
			props: {
				name: file.name,
				mimeType: file.type,
				duration: await getAudioDuration(file),
				src: null,
			},
			meta: {},
		}
	}
}

async function getAudioDuration(file: File): Promise<number> {
	const url = URL.createObjectURL(file)
	try {
		return await new Promise<number>((resolve) => {
			const audio = document.createElement('audio')
			audio.onloadedmetadata = () => resolve(audio.duration)
			audio.onerror = () => resolve(0)
			audio.src = url
		})
	} finally {
		URL.revokeObjectURL(url)
	}
}

// --- Custom shape to play audio assets ---

const AUDIO_SHAPE_TYPE = 'audio-player' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[AUDIO_SHAPE_TYPE]: {
			assetId: TLAssetId | null
			w: number
			h: number
		}
	}
}

type AudioPlayerShape = TLShape<typeof AUDIO_SHAPE_TYPE>

const AUDIO_SHAPE_WIDTH = 300
const AUDIO_SHAPE_HEIGHT = 84

// [4]
class AudioPlayerShapeUtil extends BaseBoxShapeUtil<AudioPlayerShape> {
	static override type = AUDIO_SHAPE_TYPE
	static override handledAssetTypes = [AUDIO_ASSET_TYPE] as const

	override getDefaultProps() {
		return {
			assetId: null as TLAssetId | null,
			w: AUDIO_SHAPE_WIDTH,
			h: AUDIO_SHAPE_HEIGHT,
		}
	}

	// [5]
	override createShapeForAsset(asset: TLAsset, position: VecModel): TLShapePartial {
		return {
			id: createShapeId(),
			type: AUDIO_SHAPE_TYPE,
			x: position.x,
			y: position.y,
			props: {
				assetId: asset.id,
				w: AUDIO_SHAPE_WIDTH,
				h: AUDIO_SHAPE_HEIGHT,
			},
		}
	}

	override component(shape: AudioPlayerShape) {
		return <AudioPlayer shape={shape} />
	}

	override getIndicatorPath(shape: AudioPlayerShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function AudioPlayer({ shape }: { shape: AudioPlayerShape }) {
	const editor = useEditor()

	// [6]
	const asset = useValue(
		'audio asset',
		() =>
			shape.props.assetId
				? (editor.getAsset(shape.props.assetId) as unknown as TLAudioAsset | undefined)
				: undefined,
		[editor, shape.props.assetId]
	)
	const url = useAssetUrl(editor, asset)

	return (
		<HTMLContainer>
			<div className="audio-shape">
				<div className="audio-shape__header">
					<span className="audio-shape__icon">🎵</span>
					<span className="audio-shape__name">{asset?.props.name ?? 'Audio'}</span>
					{asset && asset.props.duration > 0 && (
						<span className="audio-shape__duration">{formatDuration(asset.props.duration)}</span>
					)}
				</div>
				{url ? (
					// [7]
					<audio
						className="audio-shape__player"
						controls
						preload="metadata"
						src={url}
						onPointerDown={(e) => e.stopPropagation()}
					/>
				) : (
					<div className="audio-shape__loading">Loading audio…</div>
				)}
			</div>
		</HTMLContainer>
	)
}

// [8]
function useAssetUrl(editor: Editor, asset: TLAudioAsset | undefined) {
	const [url, setUrl] = useState<string | null>(null)

	const assetId = asset?.id
	const src = asset?.props.src

	useEffect(() => {
		if (!assetId) {
			setUrl(null)
			return
		}
		let isCancelled = false
		editor.resolveAssetUrl(assetId, {}).then((resolvedUrl) => {
			if (!isCancelled) setUrl(resolvedUrl)
		})
		return () => {
			isCancelled = true
		}
	}, [editor, assetId, src])

	return url
}

function formatDuration(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// [9]
export default function AudioShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUtils={[AudioAssetUtil]}
				shapeUtils={[AudioPlayerShapeUtil]}
				persistenceKey="audio-shape-example"
				onMount={(editor) => {
					if (editor.getCurrentPageShapes().length === 0) {
						editor.createShapes([
							{
								id: createShapeId(),
								type: 'text',
								x: 100,
								y: 100,
								props: {
									richText: toRichText('Drag an audio file (mp3, ogg, wav, m4a…) onto the board'),
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
This example shows how to add audio support to the canvas using a custom asset type
and a custom shape. By default, tldraw supports images, videos, and bookmarks. With a
custom AssetUtil and ShapeUtil, dropped audio files become playable audio shapes.

[1]
Define a custom asset type using TLBaseAsset. The props describe what we store for
each audio file: its name, MIME type, duration, and a source URL. We augment
TLGlobalAssetPropsMap so that TLAsset includes our custom type.

[2]
AudioAssetUtil extends AssetUtil and tells the editor how to handle audio files.
When a user drags a file onto the canvas, the editor checks each registered
AssetUtil's getSupportedMimeTypes to find one that accepts the file's MIME type.

[3]
getAssetFromFile creates an asset record from a dropped file. Metadata extraction can
be async: here we load the file into an audio element to read its duration. This is
also where you could extract richer metadata like ID3 tags or cover art. The src is
left as null because TLAssetStore.upload provides the URL after the file is stored.

[4]
AudioPlayerShapeUtil declares handledAssetTypes to tell the editor that this shape
can be created from audio assets.

[5]
createShapeForAsset returns the shape partial that the editor places on the canvas
when an audio asset is dropped.

[6]
The component resolves the shape's asset reactively with useValue, so the shape
re-renders when the asset record updates (for example when the upload finishes and
src is set).

[7]
We render a native audio element with built-in controls. Stopping pointer-down
propagation lets you interact with the player without the canvas starting a drag —
you can still move the shape by dragging its header.

[8]
Assets are resolved to URLs through TLAssetStore.resolve via editor.resolveAssetUrl.
Here we use the default store, which inlines files as data URLs. In a real app you'd
provide a custom TLAssetStore via the `assets` prop to upload files to your server
(see the "hosted images" example).

[9]
Pass the custom AssetUtil and ShapeUtil to the Tldraw component. The assetUtils prop
registers AudioAssetUtil alongside the default image, video, and bookmark utils. No
custom file handler is needed — the default handler uses our AssetUtil for matching
MIME types.

Try it: drag an audio file onto the canvas and press play!
*/
