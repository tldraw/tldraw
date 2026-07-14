import {
	AssetRecordType,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	Editor,
	FileHelpers,
	MediaHelpers,
	StateNode,
	TLAssetId,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	VecLike,
	atom,
	track,
	uniqueId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './stamp-tool.css'

// There's a guide at the bottom of this file!

const STAMP_SIZE = 64
const PNG_SIZE = 128

// [1]
type Stamp =
	| { type: 'emoji'; emoji: string }
	| { type: 'image'; id: string; src: string; w: number; h: number; mimeType: string }

const stamps = atom<Stamp[]>('stamps', [
	{ type: 'emoji', emoji: '👍' },
	{ type: 'emoji', emoji: '❤️' },
	{ type: 'emoji', emoji: '🔥' },
	{ type: 'emoji', emoji: '⭐' },
	{ type: 'emoji', emoji: '😂' },
	{ type: 'emoji', emoji: '🎉' },
])
const currentStamp = atom<Stamp>('current stamp', stamps.get()[0])

function getStampId(stamp: Stamp) {
	return stamp.type === 'emoji'
		? 'emoji-' +
				Array.from(stamp.emoji)
					.map((char) => char.codePointAt(0)!.toString(16))
					.join('-')
		: stamp.id
}

// [2]
class StampTool extends StateNode {
	static override id = 'stamp'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerDown() {
		stampAtPoint(this.editor, this.editor.inputs.getCurrentPagePoint(), currentStamp.get())
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

// [3]
function getStampAssetId(editor: Editor, stamp: Stamp): TLAssetId {
	const assetId = AssetRecordType.createId(getStampId(stamp))
	if (editor.getAsset(assetId)) return assetId

	let src: string
	let w: number
	let h: number
	let mimeType: string

	if (stamp.type === 'emoji') {
		const canvas = document.createElement('canvas')
		canvas.width = PNG_SIZE
		canvas.height = PNG_SIZE
		const ctx = canvas.getContext('2d')!
		ctx.font = `${PNG_SIZE * 0.8}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(stamp.emoji, PNG_SIZE / 2, PNG_SIZE / 2 + PNG_SIZE * 0.05)
		src = canvas.toDataURL('image/png')
		w = PNG_SIZE
		h = PNG_SIZE
		mimeType = 'image/png'
	} else {
		;({ src, w, h, mimeType } = stamp)
	}

	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: { name: 'stamp', src, w, h, mimeType, isAnimated: false },
			meta: {},
		},
	])
	return assetId
}

// [4]
function stampAtPoint(editor: Editor, point: VecLike, stamp: Stamp) {
	const scale = stamp.type === 'image' ? STAMP_SIZE / Math.max(stamp.w, stamp.h) : 1
	const w = stamp.type === 'image' ? stamp.w * scale : STAMP_SIZE
	const h = stamp.type === 'image' ? stamp.h * scale : STAMP_SIZE

	editor.run(() => {
		editor.markHistoryStoppingPoint('stamp')
		const assetId = getStampAssetId(editor, stamp)
		editor.createShape({
			type: 'image',
			x: point.x - w / 2,
			y: point.y - h / 2,
			props: { assetId, w, h },
		})
	})
}

// [5]
function uploadStamp(editor: Editor) {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = DEFAULT_SUPPORTED_IMAGE_TYPES.join(',')
	input.addEventListener('change', async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return

		const src = await FileHelpers.blobToDataUrl(file)
		const { w, h } = await MediaHelpers.getImageSize(file)
		const stamp: Stamp = { type: 'image', id: uniqueId(), src, w, h, mimeType: file.type }

		stamps.update((s) => [...s, stamp])
		currentStamp.set(stamp)
		editor.setCurrentTool('stamp')
	})
	input.click()
}

// [6]
const StampPanel = track(() => {
	const editor = useEditor()
	const isStampToolActive = editor.getCurrentToolId() === 'stamp'
	const currentStampId = getStampId(currentStamp.get())

	return (
		<div className="tlui-menu stamp-panel">
			{stamps.get().map((stamp) => (
				<TldrawUiButton
					key={getStampId(stamp)}
					type="icon"
					className="stamp-panel-button"
					data-active={isStampToolActive && currentStampId === getStampId(stamp)}
					onClick={() => {
						currentStamp.set(stamp)
						editor.setCurrentTool('stamp')
					}}
				>
					{stamp.type === 'emoji' ? (
						stamp.emoji
					) : (
						<img className="stamp-panel-thumbnail" src={stamp.src} alt="custom stamp" />
					)}
				</TldrawUiButton>
			))}
			<TldrawUiButton
				type="icon"
				className="stamp-panel-button stamp-panel-upload"
				title="Upload a stamp"
				onClick={() => uploadStamp(editor)}
			>
				+
			</TldrawUiButton>
		</div>
	)
})

const components: TLComponents = {
	TopPanel: StampPanel,
}

const tools = [StampTool]

export default function StampToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw tools={tools} components={components} />
		</div>
	)
}

/*
This example shows how to build a stamp tool: pick a stamp from a panel, then
click the canvas to place it. Each stamp is placed as an image shape — emoji
stamps are rendered to a PNG, and you can also upload your own image to use as
a stamp.

[1]
Stamps are plain data held in an `atom` from tldraw's signals library: either
an emoji, or an uploaded image with a data URL source. This is the extension
point — to ship a new default stamp, add an entry to the array. Because the
panel reads the atom inside a `track`ed component, stamps added at runtime
(see [5]) show up automatically.

[2]
The stamp tool is a `StateNode`, the same state machine primitive tldraw's own
tools are built from. It sets a crosshair cursor while active, and on pointer
down it stamps at the click point (in page space, from `editor.inputs`). The
tool stays active after stamping so you can stamp repeatedly; pressing Escape
cancels back to the select tool.

[3]
Every stamp becomes a shared image asset, created once via
`editor.createAssets`. Emoji are drawn to a 128px PNG using a canvas element —
using a PNG instead of a text shape means stamps look identical in exports and
for collaborators regardless of platform emoji fonts. Uploaded stamps already
have an image source, so their data URL is stored on the asset directly. The
asset id is derived from the stamp's id, so stamping the same stamp twice
reuses one shared asset — image shapes only reference assets by id.

[4]
Stamping creates an image shape centered on the click point, linked to the
asset. Uploaded images are scaled to fit the stamp size while keeping their
aspect ratio. `markHistoryStoppingPoint` makes each stamp its own undo step.

[5]
The upload button opens a file picker. The chosen image is read as a data URL
with `FileHelpers.blobToDataUrl`, measured with `MediaHelpers.getImageSize`,
appended to the stamps atom, and selected as the current stamp with the tool
activated — so you can stamp with your own image right away.

[6]
The picker panel goes in the `TopPanel` component slot. Clicking a stamp sets
the current stamp atom and switches to the stamp tool with
`editor.setCurrentTool`. The active stamp is highlighted by checking
`editor.getCurrentToolId()` — the `track` wrapper re-renders the panel when
the tool or the atoms change.
*/
