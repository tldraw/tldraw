import { Tldraw, createMigrationIds, createMigrationSequence } from 'tldraw'
import 'tldraw/tldraw.css'
import { snapshot } from './snapshot'
import { components } from './ui-overrides'

/**
 * This example demonstrates how to add custom migrations for `meta` properties, or any other
 * data in your store snapshots.
 *
 * If you have a custom shape type and you want to add migrations for its `props` object,
 * there is a simpler dedicated API for that. Check out [the docs](https://tldraw.dev/docs/persistence#Shape-props-migrations) for more info.
 */

/**
 * Let's say you added some page metadata, e.g. to allow setting the background color of a page independently.
 */
interface _PageMetaV1 {
	backgroundTheme?: 'red' | 'blue' | 'green' | 'purple'
}

/**
 * And then perhaps later on you decided to remove support for 'purple' because it's an ugly color.
 * So all purple pages will become blue.
 */
export interface PageMetaV2 {
	backgroundTheme?: 'red' | 'blue' | 'green'
}

/**
 * You would then create a migration to update the metadata from v1 to v2.
 */

// First pick a 'sequence id' that is unique to your app
const sequenceId = 'com.example.my-app'
// Then create a 'migration id' for each version of your metadata
const versions = createMigrationIds(sequenceId, {
	// the numbers must start at 1 and increment by 1
	RemovePurple: 1,
})
const migrations = createMigrationSequence({
	sequenceId,
	sequence: [
		{
			id: versions.RemovePurple,
			// `scope: 'record` tells the schema to call this migration on individual records.
			// `scope: 'store'` would call it on the entire snapshot, to allow for actions like deleting/creating records.
			scope: 'record',
			// When `scope` is 'record', you can specify a filter function to only apply the migration to records that match the filter.
			filter: (record) => record.typeName === 'page',
			// This up function will be called on all records that match the filter
			up(page: any) {
				if (page.meta.backgroundTheme === 'purple') {
					page.meta.backgroundTheme = 'blue'
					page.name += ' (was purple)'
				}
			},
		},
	],
})

export default function MetaMigrationsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the custom migrations
				migrations={[migrations]}
				// When you load a snapshot from a previous version, the migrations will be applied automatically
				snapshot={snapshot}
				// This adds a dropdown to the canvas for changing the backgroundTheme property
				components={components}
			/>
		</div>
	)
}
