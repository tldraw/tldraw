import { TLComponents, Tldraw, TLShape, track, useEditor, useQuickReactor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const InfoPanel = track(() => {
	const editor = useEditor()
	const tool = editor.getCurrentToolId()
	const zoom = editor.getZoomLevel().toFixed(2)
	useQuickReactor(
		'only red shapes',
		() => {
			const shapes = editor.getCurrentPageShapes()

			editor.updateShapes(
				shapes.map((shape: TLShape) => {
					if ('color' in shape.props) {
						return { ...shape, props: { ...shape.props, color: 'red' } }
					} else {
						return shape
					}
				})
			)
		},
		[editor]
	)
	return (
		<div style={{ pointerEvents: 'all', backgroundColor: 'thistle', fontSize: 14, padding: 8 }}>
			<div>tool: {tool}</div>
			<div>zoom: {zoom}</div>
			<div style={{ padding: 8 }}>Only red shapes</div>
		</div>
	)
})

// [2]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AlternativeInfoPanel() {
	const editor = useEditor()
	const tool = useValue(
		'current tool',
		() => {
			if (!editor) throw new Error('No editor')
			return `Current Tool: ${editor.getCurrentToolId()}`
		},
		[editor]
	)
	const zoom = useValue(
		'zoom',
		() => {
			if (!editor) throw new Error('No editor')
			return `Zoom Level: ${editor.getZoomLevel().toFixed(2)}`
		},
		[editor]
	)

	return (
		<div style={{ pointerEvents: 'all', backgroundColor: 'thistle', fontSize: 14, padding: 8 }}>
			<div>{tool}</div>
			<div>{zoom}</div>
		</div>
	)
}

const components: TLComponents = {
	SharePanel: InfoPanel,
	// SharePanel: AlternativeInfoPanel,
}

export default function StateStoreExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/* 

Tldraw uses a signals library called Signia to manage its state and store. You can subscribe to
values in the store and run side effects when they change.

[1]
	Our InfoPanel component will display above the style panel. We want it to show the current
	selected tool and zoom level of the editor. In order to make sure it displays up-to-date
	information, we can wrap the component in the track function. This will track any signals
	used in the component and re-render it when they change. 
	
	We also use the useQuickReactor hook to keep the shapes on the canvas red. This side effect
	will run whenever the shapes on the page change. We pass the editor as a dependency to the
	useQuickReactor hook so it will always have the latest editor instance. useQuickReactor runs
	immediately, whereas useReactor runs on the next animation frame.

	Check out the Fog of War example to see useReactor in action.

[2]
	We can also use the useValue hook to subscribe to a value in the store. You can pass it a 
	value or a function. Functions will be memoized and only re-run when the dependencies change.

*/
