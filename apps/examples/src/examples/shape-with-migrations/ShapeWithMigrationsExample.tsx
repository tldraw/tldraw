import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	TLStoreSnapshot,
	Tldraw,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
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

// [1]
const versions = createShapePropsMigrationIds(
	// this must match the shape type in the shape definition
	'myshape',
	{
		AddColor: 1,
	}
)

// [2]
export const cardShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: versions.AddColor,
			up(props) {
				// it is safe to mutate the props object here
				props.color = 'lightblue'
			},
			down(props) {
				delete props.color
			},
		},
	],
})

export class MigratedShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const

	static override props = {
		w: T.number,
		h: T.number,
		color: T.string,
	}

	// [3]
	static override migrations = cardShapeMigrations

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

Sometimes you'll want to update the way a shape works in your application without breaking older
versions of the shape that a user may have stored or persisted in memory. 

This example shows how you can use our migrations system to upgrade (or downgrade) user's data
between different versions. Most of the code above is general "custom shape" code—see our custom
shape example for more details.

[1] First, we need IDs for each migration. List each change with its version number. Once you've
added a migration, it should not change again.

[2] Next, we create a migration sequence. This is where we actually write our migration logic. Each
migration had three parts: an `id` (created in [1]), an `up` migration and `down` migration. In this
case, the `up` migration adds the `color` prop to the shape, and the `down` migration removes it.

In some cases (mainly in multiplayer sessions) a peer or server may need to take a later version of
a shape and migrate it down to an older version—in this case, it would run the down migrations in
order to get it to the needed version.

[3] Finally, we add our migrations to the ShapeUtil. This tells tldraw about the migrations so they
can be used with your shapes.

How it works:

Each time the editor's store creates a snapshot (`editor.store.createSnapshot`), it serializes all
of the records (the snapshot's `store`) as well as versions of each record that it contains (the
snapshot's `scena`). When the editor loads a snapshot, it compares its current schema with the
snapshot's schema to determine which migrations to apply to each record.

In this example, we have a snapshot (snapshot.json) that we created in version 0, however our shape
now has a 'color' prop that was added in version 1. 

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
	},
	"schema": {
		...,
		"sequences": {
			...,
			"com.tldraw.shape.arrow": 4,
			"com.tldraw.shape.myshape": 0
		}
	}
}
```

Note that the shape in the snapshot doesn't have a 'color' prop. 

Note also that the schema's version for this shape is 0.

When the editor loads the snapshot, it will compare the serialzied schema's version with its current
schema's version for the shape, which is 1 as defined in our shape's migrations. Since the
serialized version is older than its current version, it will use our migration to bring it up to
date: it will run the migration's `up` function, which will add the 'color' prop to the shape.
*/
