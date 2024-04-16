import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	TLStoreSnapshot,
	Tldraw,
	resizeBox,
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
					return {
						...shape,
						props: {
							...shape.props,
							color: 'lightblue',
						},
					}
				},
				down(shape: IMyShape) {
					const { color: _, ...propsWithoutColor } = shape.props
					return {
						...shape,
						props: propsWithoutColor,
					}
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

const customShapeUtils = [MigratedShapeUtil]

export default function ShapeWithMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				// Use a snapshot to load an old version of the shape
				snapshot={snapshot as TLStoreSnapshot}
			/>
		</div>
	)
}

/* 
Introduction:

Sometimes you'll want to update the way a shape works in your application without
breaking older versions of the shape that a user may have stored or persisted in
memory. 

This example shows how you can use our migrations system to upgrade (or downgrade)
user's data between different versions. Most of the code above is general "custom
shape" code—see our custom shape example for more details.

[1] 
To define migrations, we can override the migrations property of our shape util. Each migration
had two parts: an `up` migration and `down` migration. In this case, the `up` migration adds
the `color` prop to the shape, and the `down` migration removes it.

In some cases (mainly in multiplayer sessions) a peer or server may need to take a later 
version of a shape and migrate it down to an older version—in this case, it would run the
down migrations in order to get it to the needed version.

How it works:

Each time the editor's store creates a snapshot (`editor.store.createSnapshot`), it 
serializes all of the records (the snapshot's `store`) as well as versions of each 
record that it contains (the snapshot's `scena`). When the editor loads a snapshot, 
it compares its current schema with the snapshot's schema to determine which migrations
to apply to each record.

In this example, we have a snapshot (snapshot.json) that we created in version 0,
however our shape now has a 'color' prop that was added in version 1. 

The snapshot looks something like this:

```json{
{
	"store": {
		"shape:BqG5uIAa9ig2-ukfnxwBX": {
			...,
			"props": {
				"w": 300,
				"h": 300
			},
		},
		"schema": {
			...,
			"recordVersions": {
				...,
				"shape": {
					"version": 3,
					"subTypeKey": "type",
					"subTypeVersions": {
						...,
						"myshape": 0
					}
				}
			}
		}
	}
}
```

Note that the shape in the snapshot doesn't have a 'color' prop. 

Note also that the schema's version for this shape is 0.

When the editor loads the snapshot, it will compare the serialzied schema's version with 
its current schema's version for the shape, which is 1 as defined in our shape's migrations.
Since the serialized version is older than its current version, it will use our migration
to bring it up to date: it will run the migration's `up` function, which will add the 'color'
prop to the shape.
*/
