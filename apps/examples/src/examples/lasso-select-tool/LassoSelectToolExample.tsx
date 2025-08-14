import { useMemo } from 'react'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	getStrokePoints,
	getSvgPathFromStrokePoints,
	TLComponents,
	Tldraw,
	TldrawOverlays,
	TldrawUiMenuItem,
	TLUiOverrides,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import { LassoingState, LassoSelectTool } from './LassoSelectTool'
// There's a guide at the bottom of this file!

//[1]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['lasso-select'] = {
			id: 'lasso-select',
			icon: 'color',
			label: 'Lasso Select',
			kbd: 'w', //w for wrangle 🤠
			onSelect: () => {
				editor.setCurrentTool('lasso-select')
			},
		}
		return tools
	},
}

//[2]
const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isLassoSelected = useIsToolSelected(tools['lasso-select'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['lasso-select']} isSelected={isLassoSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['lasso-select']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	//[a]
	Overlays: () => (
		<>
			<TldrawOverlays />
			<LassoSelectSvgComponent />
		</>
	),
}

//[3]
function LassoSelectSvgComponent() {
	const editor = useEditor()
	// const { addToast } = useToasts()

	//[a]
	const lassoPoints = useValue(
		'lasso points',
		() => {
			if (!editor.isIn('lasso-select.lassoing')) return []
			const lassoing = editor.getStateDescendant('lasso-select.lassoing') as LassoingState
			return lassoing.points.get()
		},
		[editor]
	)

	//[b]
	const svgPath = useMemo(() => {
		const smoothedPoints = getStrokePoints(lassoPoints)
		const svgPath = getSvgPathFromStrokePoints(smoothedPoints, true)
		return svgPath
	}, [lassoPoints])

	//[c]
	return (
		<>
			{lassoPoints.length > 0 && (
				<svg className="tl-overlays__item" aria-hidden="true">
					<path
						d={svgPath}
						fill="var(--color-selection-fill)"
						opacity={0.5}
						stroke="var(--color-selection-stroke)"
						strokeWidth="calc(2px / var(--tl-zoom))"
					/>
				</svg>
			)}
		</>
	)
}

export default function LassoSelectToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[LassoSelectTool]}
				overrides={uiOverrides}
				components={components}
				persistenceKey="lasso-select-example"
			/>
		</div>
	)
}

/*
This example shows how to build a lasso select tool using the StateNode and EditorAtom classes. For a simpler example of how to build a selection tool, see the `MiniSelectTool` in the only-editor example. If you want to see an even simpler select tool that doesn't implement any child states, see the `MicroSelectTool` in the same example. 

[1]
Here are the UI overrides for the lasso select tool, which we'll pass into the <Tldraw> component. It adds a new tool to the toolbar and keyboard shortcuts dialog, as well as sets the keyboard shortcut. More info about this in the 'add-tool-to-toolbar' and 'custom-config' examples.

[2]
This is the set of custom components for the lasso select tool, which we'll also pass into the <Tldraw> component. It adds a new toolbar and keyboard shortcuts dialog. More info  about this in the 'add-tool-to-toolbar' and 'custom-config' examples.

	[a]
	The `Overlays` component override is where we'll pass in the component that will draw the lasso. We need to make sure that we pass in the <TldrawOverlays /> component as well, so that we get all the tldraw default overlays. 
	We use `Overlays` instead of `InFrontOfTheCanvas` because `Overlays` get camera transforms applied to them automatically, so the points will always render where we want them to.

[3]
This component reads the lasso points from the lasso select tool and draws the lasso itself onto the Overlays layer. It is worth noting that this is only necessary for rendering the lasso.

	[a]
	Here we're using the tldraw's `useValue` hook to read the lasso points from the tool's state. We use `editor.isIn()` to check if we're in the lassoing state, then `editor.getStateDescendant()` to get the lassoing state instance. The thing that allows us to get these points reactively is the `lassoing.points.get()` call. This is because `LassoingState`'s `points` attribute is an instance of the `atom` class. As you'll see in `LassoSelectTool.tsx`, we're using an `atom<VecModel[]>` to store the lasso points.

	[b]
	Here we're smoothing the lasso points using tldraw's freehand library's `getStrokePoints` function, then converting the smoothed points to an SVG path.

	[c]
	Here we're actually defining the SVG path that we use to draw the lasso onto the Overlays layer. There are a couple things to note here. 
	- One is `className="tl-overlays__item"` and `aria-hidden="true"` attributes of the svg. This class name is necessary for the svg to render at all, and the aria hidden attribute makes it accessible to screen readers. 
	- The other noteworthy line here is: `strokeWidth="calc(2px / var(--tl-zoom))"` which takes advantage of one of tldraw's global css variables to always draw the svg with the same apparent stroke width at different zoom levels.

*/
