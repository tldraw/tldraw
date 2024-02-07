import { BaseRecord, createRecordType, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { shapeIdValidator } from '../shapes/TLBaseShape'
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

/** @public */
export const InstancePageStateRecordType = createRecordType<TLInstancePageState>(
	'instance_page_state',
	{
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
