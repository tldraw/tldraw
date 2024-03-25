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
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.Initial,
			})
		}).not.toThrow()

		expect(() => {
			// no versions
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.February,
			})
		}).not.toThrow()

		expect(() => {
			// empty migrators
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				migrators: {},
			})
		}).not.toThrow()

		expect(() => {
			// no versions!
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrow()

		expect(() => {
			// wrong current version!
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				currentVersion: Versions.January,
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrow()

		expect(() => {
			// eslint-disable-next-line deprecation/deprecation
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
		}).not.toThrow()

		expect(() => {
			// can't provide only first version
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.January,
				migrators: {},
			})
		}).not.toThrow()

		expect(() => {
			// same version
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.Initial,
				currentVersion: Versions.Initial,
				migrators: {},
			})
		}).toThrow()

		expect(() => {
			// only first version
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.January,
				migrators: {},
			})
		}).not.toThrow()

		expect(() => {
			// missing only version
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.January,
				currentVersion: Versions.January,
				migrators: {},
			})
		}).toThrow()

		expect(() => {
			// only version, explicit start and current
			// eslint-disable-next-line deprecation/deprecation
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
		}).toThrow()

		expect(() => {
			// missing later versions
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.January,
				currentVersion: Versions.February,
				migrators: {},
			})
		}).not.toThrow()

		expect(() => {
			// missing later versions
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.Initial,
				currentVersion: Versions.February,
				migrators: {
					[Versions.January]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrow()

		expect(() => {
			// missing earlier versions
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.Initial,
				currentVersion: Versions.February,
				migrators: {
					[Versions.February]: {
						up: (rec: any) => rec,
						down: (rec: any) => rec,
					},
				},
			})
		}).not.toThrow()

		expect(() => {
			// got em all
			// eslint-disable-next-line deprecation/deprecation
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
		}).not.toThrow()

		expect(() => {
			// got em all starting later
			// eslint-disable-next-line deprecation/deprecation
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
		}).not.toThrow()

		expect(() => {
			// first migration should be first version + 1
			// eslint-disable-next-line deprecation/deprecation
			defineMigrations({
				firstVersion: Versions.February,
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
		}).not.toThrow()
	})
})
