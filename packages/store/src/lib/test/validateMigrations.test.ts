import { validateMigrations } from '../migrate'

describe(validateMigrations, () => {
	it('should throw if a migration id is invalid', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo.1' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Every migration in sequence 'foo' must have an id starting with 'foo/'. Got invalid id: 'foo.1']`
		)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo/one' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: Invalid migration id: 'foo/one']`)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo/1' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
					{
						id: 'foo.2' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Every migration in sequence 'foo' must have an id starting with 'foo/'. Got invalid id: 'foo.2']`
		)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo/1' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
					{
						id: 'foo/two' as any,
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: Invalid migration id: 'foo/two']`)
	})

	it('should throw if the sequenceId is invalid', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [],
				sequenceId: 'foo/bar',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: sequenceId cannot contain a '/', got foo/bar]`)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [],
				sequenceId: '',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: sequenceId must be a non-empty string]`)
	})

	it('should throw if the version numbers do not start at 1', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo/2',
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Expected the first migrationId to be 'foo/1' but got 'foo/2']`
		)
	})

	it('should throw if the version numbers do not increase monotonically', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [
					{
						id: 'foo/1',
						scope: 'record',
						up() {
							// noop
						},
					},
					{
						id: 'foo/2',
						scope: 'record',
						up() {
							// noop
						},
					},
					{
						id: 'foo/4',
						scope: 'record',
						up() {
							// noop
						},
					},
				],

				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Migration id numbers must increase in increments of 1, expected foo/3 but got 'foo/4']`
		)
	})
})
