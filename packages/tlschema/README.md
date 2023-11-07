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

If you are making a change that affects the structure of a record, shape, or asset, update the migrations in the same file as the record, shape, or asset is defined.

If you are making a change that affects the structure of the store (e.g. renaming or deleting a type, consolidating two shape types into one, etc), add your changes in the migrations in `schema.ts`.

After making your changes, add a new version number, using a meaninful name. For example, if you add a new property
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

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new).

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Open source license

tldraw is open source under the GNU Affero General Public License Version 3 (AGPLv3) or any later version. You can find it [here](https://github.com/tldraw/tldraw/blob/master/LICENSE.md). All packages are distributed under the same license.

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software. The AGPL-3.0 license allows users to use and modify the software as long as they keep it open source and provide any modifications or derivative works under the same license.

## Commercial license

If you wish to use this project in closed-source software or otherwise do not want to comply with the AGPL-3.0, you need to purchase a commercial license. Please contact us at [hello@tldraw.com](mailto:hello@tldraw.com) for more information about obtaining a commercial license.

The dual licensing model supports the development of the project by providing an open source option for those who are contributing back to the community, while also supporting commercial usage for entities that are not able to do so.

## Trademarks

Copyright (c) 2023-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRANDEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter at [@tldraw](https://twitter.com/tldraw) or email [hello@tldraw.com](mailto://hello@tldraw.com). You can also [join our discord](https://discord.gg/rhsyWMUJxd) for quick help and support.
