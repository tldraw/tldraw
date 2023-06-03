import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { shapeIdValidator } from '../shapes/TLBaseShape'
import { TLCamera, TLCameraId } from './TLCamera'
import { instanceIdValidator, TLInstance } from './TLInstance'
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
	instanceId: ID<TLInstance>
	pageId: ID<TLPage>
	cameraId: ID<TLCamera>
	selectedIds: TLShapeId[]
	hintingIds: TLShapeId[]
	erasingIds: TLShapeId[]
	hoveredId: TLShapeId | null
	editingId: TLShapeId | null
	croppingId: TLShapeId | null
	focusLayerId: TLShapeId | null
}

/** @public */
export const instancePageStateTypeValidator: T.Validator<TLInstancePageState> = T.model(
	'instance_page_state',
	T.object({
		typeName: T.literal('instance_page_state'),
		id: idValidator<TLInstancePageStateId>('instance_page_state'),
		instanceId: instanceIdValidator,
		pageId: pageIdValidator,
		cameraId: idValidator<TLCameraId>('camera'),
		selectedIds: T.arrayOf(shapeIdValidator),
		hintingIds: T.arrayOf(shapeIdValidator),
		erasingIds: T.arrayOf(shapeIdValidator),
		hoveredId: shapeIdValidator.nullable(),
		editingId: shapeIdValidator.nullable(),
		croppingId: shapeIdValidator.nullable(),
		focusLayerId: shapeIdValidator.nullable(),
	})
)

const Versions = {
	AddCroppingId: 1,
} as const

/** @public */
export const instancePageStateMigrations = defineMigrations({
	currentVersion: Versions.AddCroppingId,
	migrators: {
		[Versions.AddCroppingId]: {
			up(instance) {
				return { ...instance, croppingId: null }
			},
			down({ croppingId: _croppingId, ...instance }) {
				return instance
			},
		},
	},
})

/** @public */
export const InstancePageStateRecordType = createRecordType<TLInstancePageState>(
	'instance_page_state',
	{
		migrations: instancePageStateMigrations,
		validator: instancePageStateTypeValidator,
		scope: 'instance',
	}
).withDefaultProperties(
	(): Omit<
		TLInstancePageState,
		'id' | 'typeName' | 'userId' | 'instanceId' | 'cameraId' | 'pageId'
	> => ({
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
export type TLInstancePageStateId = ID<TLInstancePageState>
