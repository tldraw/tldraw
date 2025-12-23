import { Migration, MigrationId, sortMigrations } from '../migrate'

describe(sortMigrations, () => {
	const m = (id: MigrationId, others?: { dependsOn?: MigrationId[] }): Migration => ({
		...others,
		id,
		scope: 'record',
		up() {
			// noop
		},
	})
	const sort = (migrations: Migration[]) => {
		return sortMigrations(migrations).map((m) => m.id)
	}
	it('should sort migrations based on version number', () => {
		expect(sort([m('foo/2'), m('foo/1')])).toEqual(['foo/1', 'foo/2'])
		expect(sort([m('foo/1'), m('foo/2')])).toEqual(['foo/1', 'foo/2'])
	})
	it('should sort multiple migration sequences based on version number', () => {
		const result = sort([m('foo/2'), m('bar/2'), m('foo/1'), m('bar/1')])
		expect(result.filter((id) => id.startsWith('foo/'))).toEqual(['foo/1', 'foo/2'])
		expect(result.filter((id) => id.startsWith('bar/'))).toEqual(['bar/1', 'bar/2'])
	})
	it('should use dependsOn to resolve inter-sequence dependencies', () => {
		expect(
			sort([m('foo/2'), m('bar/2'), m('foo/1'), m('bar/1', { dependsOn: ['foo/2'] })])
		).toEqual(['foo/1', 'foo/2', 'bar/1', 'bar/2'])

		expect(
			sort([m('foo/2'), m('bar/2'), m('foo/1', { dependsOn: ['bar/2'] }), m('bar/1')])
		).toEqual(['bar/1', 'bar/2', 'foo/1', 'foo/2'])
	})

	it('should minimize distance between dependencies and dependents', () => {
		// bar/3 depends on foo/1 - should process bar sequence immediately after foo/1
		expect(
			sort([m('foo/2'), m('bar/3', { dependsOn: ['foo/1'] }), m('foo/1'), m('bar/1'), m('bar/2')])
		).toEqual(['foo/1', 'bar/1', 'bar/2', 'bar/3', 'foo/2'])
	})

	it('should minimize total distance for multiple explicit dependencies', () => {
		// Both bar/2 and baz/1 depend on foo/1 - minimize total distance
		expect(
			sort([
				m('foo/2'),
				m('bar/2', { dependsOn: ['foo/1'] }),
				m('foo/1'),
				m('bar/1'),
				m('baz/1', { dependsOn: ['foo/1'] }),
			])
		).toEqual(['foo/1', 'bar/1', 'bar/2', 'baz/1', 'foo/2'])
	})

	it('should handle chain of explicit dependencies optimally', () => {
		// foo/1 -> bar/1 -> baz/1 chain should be consecutive
		expect(
			sort([
				m('foo/2'),
				m('bar/1', { dependsOn: ['foo/1'] }),
				m('foo/1'),
				m('baz/1', { dependsOn: ['bar/1'] }),
			])
		).toEqual(['foo/1', 'bar/1', 'baz/1', 'foo/2'])
	})

	it('should fail if a cycle is created', () => {
		expect(() => {
			sort([m('foo/1', { dependsOn: ['foo/1'] })])
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: foo/1]`)

		expect(() => {
			sort([m('foo/1', { dependsOn: ['foo/2'] }), m('foo/2')])
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: foo/1]`)

		expect(() => {
			sort([m('foo/1', { dependsOn: ['bar/1'] }), m('bar/1', { dependsOn: ['foo/1'] })])
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: foo/1]`)

		expect(() => {
			sort([m('bar/1', { dependsOn: ['foo/1'] }), m('foo/1', { dependsOn: ['bar/1'] })])
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: bar/1]`)
	})
})
