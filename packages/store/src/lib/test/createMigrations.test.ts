import { createMigrations } from '../migrate'

describe(createMigrations, () => {
	it('allows dependsOn to be deferred', () => {
		expect(
			createMigrations({
				sequenceId: 'foo',
				retroactive: false,
				sequence: [{ dependsOn: ['bar/1'] }],
			}).sequence.length
		).toBe(0)

		const result = createMigrations({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						// noop
					},
				},
				{ dependsOn: ['bar/1'] },
			],
		})

		expect(result.sequence.length).toBe(1)
		expect(result.sequence[0].dependsOn?.length).toBeFalsy()

		const result2 = createMigrations({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [
				{ dependsOn: ['bar/1'] },
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						// noop
					},
				},
			],
		})

		expect(result2.sequence.length).toBe(1)
		expect(result2.sequence[0].dependsOn).toEqual(['bar/1'])

		const result3 = createMigrations({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						// noop
					},
				},
				{ dependsOn: ['bar/1'] },
				{
					id: 'foo/2',
					scope: 'record',
					up() {
						// noop
					},
				},
			],
		})

		expect(result3.sequence.length).toBe(2)
		expect(result3.sequence[0].dependsOn?.length).toBeFalsy()
		expect(result3.sequence[1].dependsOn).toEqual(['bar/1'])
	})
})
