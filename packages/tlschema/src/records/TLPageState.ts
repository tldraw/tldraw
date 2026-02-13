import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { shapeIdValidator } from '../shapes/TLBaseShape'
import { pageIdValidator, TLPage } from './TLPage'
import { TLShapeId } from './TLShape'

/**
 * State that is unique to a particular page within a particular browser tab.
 * This record tracks all page-specific interaction state including selected shapes,
 * editing state, hover state, and other transient UI state that is tied to
 * both a specific page and a specific browser session.
 *
 * Each combination of page and browser tab has its own TLInstancePageState record.
 *
 * @example
 * ```ts
 * const pageState: TLInstancePageState = {
 *   id: 'instance_page_state:page1',
 *   typeName: 'instance_page_state',
 *   pageId: 'page:page1',
 *   selectedShapeIds: ['shape:rect1', 'shape:circle2'],
 *   hoveredShapeId: 'shape:text3',
 *   editingShapeId: null,
 *   focusedGroupId: null
 * }
 * ```
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

/**
 * Runtime validator for TLInstancePageState records. Validates the structure
 * and types of all instance page state properties to ensure data integrity.
 *
 * @example
 * ```ts
 * const pageState = {
 *   id: 'instance_page_state:page1',
 *   typeName: 'instance_page_state',
 *   pageId: 'page:page1',
 *   selectedShapeIds: ['shape:rect1'],
 *   // ... other properties
 * }
 * const isValid = instancePageStateValidator.isValid(pageState) // true
 * ```
 *
 * @public
 */
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

/**
 * Migration version identifiers for TLInstancePageState records. Each version
 * represents a schema change that requires data transformation when loading
 * older documents.
 *
 * @public
 */
export const instancePageStateVersions = createMigrationIds('com.tldraw.instance_page_state', {
	AddCroppingId: 1,
	RemoveInstanceIdAndCameraId: 2,
	AddMeta: 3,
	RenameProperties: 4,
	RenamePropertiesAgain: 5,
} as const)

/**
 * Migration sequence for TLInstancePageState records. Defines how to transform
 * instance page state records between different schema versions, ensuring data
 * compatibility when loading documents created with different versions.
 *
 * @example
 * ```ts
 * // Migrations are applied automatically when loading documents
 * const migrated = instancePageStateMigrations.migrate(oldState, targetVersion)
 * ```
 *
 * @public
 */
export const instancePageStateMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.instance_page_state',
	recordType: 'instance_page_state',
	sequence: [
		{
			id: instancePageStateVersions.AddCroppingId,
			up(instance: any) {
				instance.croppingShapeId = null
			},
		},
		{
			id: instancePageStateVersions.RemoveInstanceIdAndCameraId,
			up(instance: any) {
				delete instance.instanceId
				delete instance.cameraId
			},
		},
		{
			id: instancePageStateVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
		{
			id: instancePageStateVersions.RenameProperties,
			// this migration is cursed: it was written wrong and doesn't do anything.
			// rather than replace it, I've added another migration below that fixes it.
			up: (_record) => {
				// noop
			},
			down: (_record) => {
				// noop
			},
		},
		{
			id: instancePageStateVersions.RenamePropertiesAgain,
			up: (record: any) => {
				record.selectedShapeIds = record.selectedIds
				delete record.selectedIds
				record.hintingShapeIds = record.hintingIds
				delete record.hintingIds
				record.erasingShapeIds = record.erasingIds
				delete record.erasingIds
				record.hoveredShapeId = record.hoveredId
				delete record.hoveredId
				record.editingShapeId = record.editingId
				delete record.editingId
				record.croppingShapeId = record.croppingShapeId ?? record.croppingId ?? null
				delete record.croppingId
				record.focusedGroupId = record.focusLayerId
				delete record.focusLayerId
			},
			down: (record: any) => {
				record.selectedIds = record.selectedShapeIds
				delete record.selectedShapeIds
				record.hintingIds = record.hintingShapeIds
				delete record.hintingShapeIds
				record.erasingIds = record.erasingShapeIds
				delete record.erasingShapeIds
				record.hoveredId = record.hoveredShapeId
				delete record.hoveredShapeId
				record.editingId = record.editingShapeId
				delete record.editingShapeId
				record.croppingId = record.croppingShapeId
				delete record.croppingShapeId
				record.focusLayerId = record.focusedGroupId
				delete record.focusedGroupId
			},
		},
	],
})

/**
 * The RecordType definition for TLInstancePageState records. Defines validation,
 * scope, and default properties for instance page state records.
 *
 * Instance page states are scoped to the session level, meaning they are
 * specific to a browser tab and don't persist across sessions or sync
 * in collaborative environments.
 *
 * @example
 * ```ts
 * const pageState = InstancePageStateRecordType.create({
 *   id: 'instance_page_state:page1',
 *   pageId: 'page:page1',
 *   selectedShapeIds: ['shape:rect1']
 * })
 * ```
 *
 * @public
 */
export const InstancePageStateRecordType = createRecordType<TLInstancePageState>(
	'instance_page_state',
	{
		validator: instancePageStateValidator,
		scope: 'session',
		ephemeralKeys: {
			pageId: false,
			selectedShapeIds: false,
			editingShapeId: false,
			croppingShapeId: false,
			meta: false,

			hintingShapeIds: true,
			erasingShapeIds: true,
			hoveredShapeId: true,
			focusedGroupId: true,
		},
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

/**
 * A unique identifier for TLInstancePageState records.
 *
 * Instance page state IDs follow the format 'instance_page_state:' followed
 * by a unique identifier, typically related to the page ID.
 *
 * @example
 * ```ts
 * const stateId: TLInstancePageStateId = 'instance_page_state:page1'
 * ```
 *
 * @public
 */
export type TLInstancePageStateId = RecordId<TLInstancePageState>
