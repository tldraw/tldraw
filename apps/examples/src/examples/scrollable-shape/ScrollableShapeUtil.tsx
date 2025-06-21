import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape } from 'tldraw'

// Define the shape's props
export type ScrollableShape = TLBaseShape<
	'scrollable-shape',
	{
		w: number
		h: number
	}
>

export class ScrollableShapeUtil extends BaseBoxShapeUtil<ScrollableShape> {
	static override type = 'scrollable-shape' as const

	static override props: RecordProps<ScrollableShape> = {
		w: T.number,
		h: T.number,
	}

	override getDefaultProps(): ScrollableShape['props'] {
		return {
			w: 200,
			h: 200,
		}
	}

	override canScroll() {
		return true
	}

	// Render the shape
	override component(shape: ScrollableShape) {
		// Example scrollable text content
		const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`)
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					width: shape.props.w,
					height: shape.props.h,
					overflow: 'auto',
					pointerEvents: 'auto',
					backgroundColor: '#efefef',
				}}
			>
				<ul style={{ margin: 0, padding: 8 }}>
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</HTMLContainer>
		)
	}

	override indicator(shape: ScrollableShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
