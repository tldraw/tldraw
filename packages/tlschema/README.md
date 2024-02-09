# @tldraw/tlschema

This package houses type definitions, schema migrations, and other type metadata for the tldraw editor's default persisted data.

There are three main kinds of types:

- Record types

  These are root record types added to the `Store` class. They are defined in the `./src/records` directory.

- Shape types

  These are subtypes of the root TLShape record type. They allow specifying a unique name and custom props for a particular kind of shape.

- Asset types

  These are subtypes of the root TLAsset record type. They allow specifying a unique name and custom props for a particular kind of asset.

# Adding migrations

If you make any kind of change to any persisted data shape in this package, you must add migrations that are able to convert old versions to new versions, and vice-versa.

1. Create a new migrations file in the `src/migrations` directory. The file name should match the migration's ID. Copy the previous file and rename it, bumping the number prefix, then update the migration metadata and up/down functions.
2. Add a test file in `src/migrations/test` with the same name and the `.test.ts` extension. This file should test the migration you added in step 1.
3. Add your migration **at the end of** the `migrations` array in `tldrawMigrations.ts`
5. Increment the number in the `tldrawMigrations.migrations.slice(0, ...)` call in `CustomConfigExample.tsx`
4. Run `yarn test tldrawMigrations.ts` in this package to generate a new snapshot and check that you updated the number in `CustomConfigExample.tsx` correctly.

## Types of migration

There are two types of migration you can add:

1. **Record-scoped migrations**. These are called on every record in the store individually. They are useful for adding, removing, renaming, and editing properties on records.

   ```ts
   export const AddArrowLabel = {
   	id: 'com.tldraw/003_AddArrowLabel',
   	scope: 'record',
   	up: (record) => {
   		if (record.typeName === 'shape' && record.type === 'arrow') {
   			// mutating records is allowed during migrations now
   			record.props.label = null
   		}
   	},
   	down: (record) => {
   		if (record.typeName === 'shape' && record.type === 'arrow') {
   			delete props.label
   		}
   	},
   } as const satisfies Migration
   ```

2. **Store-scoped migrations**. These are called on the whole document at once, and are therefore able to add records, remove records, and read from multiple records at once.

   ```ts
   export const DeleteArrowShapes = {
   	id: 'com.tldraw/004_DeleteArrowShapes',
   	scope: 'store',
   	up: (store) => {
   		for (const { id, typeName, type } of Object.values(store)) {
   			if (typeName === 'shape' && type === 'arrow') {
   				delete store[id]
   			}
   		}
   	},
   	down: (store) => {
   		// noop
   	},
   } as const satisfies Migration
   ```

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new).

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

The tldraw source code and its distributions are provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/master/LICENSE.md). This license does not permit commercial use.

If you wish to use this project in commercial product, you need to purchase a commercial license. Please contact us at [hello@tldraw.com](mailto:hello@tldraw.com) for more inforion about obtaining a commercial license.

## Trademarks

Copyright (c) 2023-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter at [@tldraw](https://twitter.com/tldraw) or email [hello@tldraw.com](mailto://hello@tldraw.com). You can also [join our discord](https://discord.gg/rhsyWMUJxd) for quick help and support.
