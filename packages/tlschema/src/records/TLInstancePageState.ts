import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { TLCamera } from './TLCamera'
import { TLInstance } from './TLInstance'
import { TLPage } from './TLPage'
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

const Versions = {
	AddCroppingId: 1,
} as const

/** @public */
export const instancePageStateTypeMigrator = new Migrator({
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
