import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'

import {
	arrayOfValidator,
	literalValidator,
	modelValidator,
	objectValidator,
	TypeValidator,
} from '@tldraw/validate'
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
}

/** @internal */
export const instancePageStateValidator: TypeValidator<TLInstancePageState> = modelValidator(
	'instance_page_state',
	objectValidator({
		typeName: literalValidator('instance_page_state'),
		id: idValidator<TLInstancePageStateId>('instance_page_state'),
		pageId: pageIdValidator,
		selectedIds: arrayOfValidator(shapeIdValidator),
		hintingIds: arrayOfValidator(shapeIdValidator),
		erasingIds: arrayOfValidator(shapeIdValidator),
		hoveredId: shapeIdValidator.nullable(),
		editingId: shapeIdValidator.nullable(),
		croppingId: shapeIdValidator.nullable(),
		focusLayerId: shapeIdValidator.nullable(),
	})
)

const Versions = {
	AddCroppingId: 1,
	RemoveInstanceIdAndCameraId: 2,
} as const

/** @internal */
export { Versions as instancePageStateVersions }

/** @public */
export const instancePageStateMigrations = defineMigrations({
	currentVersion: Versions.RemoveInstanceIdAndCameraId,
	migrators: {
		[Versions.AddCroppingId]: {
			up(instance) {
				return { ...instance, croppingId: null }
			},
			down({ croppingId: _croppingId, ...instance }) {
				return instance
			},
		},
		[Versions.RemoveInstanceIdAndCameraId]: {
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
	})
)

/** @public */
export type TLInstancePageStateId = RecordId<TLInstancePageState>
