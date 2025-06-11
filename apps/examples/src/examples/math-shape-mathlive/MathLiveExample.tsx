/* eslint-disable react-hooks/rules-of-hooks */
import 'mathlive'
import { MathfieldElement } from 'mathlive'
import { useRef } from 'react'
import {
	BaseBoxShapeTool,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLComponents,
	TLResizeInfo,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	resizeBox,
	useIsToolSelected,
	useQuickReactor,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './MathLiveExample.css'

// Declare the custom elements from mathlive
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
		latex: string
	}
>

export class MathShapeUtil extends ShapeUtil<MathShape> {
	static override type = 'math' as const
	static override props: RecordProps<MathShape> = {
		w: T.number,
		h: T.number,
		latex: T.string,
	}

	getDefaultProps(): MathShape['props'] {
		return {
			w: 200,
			h: 100,
			latex: '',
		}
	}

	override canEdit() {
		return true
	}
	override canResize() {
		return true
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
		const ref = useRef<HTMLElement>(null)
		// const [field, setField] = useState<MathField | null>(null)
		const isEditing = this.editor.getEditingShapeId() === shape.id

		useQuickReactor(
			'focus on edit',
			() => {
				if (!ref.current) return
				if (isEditing) {
					// console.log('editing')
					ref.current.focus()
				}
			},
			[isEditing, ref]
		)

		return (
			<HTMLContainer style={{ pointerEvents: 'all' }}>
				<math-field
					// @ts-expect-error
					ref={ref}
					restoreFocusWhenDocumentFocused={false}
					style={{
						pointerEvents: 'all',
						width: '100%',
						height: '100%',
						fontSize: '2em',
						overflow: 'hidden',
					}}
				>
					x^2 = 4/y
				</math-field>
			</HTMLContainer>
		)
	}

	indicator(shape: MathShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

export class MathShapeTool extends BaseBoxShapeTool {
	static override id = 'math'
	static override initial = 'idle'
	override shapeType = 'math'
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
		// editor.createShape({ type: 'math', x: 0, y: 0, props: { latex: '\\frac{2}{3y}=x^2' } })
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
