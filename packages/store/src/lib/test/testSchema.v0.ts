import assert from 'assert'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { StoreSchema } from '../StoreSchema'
import { defineMigrations } from '../migrate'

/** A user of tldraw */
interface User extends BaseRecord<'user', RecordId<User>> {
	name: string
}

const userMigrations = defineMigrations({})

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

interface Shape<Props> extends BaseRecord<'shape', RecordId<Shape<object>>> {
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

const shapeTypeMigrations = defineMigrations({
	subTypeKey: 'type',
	subTypeMigrations: {
		rectangle: defineMigrations({}),
	},
})

const Shape = createRecordType<Shape<RectangleProps | OvalProps>>('shape', {
	migrations: shapeTypeMigrations,
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
interface Org extends BaseRecord<'org', RecordId<Org>> {
	name: string
}

const Org = createRecordType<Org>('org', {
	migrations: defineMigrations({}),
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
		snapshotMigrations: defineMigrations({}),
	}
)
