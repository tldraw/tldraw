import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	Tldraw,
	resizeBox,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './shape-screen-reader.css'

const ACCESSIBLE_CARD_TYPE = 'accessible-card'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[ACCESSIBLE_CARD_TYPE]: { w: number; h: number; title: string; description: string }
	}
}

type AccessibleCardShape = TLShape<typeof ACCESSIBLE_CARD_TYPE>

export class AccessibleCardShapeUtil extends ShapeUtil<AccessibleCardShape> {
	static override type = ACCESSIBLE_CARD_TYPE
	static override props: RecordProps<AccessibleCardShape> = {
		w: T.number,
		h: T.number,
		title: T.string,
		description: T.string,
	}

	getDefaultProps(): AccessibleCardShape['props'] {
		return {
			w: 300,
			h: 180,
			title: 'Untitled',
			description: '',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}

	getGeometry(shape: AccessibleCardShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize(shape: AccessibleCardShape, info: TLResizeInfo<AccessibleCardShape>) {
		return resizeBox(shape, info)
	}

	// [1]
	override getAriaDescriptor(shape: AccessibleCardShape): string | undefined {
		const { title, description } = shape.props
		if (description) {
			return `${title} - ${description}`
		}
		return title
	}

	// [2]
	override getText(shape: AccessibleCardShape): string | undefined {
		const { title, description } = shape.props
		if (description) {
			return `${title}\n${description}`
		}
		return title
	}

	component(shape: AccessibleCardShape) {
		const { title, description } = shape.props

		return (
			<HTMLContainer className="card-shape">
				<div className="card-shape__title">{title}</div>
				{description && <div className="card-shape__description">{description}</div>}
			</HTMLContainer>
		)
	}

	indicator(shape: AccessibleCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

const customShapes = [AccessibleCardShapeUtil]

export default function ShapeScreenReaderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				onMount={(editor) => {
					editor.createShape({
						type: ACCESSIBLE_CARD_TYPE,
						x: 100,
						y: 100,
						props: {
							title: 'Meeting Notes',
							description: 'Discussed Q4 planning and team goals',
						},
					})

					editor.createShape({
						type: ACCESSIBLE_CARD_TYPE,
						x: 450,
						y: 100,
						props: {
							title: 'Project Ideas',
							description: 'Brainstorming session for new features',
						},
					})

					editor.createShape({
						type: ACCESSIBLE_CARD_TYPE,
						x: 100,
						y: 320,
						props: {
							title: 'Action Items',
							description: 'Follow up with design team by Friday',
						},
					})
				}}
			/>
		</div>
	)
}

/*
[1]
The getAriaDescriptor() method provides accessibility-specific descriptions for screen readers.
When a shape is selected, this description is announced to screen reader users. It returns a
combined announcement like "Meeting Notes - Discussed Q4 planning" that describes the card's
purpose and content. This is different from getText() - getAriaDescriptor() is specifically
for accessibility announcements, not for text extraction or search.

[2]
The getText() method returns the visible text content of the shape. This is used for text
extraction, search functionality, and as a fallback for accessibility if getAriaDescriptor()
is not provided. It returns the title and description separated by a newline.
*/
