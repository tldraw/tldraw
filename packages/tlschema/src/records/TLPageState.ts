import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { shapeIdValidator } from '../shapes/TLBaseShape'
import { CameraRecordType } from './TLCamera'
import { TLINSTANCE_ID } from './TLInstance'
import { pageIdValidator, TLPage } from './TLPage'
import { TLShapeId } from './TLShape'

/**
 * TLInstancePageState
 *
 * State that is unique to a particular page of the document in a particular browser tab
 *
 * @public
 */
export interface TLInstancePageState
	extends BaseRecord<'instance_page_state', TLInstancePageStateId> {
	pageId: RecordId<TLPage>
	selectedIds: TLShapeId[]
	hintingIds: TLShapeId[]
	erasingIds: TLShapeId[]
	hoveredId: TLShapeId | null
	editingId: TLShapeId | null
	croppingId: TLShapeId | null
	focusLayerId: TLShapeId | null
	meta: JsonObject
}

/** @internal */
export const instancePageStateValidator: T.Validator<TLInstancePageState> = T.model(
	'instance_page_state',
	T.object({
		typeName: T.literal('instance_page_state'),
		id: idValidator<TLInstancePageStateId>('instance_page_state'),
		pageId: pageIdValidator,
		selectedIds: T.arrayOf(shapeIdValidator),
		hintingIds: T.arrayOf(shapeIdValidator),
		erasingIds: T.arrayOf(shapeIdValidator),
		hoveredId: shapeIdValidator.nullable(),
		editingId: shapeIdValidator.nullable(),
		croppingId: shapeIdValidator.nullable(),
		focusLayerId: shapeIdValidator.nullable(),
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @internal */
export const instancePageStateVersions = {
	AddCroppingId: 1,
	RemoveInstanceIdAndCameraId: 2,
	AddMeta: 3,
} as const

/** @public */
export const instancePageStateMigrations = defineMigrations({
	currentVersion: instancePageStateVersions.AddMeta,
	migrators: {
		[instancePageStateVersions.AddCroppingId]: {
			up(instance) {
				return { ...instance, croppingId: null }
			},
			down({ croppingId: _croppingId, ...instance }) {
				return instance
			},
		},
		[instancePageStateVersions.RemoveInstanceIdAndCameraId]: {
			up({ instanceId: _, cameraId: __, ...instance }) {
				return instance
			},
			down(instance) {
				// this should never be called since we bump the schema version
				return {
					...instance,
					instanceId: TLINSTANCE_ID,
					cameraId: CameraRecordType.createId('void'),
				}
			},
		},
		[instancePageStateVersions.AddMeta]: {
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @public */
export const InstancePageStateRecordType = createRecordType<TLInstancePageState>(
	'instance_page_state',
	{
		migrations: instancePageStateMigrations,
		validator: instancePageStateValidator,
		scope: 'session',
	}
).withDefaultProperties(
	(): Omit<TLInstancePageState, 'id' | 'typeName' | 'pageId'> => ({
		editingId: null,
		croppingId: null,
		selectedIds: [],
		hoveredId: null,
		erasingIds: [],
		hintingIds: [],
		focusLayerId: null,
		meta: {},
	})
)

/** @public */
export type TLInstancePageStateId = RecordId<TLInstancePageState>
