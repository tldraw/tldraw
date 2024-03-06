import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	Tldraw,
	resizeBox,
	structuredClone,
} from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'

// There's a guide at the bottom of this file!

export type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
		color: string
	}
>

export class MigratedShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const

	static override props = {
		w: T.number,
		h: T.number,
		color: T.string,
	}

	// [1]
	static override migrations = {
		firstVersion: 0,
		currentVersion: 1,
		migrators: {
			1: {
				up(shape: IMyShape) {
					const newShape = structuredClone(shape)
					newShape.props.color = 'lightblue'

					return newShape
				},
				down(shape: IMyShape) {
					const migratedDownShape = structuredClone(shape)
					// remove the color prop
					const newShape = {
						...migratedDownShape,
						props: { w: migratedDownShape.props.w, h: migratedDownShape.props.h },
					}
					return newShape
				},
			},
		},
	}

	getDefaultProps(): IMyShape['props'] {
		return {
			w: 300,
			h: 300,
			color: 'lightblue',
		}
	}

	component(shape: IMyShape) {
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					backgroundColor: shape.props.color,
					boxShadow: '0 0 10px rgba(0,0,0,0.5)',
				}}
			></HTMLContainer>
		)
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	override onResize: TLOnResizeHandler<IMyShape> = (shape, info) => {
		return resizeBox(shape, info)
	}
}

// [2]
const customShapeUtils = [MigratedShapeUtil]

export default function ShapeWithMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				// Use a snapshot to load an old version of the shape
				snapshot={snapshot}
			/>
		</div>
	)
}

/* 
Introduction:

Sometimes you'll want to update the way a shape works in your application. When 
this happens there can be a risk of errors and bugs. For example, users with an 
old version of a shape in their documents might encounter errors when the editor 
tries to access a property that doesn't exist. This example shows how you can 
use our migrations system to preserve your users' data between versions.

To simulate this scenario, we first created a shape using the code you'll find
in OriginalShapeUtil.tsx. It's a shape that only has height and width props.
Then we created a snapshot of that shape on the canvas and loaded it using the
snapshot prop. See the snapshot example for a closer look at this.

We then updated our shape to take a 'color' prop. Without the migrations being 
applied, the editor would search for the color prop in the shape contained within 
the snapshot, and throw an error when it wasn't found. You can test this yourself 
by running the examples app and commenting out the code in [1].

[1] 
To define migrations we have to override the migrations property of our shape util. 
When loading a document, the editor will check the versions of the document and the 
util against each other to see whether it should run migrations. We've only updated 
our shape once, so we only need to include one migrator. When migrating a shape, it's 
important not to modify and return the original shape. Instead we can use the 
structuredClone helper from the tldraw library to modify the shape and return a new 
version. Here, we're adding a color prop and putting in a default value when migrating 
up, and removing the prop when migrating down.

*/
