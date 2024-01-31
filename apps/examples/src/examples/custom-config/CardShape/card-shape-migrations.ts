import { MigrationSequence } from '@tldraw/tldraw'

// Migrations for the custom card shape (optional but very helpful)
// As an example we will show a migration that deletes a property from the shape
export const cardShapeMigrations = {
	// The sequence ID uniquely identifies a sequence of migrations. It should
	// be globally-unique and we suggest using java-style reverse domain names.
	id: 'com.tldraw.card-shape-example',
	migrations: [
		{
			// The migration ID uniquely identifies a migration.
			// It must begin with the sequence ID followed by a slash and then a unique name within that sequence.
			// As a convention, we use an incrementing integer and a semantic description of the migration as the unique name part.
			id: 'com.tldraw.card-shape-example/001_add_some_property',
			// The 'scope' of the migration determines whether it operates on a snapshot of the entire document at once, or just
			// on a single record at a time.
			scope: 'record',
			// Then you specify up and (optionally) down migrations.
			// We typically type the incoming data as `any` because it's hard to maintain old
			// versions of typings. Make sure you test your migrations thoroughly.
			up(record: any) {
				// This migration will be called for all records in the store.
				// So we need to check that is a card shape record before continuing.
				if (!isCardShape(record)) return record
				const migratedUpShape = { ...record }
				delete migratedUpShape._somePropertyToRemove
				return migratedUpShape
			},
			down(record: any) {
				// This migration will be called for all records in the store.
				// So we need to check that is a card shape record before continuing.
				if (!isCardShape(record)) return record
				const migratedDownShape = { ...record }
				migratedDownShape._somePropertyToRemove = 'some value'
				return migratedDownShape
			},
		},
	],
} as const satisfies MigrationSequence

const isCardShape = (shape: any) => shape.typeName === 'shape' && shape.type === 'card'
