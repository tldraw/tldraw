import { assert } from '@tldraw/utils'
import { BaseRecord } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { StoreSchema } from '../StoreSchema'
import { defineMigrations } from '../migrate'

const UserVersion = {
	Initial: 0,
} as const

/** A user of tldraw */
interface User extends BaseRecord<'user'> {
	name: string
}

const userMigrations = defineMigrations({
	firstVersion: UserVersion.Initial,
	currentVersion: UserVersion.Initial,
	migrators: {},
})

const User = createRecordType<User>('user', {
	migrations: userMigrations,
	validator: {
		validate: (record) => {
			assert(
				record && typeof record === 'object' && 'name' in record && typeof record.name === 'string'
			)
			return record as User
		},
	},
	scope: 'document',
})

const ShapeVersion = {
	Initial: 0,
} as const

const RectangleVersion = {
	Initial: 0,
} as const

interface Shape<Props> extends BaseRecord<'shape'> {
	type: string
	x: number
	y: number
	props: Props
}

interface RectangleProps {
	width: number
	height: number
	opactiy: number
}

interface OvalProps {
	radius: number
	borderStyle: 'solid' | 'dashed'
}

const shapeMigrations = defineMigrations({
	currentVersion: ShapeVersion.Initial,
	firstVersion: ShapeVersion.Initial,
	migrators: {},
	subTypeKey: 'type',
	subTypeMigrations: {
		rectangle: defineMigrations({
			currentVersion: RectangleVersion.Initial,
			firstVersion: RectangleVersion.Initial,
			migrators: {},
		}),
	},
})

const Shape = createRecordType<Shape<RectangleProps | OvalProps>>('shape', {
	migrations: shapeMigrations,
	validator: {
		validate: (record) => {
			assert(
				record &&
					typeof record === 'object' &&
					'type' in record &&
					typeof record.type === 'string' &&
					'x' in record &&
					typeof record.x === 'number' &&
					'y' in record &&
					typeof record.y === 'number' &&
					'props' in record &&
					typeof record.props === 'object'
			)
			return record as Shape<RectangleProps | OvalProps>
		},
	},
	scope: 'document',
})

// this interface only exists to be removed
interface Org extends BaseRecord<'org'> {
	name: string
}

const Org = createRecordType<Org>('org', {
	migrations: defineMigrations({ currentVersion: 0, firstVersion: 0, migrators: {} }),
	validator: {
		validate: (record) => {
			assert(
				record && typeof record === 'object' && 'name' in record && typeof record.name === 'string'
			)
			return record as Org
		},
	},
	scope: 'document',
})

export const testSchemaV0 = StoreSchema.create(
	{
		user: User,
		shape: Shape,
		org: Org,
	},
	{
		snapshotMigrations: defineMigrations({ currentVersion: 0, firstVersion: 0, migrators: {} }),
	}
)
