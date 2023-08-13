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
	selectedShapeIds: TLShapeId[]
	hintingShapeIds: TLShapeId[]
	erasingShapeIds: TLShapeId[]
	hoveredShapeId: TLShapeId | null
	editingShapeId: TLShapeId | null
	croppingShapeId: TLShapeId | null
	focusedGroupId: TLShapeId | null
	meta: JsonObject
}

/** @internal */
export const instancePageStateValidator: T.Validator<TLInstancePageState> = T.model(
	'instance_page_state',
	T.object({
		typeName: T.literal('instance_page_state'),
		id: idValidator<TLInstancePageStateId>('instance_page_state'),
		pageId: pageIdValidator,
		selectedShapeIds: T.arrayOf(shapeIdValidator),
		hintingShapeIds: T.arrayOf(shapeIdValidator),
		erasingShapeIds: T.arrayOf(shapeIdValidator),
		hoveredShapeId: shapeIdValidator.nullable(),
		editingShapeId: shapeIdValidator.nullable(),
		croppingShapeId: shapeIdValidator.nullable(),
		focusedGroupId: shapeIdValidator.nullable(),
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @internal */
export const instancePageStateVersions = {
	AddCroppingId: 1,
	RemoveInstanceIdAndCameraId: 2,
	AddMeta: 3,
	RenameProperties: 4,
} as const

/** @public */
export const instancePageStateMigrations = defineMigrations({
	currentVersion: instancePageStateVersions.RenameProperties,
	migrators: {
		[instancePageStateVersions.AddCroppingId]: {
			up(instance) {
				return { ...instance, croppingShapeId: null }
			},
			down({ croppingShapeId: _croppingShapeId, ...instance }) {
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
		[instancePageStateVersions.RenameProperties]: {
			up: (record) => {
				const {
					selectedShapeIds,
					hintingShapeIds,
					erasingShapeIds,
					hoveredShapeId,
					editingShapeId,
					croppingShapeId,
					focusedGroupId,
					...rest
				} = record
				return {
					selectedShapeIds: selectedShapeIds,
					hintingShapeIds: hintingShapeIds,
					erasingShapeIds: erasingShapeIds,
					hoveredShapeId: hoveredShapeId,
					editingShapeId: editingShapeId,
					croppingShapeId: croppingShapeId,
					focusedGroupId: focusedGroupId,
					...rest,
				}
			},
			down: (record) => {
				const {
					selectedShapeIds,
					hintingShapeIds,
					erasingShapeIds,
					hoveredShapeId,
					editingShapeId,
					croppingShapeId,
					focusedGroupId,
					...rest
				} = record
				return {
					selectedShapeIds: selectedShapeIds,
					hintingShapeIds: hintingShapeIds,
					erasingShapeIds: erasingShapeIds,
					hoveredShapeId: hoveredShapeId,
					editingShapeId: editingShapeId,
					croppingShapeId: croppingShapeId,
					focusedGroupId: focusedGroupId,
					...rest,
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
		editingShapeId: null,
		croppingShapeId: null,
		selectedShapeIds: [],
		hoveredShapeId: null,
		erasingShapeIds: [],
		hintingShapeIds: [],
		focusedGroupId: null,
		meta: {},
	})
)

/** @public */
export type TLInstancePageStateId = RecordId<TLInstancePageState>
