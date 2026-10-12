import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLResizeInfo,
	TLShape,
	TLStoreSnapshot,
	Tldraw,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
	resizeBox,
} from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'

const MY_SHAPE_WITH_MIGRATIONS_TYPE = 'myshapewithmigrations' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_SHAPE_WITH_MIGRATIONS_TYPE]: { w: number; h: number; color: string }
	}
}

// There's a guide at the bottom of this file!

export type IMyShape = TLShape<typeof MY_SHAPE_WITH_MIGRATIONS_TYPE>

// [1]
const versions = createShapePropsMigrationIds(
	// this must match the shape type in the shape definition
	MY_SHAPE_WITH_MIGRATIONS_TYPE,
	{
		AddColor: 1,
	}
)

// [2]
export const myShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: versions.AddColor,
			up(props) {
				// props is a mutable copy, so it's safe to change it in place
				props.color = 'lightblue'
			},
			down(props) {
				delete props.color
			},
		},
	],
})

export class MigratedShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = MY_SHAPE_WITH_MIGRATIONS_TYPE

	static override props = {
		w: T.number,
		h: T.number,
		color: T.string,
	}

	// [3]
	static override migrations = myShapeMigrations

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

	getIndicatorPath(shape: IMyShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override onResize(shape: IMyShape, info: TLResizeInfo<IMyShape>) {
		return resizeBox(shape, info)
	}
}

const customShapeUtils = [MigratedShapeUtil]

export default function ShapeWithMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				// [4]
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
shipped a migration, it should not change again; add a new one instead.

[2] Next, we create a migration sequence. This is where we actually write our migration logic. Each
migration has three parts: an `id` (created in [1]), an `up` migration and a `down` migration. In
this case, the `up` migration adds the `color` prop to the shape, and the `down` migration removes
it.

In some cases (mainly in multiplayer sessions) a peer or server may need to take a later version of
a shape and migrate it down to an older version—in this case, it would run the down migrations in
order to get it to the needed version.

[3] Finally, we add our migrations to the ShapeUtil's static `migrations` property. This tells
tldraw about the migrations so they can be used with your shapes.

[4] To show the migration running, we load a snapshot that was saved before the `color` prop
existed. The migration runs as the snapshot loads, so the shape appears light blue.

How it works:

Each time the editor creates a snapshot (`editor.getSnapshot()`), it serializes all
of the records (the snapshot's `store`) as well as versions of each record that it contains (the
snapshot's `schema`). When the editor loads a snapshot, it compares its current schema with the
snapshot's schema to determine which migrations to apply to each record.

In this example, we have a snapshot (snapshot.json) that we created in version 0, however our shape
now has a 'color' prop that was added in version 1.

The snapshot looks something like this:

```json
{
	"store": {
		"shape:BqG5uIAa9ig2-ukfnxwBX": {
			...,
			"props": {
				"w": 300,
				"h": 300
			}
		}
	},
	"schema": {
		...,
		"recordVersions": {
			"shape": {
				"subTypeVersions": {
					...,
					"myshapewithmigrations": 0
				}
			}
		}
	}
}
```

The shape in the snapshot doesn't have a 'color' prop, and the schema's version for this shape is
0.

When the editor loads the snapshot, it will compare the serialized schema's version with its current
schema's version for the shape, which is 1 as defined in our shape's migrations. Since the
serialized version is older than its current version, it will use our migration to bring it up to
date: it will run the migration's `up` function, which will add the 'color' prop to the shape.
*/
