import {
	BaseBoxShapeTool,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLComponents,
	TLOnResizeHandler,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	resizeBox,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

export type SurfaceShape = TLBaseShape<
	'surface',
	{
		w: number
		h: number
	}
>

export class SurfaceShapeUtil extends ShapeUtil<SurfaceShape> {
	static override type = 'surface' as const
	static override props = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): SurfaceShape['props'] {
		return {
			w: 300,
			h: 300,
		}
	}

	getGeometry(shape: SurfaceShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	component(shape: SurfaceShape) {
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: '1px solid black',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'all',
					backgroundColor: 'blue',
				}}
			></HTMLContainer>
		)
	}

	// [7]
	indicator(shape: SurfaceShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	// [8]
	override onResize: TLOnResizeHandler<SurfaceShape> = (shape, info) => {
		return resizeBox(shape, info)
	}
}

export class SurfaceShapeTool extends BaseBoxShapeTool {
	static override id = 'surface'
	static override initial = 'idle'
	override shapeType = 'surface'
}

export const overrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.surface = {
			id: 'surface',
			icon: 'color',
			label: 'Surface',
			kbd: 'c',
			onSelect: () => {
				editor.setCurrentTool('surface')
			},
		}
		return tools
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSurfaceSelected = useIsToolSelected(tools['surface'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['surface']} isSelected={isSurfaceSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['surface']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}
const shapeUtils = [SurfaceShapeUtil]
const tools = [SurfaceShapeTool]

export default function SurfaceExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="surface-example"
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}
