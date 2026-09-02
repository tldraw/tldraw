import { TLComponents, Tldraw, track, useEditor, useReactor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const InfoPanel = track(function InfoPanel() {
	const editor = useEditor()
	const tool = editor.getCurrentToolId()
	const zoom = editor.getZoomLevel().toFixed(2)

	// [2]
	useReactor(
		'change title',
		() => {
			const shapes = editor.getCurrentPageShapes()
			document.title = `shapes: ${shapes.length}`
		},
		[editor]
	)

	return (
		<div className="tlui-menu" style={{ fontSize: 14, padding: 8 }}>
			<div>tool: {tool}</div>
			<div>zoom: {zoom}</div>
		</div>
	)
})

// [3]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AlternativeInfoPanel() {
	const editor = useEditor()
	const tool = useValue('current tool', () => editor.getCurrentToolId(), [editor])
	const zoom = useValue('zoom', () => editor.getZoomLevel().toFixed(2), [editor])

	return (
		<div className="tlui-menu" style={{ fontSize: 14, padding: 8 }}>
			<div>tool: {tool}</div>
			<div>zoom: {zoom}</div>
		</div>
	)
}

const components: TLComponents = {
	SharePanel: InfoPanel,
}

export default function StateStoreExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
tldraw's editor state is built on signals. Any `editor.get...()` call reads a signal, and there
are two ways to make a React component follow those reads.

[1]
`track` wraps a component so that every signal read during render is recorded, and the component
re-renders when any of them change. Here that's the current tool and the zoom level. This panel
is placed in the `SharePanel` slot, above the style panel.

[2]
`useReactor` runs a side effect (rather than a render) whenever the signals it reads change,
throttled to once per animation frame. Here it keeps the document title in sync with the shape
count. `useQuickReactor` is the same but runs synchronously on every change. Both take a deps
array like `useEffect`; the effect is re-created when the deps change.

[3]
`useValue` is the more targeted alternative: pass a name, a function that reads signals, and a
deps array, and the component re-renders only when the function's *return value* changes. This
version of the panel behaves identically to [1]. Prefer `useValue` when you want to pick a few
values out of a component that shouldn't otherwise track everything it touches; `track` is
convenient when the whole component is about editor state.
*/
