import {
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	Tldraw,
	defineMigrations,
} from 'tldraw'
import 'tldraw/tldraw.css'

type MyCustomShape = TLBaseShape<'card', { w: number; h: number }>

class MyCustomShapeUtil extends ShapeUtil<MyCustomShape> {
	type = 'card' as const

	override getDefaultProps() {
		return { w: 100, h: 100 }
	}

	override getGeometry(shape: MyCustomShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: MyCustomShape) {
		return <HTMLContainer style={{ width: shape.props.w, height: shape.props.h }} />
	}

	indicator(shape: MyCustomShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	migrations = defineMigrations({
		currentVersion: 2,
		migrators: {
			1: {
				// Add a property (this adds the `likes` property to the shape)
				up(shape) {
					return { ...shape, props: { ...shape.props, likes: 0 } }
				},
				down(shape) {
					const { likes: _, ...propsWithoutLikes } = shape.props
					return { ...shape, props: propsWithoutLikes }
				},
			},
			2: {
				// Remove a property (this removes the `likes` property from the shape)
				up(shape) {
					const { likes: _, ...propsWithoutLikes } = shape.props
					return { ...shape, props: propsWithoutLikes }
				},
				down(shape) {
					return { ...shape, props: { ...shape.props, likes: 0 } }
				},
			},
		},
	})
}

export default function MigrationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" shapeUtils={[MyCustomShapeUtil]} />
		</div>
	)
}
