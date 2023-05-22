import { defineMigrations } from '../migrate'

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
			defineMigrations({
				// @ts-expect-error first version without current version
				firstVersion: Versions.Initial,
			})
		}).not.toThrowError()

		expect(() => {
			// no versions
			defineMigrations({
				// @ts-expect-error first version without current version
				firstVersion: Versions.February,
			})
		}).not.toThrowError()

		expect(() => {
			// empty migrators
			defineMigrations({
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// no versions!
			defineMigrations({
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
			defineMigrations({
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
			defineMigrations({
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
			defineMigrations({
				// @ts-expect-error first version without current version
				firstVersion: Versions.January,
				// @ts-expect-error migrators without current version
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// same version
			defineMigrations({
				firstVersion: Versions.Initial,
				currentVersion: Versions.Initial,
				migrators: {},
			})
		}).toThrowError()

		expect(() => {
			// only first version
			defineMigrations({
				// @ts-expect-error
				firstVersion: Versions.January,
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// missing only version
			defineMigrations({
				firstVersion: Versions.January,
				currentVersion: Versions.January,
				// @ts-expect-error
				migrators: {},
			})
		}).toThrowError()

		expect(() => {
			// only version, explicit start and current
			defineMigrations({
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
			defineMigrations({
				firstVersion: Versions.January,
				currentVersion: Versions.February,
				// @ts-expect-error
				migrators: {},
			})
		}).not.toThrowError()

		expect(() => {
			// missing later versions
			defineMigrations({
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
			defineMigrations({
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
			defineMigrations({
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
			defineMigrations({
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
			defineMigrations({
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
