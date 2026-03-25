import { Editor, TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { MAP_HEIGHT, MAP_WIDTH } from './us-map-data'
import { UsMapShapeUtil } from './UsMapShapeUtil'
import './d3-map.css'
import { UsStateShapeUtil } from './UsStateShapeUtil'

export const STATE_COLORS = [
	'#4e79a7',
	'#f28e2b',
	'#e15759',
	'#76b7b2',
	'#59a14f',
	'#edc948',
	'#b07aa1',
	'#ff9da7',
	'#9c755f',
	'#bab0ac',
	'#af7aa1',
	'#d4a373',
]

const shapeUtils = [UsMapShapeUtil, UsStateShapeUtil]

function resetMap(editor: Editor) {
	const allShapeIds = [...editor.getCurrentPageShapeIds()]
	const mapAndStateIds = allShapeIds.filter((id) => {
		const shape = editor.getShape(id)
		return shape?.type === 'us-map' || shape?.type === 'us-state'
	})
	if (mapAndStateIds.length > 0) {
		editor.deleteShapes(mapAndStateIds)
	}
	editor.createShape({
		type: 'us-map',
		x: 0,
		y: 0,
		props: { w: MAP_WIDTH, h: MAP_HEIGHT },
	})
	editor.zoomToFit({ animation: { duration: 200 } })
}

function TopPanel() {
	const editor = useEditor()
	return (
		<div className="d3-map-top-panel">
			<button className="d3-map-reset-button" onClick={() => resetMap(editor)}>
				Reset map
			</button>
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
						editor.createShape({
							type: 'us-map',
							x: 0,
							y: 0,
							props: { w: MAP_WIDTH, h: MAP_HEIGHT },
						})
					}
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}
