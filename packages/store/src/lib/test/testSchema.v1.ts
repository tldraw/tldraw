import { assert } from '@tldraw/utils'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { SerializedStore } from '../Store'
import { StoreSchema } from '../StoreSchema'
import { createMigrationIds, createMigrationSequence } from '../migrate'

const UserVersion = createMigrationIds('com.tldraw.user', {
	AddLocale: 1,
	AddPhoneNumber: 2,
} as const)

/** A user of tldraw */
interface User extends BaseRecord<'user', RecordId<User>> {
	name: string
	locale: string
	phoneNumber: string | null
}

const userMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.user',
	retroactive: true,
	sequence: [
		{
			id: UserVersion.AddLocale,
			scope: 'record',
			filter: (r) => r.typeName === 'user',
			up: (record: any) => {
				record.locale = 'en'
			},
			down: (record: any) => {
				delete record.locale
			},
		},
		{
			id: UserVersion.AddPhoneNumber,
			scope: 'record',
			filter: (r) => r.typeName === 'user',
			up: (record: any) => {
				record.phoneNumber = null
			},
			down: (record: any) => {
				delete record.phoneNumber
			},
		},
	],
})

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

const ShapeVersion = createMigrationIds('com.tldraw.shape', {
	AddRotation: 1,
	AddParent: 2,
} as const)

const RectangleVersion = createMigrationIds('com.tldraw.shape.rectangle', {
	AddOpacity: 1,
} as const)

const OvalVersion = createMigrationIds('com.tldraw.shape.oval', {
	AddBorderStyle: 1,
} as const)

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
	opactiy: number
}

interface OvalProps {
	radius: number
	borderStyle: 'solid' | 'dashed'
}

const rootShapeMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape',
	retroactive: true,
	sequence: [
		{
			id: ShapeVersion.AddRotation,
			scope: 'record',
			filter: (r) => r.typeName === 'shape',
			up: (record: any) => {
				record.rotation = 0
			},
			down: (record: any) => {
				delete record.rotation
			},
		},
		{
			id: ShapeVersion.AddParent,
			scope: 'record',
			filter: (r) => r.typeName === 'shape',
			up: (record: any) => {
				record.parentId = null
			},
			down: (record: any) => {
				delete record.parentId
			},
		},
	],
})

const rectangleMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.rectangle',
	retroactive: true,
	sequence: [
		{
			id: RectangleVersion.AddOpacity,
			scope: 'record',
			filter: (r) => r.typeName === 'shape' && (r as Shape<RectangleProps>).type === 'rectangle',
			up: (record: any) => {
				record.props.opacity = 1
			},
			down: (record: any) => {
				delete record.props.opacity
			},
		},
	],
})

const ovalMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.oval',
	retroactive: true,
	sequence: [
		{
			id: OvalVersion.AddBorderStyle,
			scope: 'record',
			filter: (r) => r.typeName === 'shape' && (r as Shape<OvalProps>).type === 'oval',
			up: (record: any) => {
				record.props.borderStyle = 'solid'
			},
			down: (record: any) => {
				delete record.props.borderStyle
			},
		},
	],
})

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

const StoreVersions = createMigrationIds('com.tldraw.store', {
	RemoveOrg: 1,
})

const snapshotMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.store',
	retroactive: true,
	sequence: [
		{
			id: StoreVersions.RemoveOrg,
			scope: 'store',
			up: (store: SerializedStore<any>) => {
				return Object.fromEntries(Object.entries(store).filter(([_, r]) => r.typeName !== 'org'))
			},
			down: (store: SerializedStore<any>) => {
				// noop
				return store
			},
		},
	],
})

export const testSchemaV1 = StoreSchema.create<User | Shape<any>>(
	{
		user: User,
		shape: Shape,
	},
	{
		migrations: [
			snapshotMigrations,
			rootShapeMigrations,
			rectangleMigrations,
			ovalMigrations,
			userMigrations,
		],
	}
)
