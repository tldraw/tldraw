import {
	Box,
	DefaultSizeStyle,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	TldrawUiToolbarButton,
	TLEditorComponents,
	TLEditorSnapshot,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'

// There's a guide at the bottom of this file!

const jsonSnapshot = _jsonSnapshot as any as TLEditorSnapshot

const SIZES = [
	{ value: 's', icon: 'size-small' },
	{ value: 'm', icon: 'size-medium' },
	{ value: 'l', icon: 'size-large' },
	{ value: 'xl', icon: 'size-extra-large' },
] as const

// [1]
const ContextualToolbarComponent = track(() => {
	const editor = useEditor()
	const showToolbar = editor.isIn('select.idle')

	// [2]
	const size = editor.getSharedStyles().get(DefaultSizeStyle)
	if (!size || !showToolbar) return null
	const currentSize = size.type === 'shared' ? size.value : undefined

	// [3]
	const getSelectionBounds = () => {
		const fullBounds = editor.getSelectionRotatedScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Sizes">
			{SIZES.map(({ value, icon }) => {
				return (
					<TldrawUiToolbarButton
						key={value}
						title={value.toUpperCase()}
						type="icon"
						isActive={value === currentSize}
						onClick={() => editor.setStyleForSelectedShapes(DefaultSizeStyle, value)}
					>
						<TldrawUiButtonIcon small icon={icon} />
					</TldrawUiToolbarButton>
				)
			})}
		</TldrawUiContextualToolbar>
	)
})

const components: TLEditorComponents = {
	InFrontOfTheCanvas: ContextualToolbarComponent,
}

export default function ContextualToolbar() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} snapshot={jsonSnapshot} />
		</div>
	)
}

/*
`TldrawUiContextualToolbar` is rendered in the `InFrontOfTheCanvas` slot, so it sits on top of
the shapes but behind the rest of the UI.

[1]
The component is wrapped in `track()` so it re-renders when the selection, camera, or tool state
changes. We only show the toolbar while the select tool is idle, so it disappears while shapes are
being dragged, resized, or rotated.

[2]
Different shapes support different style properties. `getSharedStyles()` returns the styles
supported by every selected shape; if none of them support `DefaultSizeStyle` we don't show the
toolbar at all. If all the shapes have the same size, the entry's type is `shared` and we highlight
that size. If they differ, the type is `mixed` and nothing is highlighted.

[3]
`getSelectionBounds` tells the toolbar where to position itself. Here we use the selection's
rotated screen bounds with a height of zero so the toolbar sits along the top edge; you can use
any other logic you like.
*/
