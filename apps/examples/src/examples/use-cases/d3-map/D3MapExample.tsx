import { Editor, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { MAP_HEIGHT, MAP_WIDTH } from './us-map-data'
import { UsMapShapeUtil } from './UsMapShapeUtil'
import './d3-map.css'
import { UsStateShapeUtil } from './UsStateShapeUtil'

// [1]
const shapeUtils = [UsMapShapeUtil, UsStateShapeUtil]

function createMap(editor: Editor) {
	editor.createShape({
		type: 'us-map',
		x: 0,
		y: 0,
		props: { w: MAP_WIDTH, h: MAP_HEIGHT },
	})
}

function resetMap(editor: Editor) {
	const mapAndStateIds = [...editor.getCurrentPageShapeIds()].filter((id) => {
		const shape = editor.getShape(id)
		return shape?.type === 'us-map' || shape?.type === 'us-state'
	})
	editor.run(() => {
		editor.deleteShapes(mapAndStateIds)
		createMap(editor)
	})
	editor.zoomToFit({ animation: { duration: 200 } })
}

function TopPanel() {
	const editor = useEditor()
	return (
		<div className="d3-map-top-panel tlui-menu">
			<TldrawUiButton type="normal" onClick={() => resetMap(editor)}>
				Reset map
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel,
}

export default function D3MapExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) {
						createMap(editor)
					}
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Two custom shapes: `us-map` renders every state path in one SVG (see UsMapShapeUtil.tsx),
and `us-state` renders a single state. Double-clicking the map, or clicking its "Explode
states" button, replaces the map with one `us-state` shape per state.
*/
