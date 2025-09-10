# @tldraw/tlschema

Type definitions, schema migrations, and other type metadata for the tldraw editor's default persisted data.

## Records

There are three main kinds of types:

- Record types

  These are root record types added to the `Store` class. They are defined in the `./src/records` directory.

- Shape types

  These are subtypes of the root TLShape record type. They allow specifying a unique name and custom props for a particular kind of shape.

- Asset types

  These are subtypes of the root TLAsset record type. They allow specifying a unique name and custom props for a particular kind of asset.

# Adding migrations

If you make any kind of change to any persisted data shape in this package, you must add migrations that are able to convert old versions to new versions, and vice-versa.

If you are making a change that affects the structure of a record, shape, or asset, update the migrations in the same file as the record, shape, or asset is defined.

If you are making a change that affects the structure of the store (e.g. renaming or deleting a type, consolidating two shape types into one, etc), add your changes in the migrations in `schema.ts`.

After making your changes, add a new version number, using a meaningful name. For example, if you add a new property
to the `TLShape` type called `ownerId` that points to a user, you might do this:

In `TLShape.ts`

```diff
 const Versions = {
   RemoveSomeProp: 1,
+  AddOwnerId: 2,
 } as const
```

and then in the `TLShape` type

```diff
   x: number
   y: number
+  ownerId: ID<TLUser> | null
   props: Props
   parentId: ID<TLShape> | ID<TLPage>
```

and then adding a migration:

```diff
 export const shapeTypeMigrations = defineMigrations({
   currentVersion: Versions.Initial,
   firstVersion: Versions.Initial,
   migrators: {
+    [Versions.AddOwnerId]: {
+      // add ownerId property
+      up: (shape) => ({...shape, ownerId: null}),
+      // remove ownerId property
+      down: ({ownerId, ...shape}) => shape,
+    }
   },
```

After you've added your migration, make sure to add a test for it in `src/migrations.test.ts`. It will complain if you do not!

## License

This project is licensed under the MIT License found [here](https://github.com/tldraw/tldraw/blob/main/packages/tlschema/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).
