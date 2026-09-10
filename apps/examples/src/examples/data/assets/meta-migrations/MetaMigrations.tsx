import { Tldraw, createMigrationIds, createMigrationSequence } from 'tldraw'
import 'tldraw/tldraw.css'
import { snapshot } from './snapshot'
import { components } from './ui-overrides'

// There's a guide at the bottom of this file!

// [1]
interface _PageMetaV1 {
	backgroundTheme?: 'red' | 'blue' | 'green' | 'purple'
}

export interface PageMetaV2 {
	backgroundTheme?: 'red' | 'blue' | 'green'
}

// [2]
const sequenceId = 'com.example.my-app'
const versions = createMigrationIds(sequenceId, {
	RemovePurple: 1,
})

// [3]
const migrations = createMigrationSequence({
	sequenceId,
	sequence: [
		{
			id: versions.RemovePurple,
			scope: 'record',
			filter: (record) => record.typeName === 'page',
			up(page: any) {
				if (page.meta.backgroundTheme === 'purple') {
					page.meta.backgroundTheme = 'blue'
					page.name += ' (was purple)'
				}
			},
		},
	],
})

// [4]
const migrationsProp = [migrations]

export default function MetaMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw migrations={migrationsProp} snapshot={snapshot} components={components} />
		</div>
	)
}

/*
Every record in the store has a `meta` field for your own data. Because tldraw doesn't
know what's in it, it can't migrate it for you. This example shows how to register your
own migration sequence so old snapshots are upgraded when they load.

If what you want to migrate is the `props` of a custom shape, there's a simpler dedicated
API for that: see https://tldraw.dev/sdk-features/persistence#shape-props-migrations.

[1]
Suppose you store a background color in each page's meta. Version 1 allowed 'purple';
version 2 removes it, and existing purple pages should become blue.

[2]
Pick a sequence id unique to your app, then create an id per version. Version numbers
start at 1 and increment by 1.

[3]
`scope: 'record'` runs the migration once per record, and `filter` limits it to pages.
`scope: 'store'` would instead receive the whole store, for migrations that need to
create or delete records. The `up` function mutates the record in place.

[4]
Pass the sequences to the `migrations` prop (as a stable array). When the `snapshot`
loads, its schema says it was saved before `com.example.my-app/1`, so the migration
runs and the "Purple" page arrives as blue with "(was purple)" in its name. Use the
"bg" dropdown in the top panel to change a page's theme.
*/
