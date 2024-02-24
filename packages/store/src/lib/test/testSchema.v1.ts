import { assert } from '@tldraw/utils'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { SerializedStore } from '../Store'
import { StoreSchema } from '../StoreSchema'
import { defineMigrations } from '../migrate'

const StoreVersions = {
	RemoveOrg: 1,
	AddCount: 2,
}

const snapshotMigrations = defineMigrations({
	currentVersion: StoreVersions.AddCount,
	migrators: {
		[StoreVersions.RemoveOrg]: {
			up: (store: SerializedStore<any>) => {
				return Object.fromEntries(Object.entries(store).filter(([_, r]) => r.typeName !== 'org'))
			},
			down: (store: SerializedStore<any>) => {
				// noop
				return store
			},
		},
		[StoreVersions.AddCount]: {
			up: (store: SerializedStore<any>) => {
				return Object.fromEntries(Object.entries(store).map(([id, r]) => [id, { ...r, count: 0 }]))
			},
			down: (store: SerializedStore<any>) => {
				return Object.fromEntries(
					Object.entries(store).map(([id, { count: _, ...r }]) => [id, { ...r }])
				)
			},
		},
	},
})

const UserVersion = {
	AddLocale: 1,
	AddPhoneNumber: 2,
} as const

/** A user of tldraw */
interface User extends BaseRecord<'user', RecordId<User>> {
	name: string
	locale: string
	phoneNumber: string | null
}

const userMigrations = defineMigrations({
	currentVersion: UserVersion.AddPhoneNumber,
	migrators: {
		[UserVersion.AddLocale]: {
			up: (record) => ({
				...record,
				locale: 'en',
			}),
			down: (record) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { locale, ...rest } = record
				return rest
			},
		},
		[UserVersion.AddPhoneNumber]: {
			up: (record) => ({
				...record,
				phoneNumber: null,
			}),
			down: (record) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { phoneNumber, ...rest } = record
				return rest
			},
		},
	},
})

const User = createRecordType<User>('user', {
	migrations: userMigrations,
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

const ShapeVersion = {
	AddRotation: 1,
	AddParent: 2,
	// This one MUST happen after the snapshot migration StoreVersions.AddCount
	IncrementCount: 3,
} as const

const RectangleVersion = {
	AddOpacity: 1,
} as const

const OvalVersion = {
	AddBorderStyle: 1,
	// This one MUST happen after the snapshot migration StoreVersions.AddCount
	DecrementCount: 2,
} as const

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

const shapeTypeMigrations = defineMigrations({
	currentVersion: ShapeVersion.IncrementCount,
	migrators: {
		[ShapeVersion.AddRotation]: {
			up: (record) => ({
				...record,
				rotation: 0,
			}),
			down: (record) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { rotation, ...rest } = record
				return rest
			},
		},
		[ShapeVersion.AddParent]: {
			up: (record) => ({
				...record,
				parentId: null,
			}),
			down: (record) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { parentId, ...rest } = record
				return rest
			},
		},
		[ShapeVersion.IncrementCount]: {
			storeVersion: StoreVersions.AddCount,
			up: (record) => ({
				...record,
				count: record.count + 1,
			}),
			down: (record) => ({
				...record,
				count: record.count - 1,
			}),
		},
	},
	subTypeKey: 'type',
	subTypeMigrations: {
		rectangle: defineMigrations({
			currentVersion: RectangleVersion.AddOpacity,
			migrators: {
				[RectangleVersion.AddOpacity]: {
					up: (record) => ({
						...record,
						props: {
							...record.props,
							opacity: 1,
						},
					}),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					down: ({ props: { opacity, ...others }, ...record }) => ({
						...record,
						props: {
							...others,
						},
					}),
				},
			},
		}),
		oval: defineMigrations({
			currentVersion: OvalVersion.DecrementCount,
			migrators: {
				[OvalVersion.AddBorderStyle]: {
					up: (record) => ({
						...record,
						props: {
							...record.props,
							borderStyle: 'solid',
						},
					}),
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					down: ({ props: { borderStyle, ...others }, ...record }) => ({
						...record,
						props: {
							...others,
						},
					}),
				},
				[OvalVersion.DecrementCount]: {
					storeVersion: StoreVersions.AddCount,
					up: (record) => ({
						...record,
						count: record.count - 1,
					}),
					down: (record) => ({
						...record,
						count: record.count + 1,
					}),
				},
			},
		}),
	},
})

const Shape = createRecordType<Shape<RectangleProps | OvalProps>>('shape', {
	migrations: shapeTypeMigrations,
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

export const testSchemaV1 = StoreSchema.create<User | Shape<any>>(
	{
		user: User,
		shape: Shape,
	},
	{
		snapshotMigrations,
	}
)
