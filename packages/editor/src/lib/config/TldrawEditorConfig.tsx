import {
	CLIENT_FIXUP_SCRIPT,
	TLDOCUMENT_ID,
	TLInstance,
	TLInstanceId,
	TLInstancePresence,
	TLRecord,
	TLShape,
	TLStore,
	TLStoreProps,
	TLUser,
	TLUserId,
	createTLSchema,
} from '@tldraw/tlschema'
import { RecordType, Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'
import { Signal } from 'signia'
import { TLArrowShapeDef } from '../app/shapeutils/TLArrowUtil/TLArrowUtil'
import { TLBookmarkShapeDef } from '../app/shapeutils/TLBookmarkUtil/TLBookmarkUtil'
import { TLDrawShapeDef } from '../app/shapeutils/TLDrawUtil/TLDrawUtil'
import { TLEmbedShapeDef } from '../app/shapeutils/TLEmbedUtil/TLEmbedUtil'
import { TLFrameShapeDef } from '../app/shapeutils/TLFrameUtil/TLFrameUtil'
import { TLGeoShapeDef } from '../app/shapeutils/TLGeoUtil/TLGeoUtil'
import { TLGroupShapeDef } from '../app/shapeutils/TLGroupUtil/TLGroupUtil'
import { TLImageShapeDef } from '../app/shapeutils/TLImageUtil/TLImageUtil'
import { TLLineShapeDef } from '../app/shapeutils/TLLineUtil/TLLineUtil'
import { TLNoteShapeDef } from '../app/shapeutils/TLNoteUtil/TLNoteUtil'
import { TLTextShapeDef } from '../app/shapeutils/TLTextUtil/TLTextUtil'
import { TLVideoShapeDef } from '../app/shapeutils/TLVideoUtil/TLVideoUtil'
import { StateNodeConstructor } from '../app/statechart/StateNode'
import { TLShapeDef, TLUnknownShapeDef } from './TLShapeDefinition'

/** @public */
export class TldrawEditorConfig {
	static readonly default = new TldrawEditorConfig({})

	readonly storeSchema: StoreSchema<TLRecord, TLStoreProps>
	readonly shapes: readonly TLUnknownShapeDef[]
	readonly TLShape: RecordType<TLShape, 'type' | 'props' | 'index' | 'parentId'>
	readonly tools: readonly StateNodeConstructor[]

	constructor(args: {
		shapes?: readonly TLShapeDef<any, any>[]
		tools?: readonly StateNodeConstructor[]
		allowUnknownShapes?: boolean
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}) {
		const { shapes = [], tools = [], allowUnknownShapes = false, derivePresenceState } = args
		this.tools = tools

		this.shapes = [
			TLArrowShapeDef,
			TLBookmarkShapeDef,
			TLDrawShapeDef,
			TLEmbedShapeDef,
			TLFrameShapeDef,
			TLGeoShapeDef,
			TLGroupShapeDef,
			TLImageShapeDef,
			TLLineShapeDef,
			TLNoteShapeDef,
			TLTextShapeDef,
			TLVideoShapeDef,
			...shapes,
		]

		this.storeSchema = createTLSchema({
			allowUnknownShapes,
			customShapeDefs: shapes,
			derivePresenceState,
		})

		this.TLShape = this.storeSchema.types.shape as RecordType<
			TLShape,
			'type' | 'props' | 'index' | 'parentId'
		>
	}

	createStore(config: {
		/** The store's initial data. */
		initialData?: StoreSnapshot<TLRecord>
		userId: TLUserId
		instanceId: TLInstanceId
	}): TLStore {
		let initialData = config.initialData
		if (initialData) {
			initialData = CLIENT_FIXUP_SCRIPT(initialData)
		}
		return new Store({
			schema: this.storeSchema,
			initialData,
			props: {
				userId: config?.userId ?? TLUser.createId(),
				instanceId: config?.instanceId ?? TLInstance.createId(),
				documentId: TLDOCUMENT_ID,
			},
		})
	}
}
