import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLArrowShape,
	TLComponents,
	TLShapeId,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	createShapeId,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ZipArrowShapeUtil } from './ZipArrowShapeUtil'
import { ZipTieOverlayUtil } from './ZipTieOverlayUtil'
import { ZipTieBindingUtil, ZipTieShapeUtil } from './ZipTieShapeUtil'
import { ZipTieTool } from './ZipTieTool'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [ZipArrowShapeUtil, ZipTieShapeUtil]
const bindingUtils = [ZipTieBindingUtil]
const tools = [ZipTieTool]
const overlayUtils = [ZipTieOverlayUtil]

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"><path d="M4 8C10 8 11 13.5 15 13.5S20 8 26 8M4 22C10 22 11 16.5 15 16.5S20 22 26 22"/><rect x="12.5" y="10" width="5" height="10" rx="2.5" fill="black" stroke="none"/></svg>`

const assetUrls: TLUiAssetUrlOverrides = {
	icons: { 'zip-tie': `data:image/svg+xml;utf8,${encodeURIComponent(ICON)}` },
}

const overrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['zip-tie'] = {
			id: 'zip-tie',
			icon: 'zip-tie',
			label: 'Zip tie',
			kbd: 'z',
			onSelect: () => editor.setCurrentTool('zip-tie'),
		}
		return tools
	},
	// [2]
	actions(editor, actions) {
		delete actions['select-zoom-tool']
		return actions
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isZipTieSelected = useIsToolSelected(tools['zip-tie'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['zip-tie']} isSelected={isZipTieSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['zip-tie']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

export default function ZipTieToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				tools={tools}
				overlayUtils={overlayUtils}
				overrides={overrides}
				assetUrls={assetUrls}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) createStarterDiagram(editor)
					editor.setCurrentTool('zip-tie')
				}}
			/>
		</div>
	)
}

// [3]
function createStarterDiagram(editor: Editor) {
	const box = (x: number, y: number, w: number, h: number) => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x, y, props: { w, h } })
		return id
	}
	const arrow = (from: TLShapeId, to: TLShapeId, color: TLArrowShape['props']['color']) => {
		const id = createShapeId()
		editor.createShape<TLArrowShape>({ id, type: 'arrow', props: { color } })
		editor.createBindings(
			(['start', 'end'] as const).map((terminal) => ({
				type: 'arrow',
				fromId: id,
				toId: terminal === 'start' ? from : to,
				props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
			}))
		)
	}

	editor.run(() => {
		const source = box(0, 200, 160, 120)
		arrow(source, box(420, 40, 160, 80), 'green')
		arrow(source, box(440, 380, 220, 180), 'green')

		const left = [box(0, 700, 120, 80), box(0, 840, 120, 80), box(0, 980, 120, 80)]
		const right = [box(900, 700, 120, 80), box(900, 840, 120, 80), box(900, 980, 120, 80)]
		left.forEach((from, i) => arrow(from, right[(i + 1) % 3], 'violet'))
	})

	editor.zoomToFit({ animation: { duration: 0 } })
}

/*
Pick the zip tie tool (or press Z) and drag a line across some arrows. When you let go, a zip tie
is created where the line crossed them, and the arrows are pulled together to pass through it.
Tie the same arrows again somewhere else and the stretch between the two ties runs perfectly
parallel. Drag or rotate a tie to reshape its bundle. Delete a tie to set its arrows free.

[1]
These pieces work together:
- `ZipArrowShapeUtil` replaces the default arrow so it can be routed through any number of ties.
- `ZipTieShapeUtil` and `ZipTieBindingUtil` are the tie itself, and the binding from each arrow to
  each tie it passes through.
- `ZipTieTool` lets you draw the cut line, and `ZipTieOverlayUtil` draws it.
All the geometry lives in zip-tie-shared.ts.

[2]
Z normally holds the zoom tool. Removing that action frees the key for the zip tie tool.

[3]
The starter diagram has one shape fanning out to two others (try tying those two arrows together)
and three arrows crossing between two columns (try tying all three, twice).
*/
