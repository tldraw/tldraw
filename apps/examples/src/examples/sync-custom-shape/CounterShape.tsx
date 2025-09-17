import { MouseEvent } from 'react'
import { BaseBoxShapeTool, BaseBoxShapeUtil, HTMLContainer, T, TLBaseShape } from 'tldraw'

type CounterShape = TLBaseShape<'counter', { w: number; h: number; count: number }>

export class CounterShapeUtil extends BaseBoxShapeUtil<CounterShape> {
	static override type = 'counter' as const
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		count: T.number,
	}

	override getDefaultProps() {
		return {
			w: 200,
			h: 200,
			count: 0,
		}
	}

	override component(shape: CounterShape) {
		const onClick = (event: MouseEvent, change: number) => {
			event.stopPropagation()
			this.editor.updateShape({
				id: shape.id,
				type: 'counter',
				props: { count: shape.props.count + change },
			})
		}

		return (
			<HTMLContainer
				style={{
					pointerEvents: 'all',
					background: '#efefef',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 8,
				}}
			>
				<button onClick={(e) => onClick(e, -1)} onPointerDown={this.editor.markEventAsHandled}>
					-
				</button>
				<span>{shape.props.count}</span>
				<button onClick={(e) => onClick(e, 1)} onPointerDown={this.editor.markEventAsHandled}>
					+
				</button>
			</HTMLContainer>
		)
	}

	override indicator(shape: CounterShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

export class CounterShapeTool extends BaseBoxShapeTool {
	static override id = 'counter'
	override shapeType = 'counter'
}
