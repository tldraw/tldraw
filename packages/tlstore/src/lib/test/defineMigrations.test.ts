/* eslint-disable @typescript-eslint/no-unused-vars */
import { defineMigrations } from '../migrate'

const Versions = {
	Initial: 0,
	January: 1,
	February: 2,
	March: 3,
} as const

// empty migrators
const a = defineMigrations({
	// @ts-expect-error
	migrators: {},
})

// no versions!
const a1 = defineMigrations({
	// @ts-expect-error
	migrators: {
		[Versions.February]: {
			up: (rec: any) => rec,
			down: (rec: any) => rec,
		},
	},
})

// wrong current version!
const a2 = defineMigrations({
	currentVersion: Versions.January,
	migrators: {
		// @ts-expect-error
		[Versions.February]: {
			up: (rec: any) => rec,
			down: (rec: any) => rec,
		},
	},
})

const a3 = defineMigrations({
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

// can't provide only first version
const b1 = defineMigrations({
	firstVersion: Versions.January,
	// @ts-expect-error
	migrators: {},
})

// missing only 0 version
const b2 = defineMigrations({
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {},
})

// missing only version
const b2a = defineMigrations({
	firstVersion: Versions.January,
	currentVersion: Versions.January,
	// @ts-expect-error
	migrators: {},
})

// only version, explicit start and current
const b3 = defineMigrations({
	firstVersion: Versions.January,
	currentVersion: Versions.January,
	migrators: {
		[Versions.January]: {
			up: (rec: any) => rec,
			down: (rec: any) => rec,
		},
	},
})

// missing later versions
const b4 = defineMigrations({
	firstVersion: Versions.January,
	currentVersion: Versions.February,
	// @ts-expect-error
	migrators: {},
})

// missing later versions
const b5 = defineMigrations({
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

// missing earlier versions
const b6 = defineMigrations({
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

// got em all
const b7 = defineMigrations({
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
