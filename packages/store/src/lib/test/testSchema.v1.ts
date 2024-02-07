/* eslint-disable deprecation/deprecation */
import { assert } from '@tldraw/utils'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { SerializedStore } from '../Store'
import { StoreSchema } from '../StoreSchema'
import { MigrationSequence, MigrationsConfigBuilder } from '../migrate'

/** A user of tldraw */
interface User extends BaseRecord<'user', RecordId<User>> {
	name: string
	locale: string
	phoneNumber: string | null
}

const User = createRecordType<User>('user', {
	validator: {
		validate: (record) => {
			assert(record && typeof record === 'object')
			assert('id' in record && typeof record.id === 'string')
			assert('name' in record && typeof record.name === 'string')
			assert('locale' in record && typeof record.locale === 'string')
			assert(
				'phoneNumber' in record &&
					(record.phoneNumber === null || typeof record.phoneNumber === 'string')
			)
			return record as User
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	/* STEP 6: Add any new default values for properties here */
	name: 'New User',
}))

type ShapeId = RecordId<Shape<object>>

interface Shape<Props> extends BaseRecord<'shape', ShapeId> {
	type: string
	x: number
	y: number
	rotation: number
	parentId: ShapeId | null
	props: Props
}

interface RectangleProps {
	width: number
	height: number
	opacity: number
}

interface OvalProps {
	radius: number
	borderStyle: 'solid' | 'dashed'
}

const Shape = createRecordType<Shape<RectangleProps | OvalProps>>('shape', {
	validator: {
		validate: (record) => {
			assert(record && typeof record === 'object')
			assert('id' in record && typeof record.id === 'string')
			assert('type' in record && typeof record.type === 'string')
			assert('x' in record && typeof record.x === 'number')
			assert('y' in record && typeof record.y === 'number')
			assert('rotation' in record && typeof record.rotation === 'number')
			return record as Shape<RectangleProps | OvalProps>
		},
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	x: 0,
	y: 0,
	rotation: 0,
	parentId: null,
}))

const migrationSequence = {
	id: 'test',
	migrations: [
		{
			id: 'test/001_remove_org',
			scope: 'store',
			up: (store: SerializedStore<any>) => {
				return Object.fromEntries(Object.entries(store).filter(([_, r]) => r.typeName !== 'org'))
			},
			down: (store: SerializedStore<any>) => {
				// noop
				return store
			},
		},
		{
			id: 'test/002_add_user_locale',
			scope: 'record',
			up: (record) => {
				if (record.typeName !== 'user') return record
				return {
					...record,
					locale: 'en',
				}
			},
			down: (record) => {
				if (record.typeName !== 'user') return record
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { locale, ...rest } = record as any
				return rest
			},
		},
		{
			id: 'test/003_add_user_phone_number',
			scope: 'record',
			up: (record) => {
				if (record.typeName !== 'user') return record
				return {
					...record,
					phoneNumber: null,
				}
			},
			down: (record) => {
				if (record.typeName !== 'user') return record
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { phoneNumber, ...rest } = record as any
				return rest
			},
		},
		{
			id: 'test/004_add_shape_rotation',
			scope: 'record',
			up: (record) => {
				if (record.typeName !== 'shape') return record
				return {
					...record,
					rotation: 0,
				}
			},
			down: (record) => {
				if (record.typeName !== 'shape') return record
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { rotation, ...rest } = record as any
				return rest
			},
		},
		{
			id: 'test/005_add_shape_parent',
			scope: 'record',
			up: (record) => {
				if (record.typeName !== 'shape') return record
				return {
					...record,
					parentId: null,
				}
			},
			down: (record) => {
				if (record.typeName !== 'shape') return record
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { parentId, ...rest } = record as any
				return rest
			},
		},
		{
			id: 'test/006_add_rectangle_opacity',
			scope: 'record',
			up: (record: Shape<any>) => {
				if (record.typeName !== 'shape' || record.type !== 'rectangle') return record
				return {
					...record,
					props: {
						...record.props,
						opacity: 1,
					},
				}
			},
			down: (record: Shape<any>) => {
				if (record.typeName !== 'shape' || record.type !== 'rectangle') return record
				const {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					props: { opacity, ...others },
					...rest
				} = record
				if (record.typeName !== 'shape' || record.type !== 'rectangle') return record
				return {
					...rest,
					props: {
						...others,
					},
				}
			},
		},
		{
			id: 'test/007_add_oval_border_style',
			scope: 'record',
			up: (record: Shape<any>) => {
				if (record.typeName !== 'shape' || record.type !== 'oval') return record
				return {
					...record,
					props: {
						...record.props,
						borderStyle: 'solid',
					},
				}
			},
			down: (record: Shape<any>) => {
				if (record.typeName !== 'shape' || record.type !== 'oval') return record
				const {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					props: { borderStyle, ...others },
					...rest
				} = record
				return {
					...rest,
					props: {
						...others,
					},
				}
			},
		},
	],
} as const satisfies MigrationSequence

export const testSchemaV1 = StoreSchema.create<User | Shape<any>>(
	{
		user: User,
		shape: Shape,
	},
	{
		migrations: new MigrationsConfigBuilder()
			.addSequence(migrationSequence)
			.setOrder([
				'test/001_remove_org',
				'test/002_add_user_locale',
				'test/003_add_user_phone_number',
				'test/004_add_shape_rotation',
				'test/005_add_shape_parent',
				'test/006_add_rectangle_opacity',
				'test/007_add_oval_border_style',
			]),
	}
)
