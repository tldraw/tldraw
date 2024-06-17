import {
	DefaultSizeStyle,
	Tldraw,
	TldrawUiIcon,
	TLEditorComponents,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const SIZES = [
	{ value: 's', icon: 'size-small' },
	{ value: 'm', icon: 'size-medium' },
	{ value: 'l', icon: 'size-large' },
	{ value: 'xl', icon: 'size-extra-large' },
] as const

// There's a guide at the bottom of this file!

// [1]
const ContextToolbarComponent = track(() => {
	const editor = useEditor()
	const showToolbar = editor.isIn('select.idle')
	if (!showToolbar) return null
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionRotatedPageBounds) return null

	// [2]
	const size = editor.getSharedStyles().get(DefaultSizeStyle)
	if (!size) return null
	const currentSize = size.type === 'shared' ? size.value : undefined

	const pageCoordinates = editor.pageToViewport(selectionRotatedPageBounds.point)

	return (
		<div
			style={{
				position: 'absolute',
				top: Math.max(16, pageCoordinates.y - 48),
				left: Math.max(16, pageCoordinates.x),
				pointerEvents: 'all',
				// [3]
				width: selectionRotatedPageBounds.width,
			}}
			// [4]
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						borderRadius: 8,
						display: 'flex',
						boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
						background: 'var(--color-panel)',
						width: 'fit-content',
						alignItems: 'center',
					}}
				>
					{SIZES.map(({ value, icon }) => {
						const isActive = value === currentSize
						return (
							<div
								key={value}
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									height: 32,
									width: 32,
									background: isActive ? 'var(--color-muted-2)' : 'transparent',
								}}
								onClick={() => editor.setStyleForSelectedShapes(DefaultSizeStyle, value)}
							>
								<TldrawUiIcon icon={icon} />
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
})

const components: TLEditorComponents = {
	InFrontOfTheCanvas: ContextToolbarComponent,
}

export default function ContextToolbar() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="things-on-the-canvas-example" components={components} />
		</div>
	)
}

/*
This example shows how you can implement a context toolbar that appears when you select shapes.
It's using the `InFrontOfTheCanvas` component to render the toolbar. This allows us to render
the toolbar on top of the shapes, but behind the existing UI. The toolbar is only rendered when
we are in the `select.idle` state (so we are not rotating, moving, resizing, drawing,...).
You can also check the `Things on the canvas` example for more info on how to use `TLEditorComponents`.

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
We will show the toolbar in the middle of the selected shapes. We'll achieve this by making the parent
take the whole width, then use flexbox to center the toolbar.

[4]
We stop the event propagation so that clicking on the toolbar doesn't deselect the shapes.
*/
