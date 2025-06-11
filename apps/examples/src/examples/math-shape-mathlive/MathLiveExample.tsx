/* eslint-disable react-hooks/rules-of-hooks */
import 'mathlive'
import { MathfieldElement } from 'mathlive'
import { useCallback, useEffect, useRef } from 'react'
import {
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	StateNode,
	T,
	TLBaseShape,
	TLComponents,
	TLResizeInfo,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	createShapeId,
	resizeBox,
	useIsToolSelected,
	useQuickReactor,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './MathLiveExample.css'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		interface IntrinsicElements {
			'math-field': React.DetailedHTMLProps<
				React.HTMLAttributes<MathfieldElement>,
				MathfieldElement
			>
		}
	}
}

await window.customElements.whenDefined('math-field')
MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive/fonts/'

type MathShape = TLBaseShape<
	'math',
	{
		w: number
		h: number
		content: string
	}
>

export class MathShapeUtil extends ShapeUtil<MathShape> {
	static override type = 'math' as const
	static override props: RecordProps<MathShape> = {
		w: T.number,
		h: T.number,
		content: T.string,
	}

	getDefaultProps(): MathShape['props'] {
		return {
			w: 20,
			h: 20,
			content: '',
		}
	}

	override canEdit() {
		return true
	}
	override canResize() {
		return false
	}
	override isAspectRatioLocked() {
		return false
	}

	getGeometry(shape: MathShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info, { minWidth: 10, minHeight: 10 })
	}

	component(shape: MathShape) {
		const ref = useRef<MathfieldElement>(null)
		const isEditing = this.editor.getEditingShapeId() === shape.id

		useQuickReactor(
			'focus on edit',
			() => {
				if (!ref.current) return
				if (isEditing) {
					ref.current.focus()
					ref.current.executeCommand('selectAll')
				}
			},
			[isEditing, ref]
		)

		const resizeShapeToFitField = useCallback(() => {
			const width = ref.current?.offsetWidth || 200
			const height = ref.current?.offsetHeight || 100
			this.editor.updateShape<MathShape>({
				id: shape.id,
				type: 'math',
				props: {
					w: width,
					h: height,
				},
			})
		}, [shape.id, ref])

		useEffect(() => {
			resizeShapeToFitField()
		}, [resizeShapeToFitField])

		return (
			<HTMLContainer>
				{!isEditing && (
					<div
						style={{
							position: 'absolute',
							width: '100%',
							height: '100%',
							pointerEvents: 'all',
							zIndex: 99999,
						}}
					></div>
				)}
				<math-field
					ref={ref}
					id={`math-field-${shape.id.split(':')[1]}`}
					onPointerDown={(e) => {
						if (isEditing) e.stopPropagation()
					}}
					contentEditable={isEditing}
					style={{
						pointerEvents: 'all',
						fontSize: '2em',
						overflow: 'hidden',
					}}
					onInput={resizeShapeToFitField}
				>
					{shape.props.content}
				</math-field>
			</HTMLContainer>
		)
	}

	indicator(shape: MathShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

class MathShapeTool extends StateNode {
	static override id = 'math'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { currentPagePoint } = this.editor.inputs
		const id = createShapeId()
		this.editor.createShape<MathShape>({
			id,
			type: 'math',
			x: currentPagePoint.x - 5,
			y: currentPagePoint.y - 20,
		})

		// Edit the shape immediately after creating it
		this.editor.setEditingShape(id)
	}
}

export const overrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.math = {
			id: 'math',
			icon: 'color',
			label: 'Math',
			kbd: 'm',
			onSelect: () => editor.setCurrentTool('math'),
		}
		return tools
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isCardSelected = useIsToolSelected(tools['math'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['math']} isSelected={isCardSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

const shapeUtils = [MathShapeUtil]
const tools = [MathShapeTool]
export default function CustomShapeExample() {
	function handleMount(editor: Editor) {
		const mathShapes = editor.getCurrentPageShapes().filter((shape) => shape.type === 'math')
		if (mathShapes.length > 0) return
		editor.createShape({ type: 'math', x: 0, y: 0, props: { content: '2x=y^3' } })
	}

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="math-shape-example-mathlive"
				shapeUtils={shapeUtils}
				tools={tools}
				overrides={overrides}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
