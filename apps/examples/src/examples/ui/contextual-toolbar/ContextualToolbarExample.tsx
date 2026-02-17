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
This example shows how you can use our contextual toolbar primitive that can show up when you
select a shape. It's using the `InFrontOfTheCanvas` component to render the toolbar. This allows us to render
the toolbar on top of the shapes, but behind the existing UI.
[1]
This is our context toolbar. It's positioned absolutely on top of the selected shapes.
[2]
Different shapes support different style properties and this is how we get the styles that are 
supported by all selected shapes. If none of the selected shapes supported the `DefaultSizeStyle`
we wouldn't show the toolbar at all.
We also get the current value of the size property. If all the shapes have the same size then the
type of the size property is `shared`. This will allow us to show the currently selected size in the
toolbar. If the shapes have different sizes then the type of the size property is `mixed` and none
of the sizes will be highlighted.
[3]
We pass in getSelectionBounds so that the toolbar knows where to position itself. You can use the
selection bounds of the current shapes or some other logic.
*/
