import { useRef } from 'react'
import {
	DefaultSizeStyle,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	TLEditorComponents,
	TLEditorSnapshot,
	track,
	useContextualToolbarPosition,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'

const jsonSnapshot = _jsonSnapshot as any as TLEditorSnapshot

const SIZES = [
	{ value: 's', icon: 'size-small' },
	{ value: 'm', icon: 'size-medium' },
	{ value: 'l', icon: 'size-large' },
	{ value: 'xl', icon: 'size-extra-large' },
] as const

// There's a guide at the bottom of this file!

// [1]
const ContextualToolbarComponent = track(() => {
	const editor = useEditor()
	const showToolbar = editor.isIn('select.idle')
	const toolbarRef = useRef<HTMLDivElement>(null)

	// [3]
	const toolbarPosition = useContextualToolbarPosition({
		isVisible: showToolbar,
		toolbarRef,
	})

	// [2]
	const size = editor.getSharedStyles().get(DefaultSizeStyle)
	if (!size) return null
	const currentSize = size.type === 'shared' ? size.value : undefined

	return (
		<TldrawUiContextualToolbar
			ref={toolbarRef}
			position={toolbarPosition}
			indicatorOffset={toolbarPosition.indicatorOffset}
		>
			{SIZES.map(({ value, icon }) => {
				return (
					<TldrawUiButton
						key={value}
						title={value}
						type="icon"
						isActive={value === currentSize}
						onClick={() => editor.setStyleForSelectedShapes(DefaultSizeStyle, value)}
					>
						<TldrawUiButtonIcon small icon={icon} />
					</TldrawUiButton>
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
The useToolbarPosition hook is used to get the position of the toolbar. It returns an object with the
position of the toolbar and a boolean that indicates if the toolbar is visible or not. The position
is calculated based on the selected shapes. The toolbar will be positioned in the center of the selected
shapes. The `indicatorOffset` is used to position the indicator that points to the selected shapes. The
indicatorOffset is calculated based on the position of the selected shapes and the position of the toolbar.

[3]
Different shapes support different style properties and this is how we get the styles that are 
supported by all selected shapes. If none of the selected shapes supported the `DefaultSizeStyle`
we wouldn't show the toolbar at all.
We also get the current value of the size property. If all the shapes have the same size then the
type of the size property is `shared`. This will allow us to show the currently selected size in the
toolbar. If the shapes have different sizes then the type of the size property is `mixed` and none
of the sizes will be highlighted.
*/
