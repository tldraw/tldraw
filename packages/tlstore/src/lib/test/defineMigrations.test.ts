import { Migrator } from '../Migrator'

const Versions = {
	Initial: 0,
	January: 1,
	February: 2,
	March: 3,
} as const

describe('define migrations tests', () => {
	it('defines migrations', () => {
		expect(() => {
			// no versions
			new Migrator({
				// @ts-expect-error first version without current version
				firstVersion: Versions.Initial,
			})
		}).not.toThrowError()

		expect(() => {
			// no versions
			new Migrator({
				// @ts-expect-error first version without current version
				firstVersion: Versions.February,
			})
		}).not.toThrowError()

		expect(() => {
			// empty migrators
			new Migrator({
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// no versions!
			new Migrator({
				// @ts-expect-error
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// wrong current version!
			new Migrator({
				currentVersion: Versions.January,
				migrators: {
					// @ts-expect-error
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			new Migrator({
				currentVersion: Versions.February,
				migrators: {
					// has a default zero version
					[Versions.January]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
					// has a current version
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// can't provide only first version
			new Migrator({
				// @ts-expect-error first version without current version
				firstVersion: Versions.January,
				// @ts-expect-error migrators without current version
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// same version
			new Migrator({
				firstVersion: Versions.Initial,
				currentVersion: Versions.Initial,
				migrators: {},
			})
		}).toThrowError()

		expect(() => {
			// only first version
			new Migrator({
				// @ts-expect-error
				firstVersion: Versions.January,
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// missing only version
			new Migrator({
				firstVersion: Versions.January,
				currentVersion: Versions.January,
				// @ts-expect-error
				migrators: {},
			})
		}).toThrowError()

		expect(() => {
			// only version, explicit start and current
			new Migrator({
				firstVersion: Versions.January,
				currentVersion: Versions.January,
				migrators: {
					[Versions.January]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).toThrowError()

		expect(() => {
			// missing later versions
			new Migrator({
				firstVersion: Versions.January,
				currentVersion: Versions.February,
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// missing later versions
			new Migrator({
				firstVersion: Versions.Initial,
				currentVersion: Versions.February,
				// @ts-expect-error
				migrators: {
					[Versions.January]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// missing earlier versions
			new Migrator({
				firstVersion: Versions.Initial,
				currentVersion: Versions.February,
				// @ts-expect-error
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// got em all
			new Migrator({
				firstVersion: Versions.Initial,
				currentVersion: Versions.February,
				migrators: {
					[Versions.January]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// got em all starting later
			new Migrator({
				firstVersion: Versions.January,
				currentVersion: Versions.March,
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
					[Versions.March]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()

		expect(() => {
			// first migration should be first version + 1
			new Migrator({
				firstVersion: Versions.February,
				currentVersion: Versions.March,
				migrators: {
					// @ts-expect-error
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
					[Versions.March]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrowError()
	})
})
