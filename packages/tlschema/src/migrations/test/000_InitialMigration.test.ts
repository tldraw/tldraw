import { InitialMigration } from '../000_InitialMigration'
import { getTestStore } from './testSchema'

test('the initial migration should be a no-op. It only exists to set a pattern for adding subsequent migrations', () => {
	// the id must never change
	expect(InitialMigration).toMatchInlineSnapshot(`
{
  "id": "com.tldraw/000_InitialMigration",
  "scope": "store",
  "up": [Function],
}
`)

	// You should check your migration logic here.
	const store = getTestStore()
	const emptyState = store.serialize()
	const duplicateState = structuredClone(emptyState)
	expect(InitialMigration.up(emptyState)).toEqual(duplicateState)
	expect(emptyState).toMatchInlineSnapshot(`
{
  "document:document": {
    "gridSize": 10,
    "id": "document:document",
    "meta": {},
    "name": "",
    "typeName": "document",
  },
  "page:page": {
    "id": "page:page",
    "index": "a1",
    "meta": {},
    "name": "Page 1",
    "typeName": "page",
  },
}
`)
})
