# @tldraw/tlschema

This package houses type definitions, schema migrations, and other type metadata for any persisted data in tldraw.

There are three main kinds of types:

- Record types

  These are root record types added to the `Store` class. They are defined in the `./src/records` directory.

- Shape types

  These are subtypes of the root TLShape record type. They allow specifying a unique name and custom props for a particular kind of shape.

- Asset types

  These are subtypes of the root TLAsset record type. They allow specifying a unique name and custom props for a particular kind of asset.

## Creating a new record type

To create a new record type called, e.g. `TLBanana`, run

```sh
# Create the new file in ./records/TLBanana.ts
yarn new-record TLBanana
# Rebuild the index files to make sure it is exported
yarn index
```

You may then customize your new blank `TLBanana` type!

## Creating a new shape type

To create a new shape type called, e.g. `TLMapboxShape`, run

```sh
# Create the new file in ./shapes/TLMapboxShape.ts
yarn new-shape TLMapboxShape
# Rebuild the index files to make sure it is exported
yarn index
```

You may then customize your new blank `TLMapboxShape` type!

## Creating a new asset type

To create a new shape type called, e.g. `TLZipFileAsset`, run

```sh
# Create the new file in ./assets/TLZipFileAsset.ts
yarn new-asset TLZipFileAsset
# Rebuild the index files to make sure it is exported
yarn index
```

You may then customize your new blank `TLZipFileAsset` type!

# Adding migrations

If you make any kind of change to any persisted data shape in this package, you must add migrations that are able
to convert old versions to new versions, and vice-versa.

If you are making a change that affects the structure of a record, shape, or asset, update the migrations in the same file as the record, shape, or asset is defined.

If you are making a change that affects the structure of the store (e.g. renaming or deleting a type, consolidating two shape types into one, etc), add your changes in the migrations in `schema.ts`.

After making your changes, add a new version number, using a meaninful name. For example, if you add a new property
to the `TLShape` type called `ownerId` that points to a user, you might do this:

In `TLShape.ts`

```diff
 const Versions = {
   Initial: 1,
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
   // STEP 2: Update the current version to point to your latest version
   currentVersion: Versions.Initial,
   firstVersion: Versions.Initial,
   migrators: {
     // STEP 3: Add an up+down migration for the new version here
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

The source code in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).
