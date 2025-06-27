import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	TLUiOverrides,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['simple'] = {
			id: 'simple',
			icon: 'simple',
			label: 'Simple',
			onSelect: () => {
				editor.layoutShapes(editor.getCurrentPageShapes())
			},
		}
		tools['animation'] = {
			id: 'animation',
			icon: 'animation',
			label: 'Animation',
			onSelect: () => {
				editor.layoutShapes(editor.getCurrentPageShapes(), { animation: { duration: 1000 } })
			},
		}
		tools['padding'] = {
			id: 'padding',
			icon: 'padding',
			label: 'Padding',
			onSelect: () => {
				editor.layoutShapes(editor.getCurrentPageShapes(), {
					animation: { duration: 1000 },
					defaultPadding: 50,
				})
			},
		}
		tools['weight'] = {
			id: 'weight',
			icon: 'weight',
			label: 'Weight',
			onSelect: () => {
				editor.layoutShapes(editor.getCurrentPageShapes(), {
					animation: { duration: 1000 },
					defaultPadding: 50,
					weightByShapeId: editor.getSelectedShapeIds().reduce(
						(acc, shapeId) => {
							acc[shapeId] = 1000
							return acc
						},
						{} as Record<string, number>
					),
				})
			},
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const simpleTool = tools['simple']
		const animationTool = tools['animation']
		const paddingTool = tools['padding']
		const weightTool = tools['weight']
		return (
			<DefaultToolbar {...props}>
				{simpleTool && (
					<TldrawUiMenuItem {...simpleTool} isSelected={useIsToolSelected(simpleTool)} />
				)}
				{animationTool && (
					<TldrawUiMenuItem {...animationTool} isSelected={useIsToolSelected(animationTool)} />
				)}
				{paddingTool && (
					<TldrawUiMenuItem {...paddingTool} isSelected={useIsToolSelected(paddingTool)} />
				)}
				{weightTool && (
					<TldrawUiMenuItem {...weightTool} isSelected={useIsToolSelected(weightTool)} />
				)}
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function LayoutShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} overrides={uiOverrides} />
		</div>
	)
}

/*
Introduction:

In tldraw, you can use the `layoutShapes` method to automatically arrange shapes on the canvas.
This example demonstrates how to use this method with different options, such as animation, padding, and
weighting shapes.
You can select shapes and apply different layout strategies using the toolbar buttons.
Button actions include:
- Simple: Layout shapes without animation.
- Animation: Layout shapes with a smooth transition.
- Padding: Layout shapes with a specified padding.
- Weight: Layout shapes with a specified weight (1000) for selected shapes.

 */
