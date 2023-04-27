import {
	CLIENT_FIXUP_SCRIPT,
	TLAsset,
	TLCamera,
	TLDOCUMENT_ID,
	TLDocument,
	TLInstance,
	TLInstanceId,
	TLInstancePageState,
	TLInstancePresence,
	TLPage,
	TLRecord,
	TLShape,
	TLStore,
	TLStoreProps,
	TLUser,
	TLUserDocument,
	TLUserId,
	TLUserPresence,
	ensureStoreIsUsable,
	onValidationFailure,
	rootShapeTypeMigrations,
	storeMigrations,
} from '@tldraw/tlschema'
import {
	RecordType,
	Store,
	StoreSchema,
	StoreSnapshot,
	createRecordType,
	defineMigrations,
} from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
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
import { defaultDerivePresenceState } from './defaultDerivePresenceState'

const CORE_SHAPE_DEFS = () =>
	[
		TLDrawShapeDef,
		TLTextShapeDef,
		TLLineShapeDef,
		TLArrowShapeDef,
		TLImageShapeDef,
		TLVideoShapeDef,
		TLGeoShapeDef,
		TLNoteShapeDef,
		TLGroupShapeDef,
		TLBookmarkShapeDef,
		TLEmbedShapeDef,
		TLFrameShapeDef,
	] as const

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
		const {
			shapes = [],
			tools = [],
			allowUnknownShapes = false,
			derivePresenceState = defaultDerivePresenceState,
		} = args
		this.tools = tools

		const allShapeDefs = [...CORE_SHAPE_DEFS(), ...shapes]
		this.shapes = allShapeDefs

		const typeSet = new Set<string>()
		for (const shapeDef of allShapeDefs) {
			if (typeSet.has(shapeDef.type)) {
				throw new Error(`Shape type ${shapeDef.type} is already defined`)
			}
			typeSet.add(shapeDef.type)
		}

		const shapeTypeMigrations = defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: Object.fromEntries(allShapeDefs.map((def) => [def.type, def.migrations])),
		})

		let shapeValidator = T.union('type', {
			...Object.fromEntries(allShapeDefs.map((def) => [def.type, def.validator])),
		}) as T.UnionValidator<'type', any, any>
		if (allowUnknownShapes) {
			shapeValidator = shapeValidator.validateUnknownVariants((shape) => shape as any)
		}

		const shapeRecord = createRecordType<TLShape>('shape', {
			migrations: shapeTypeMigrations,
			validator: T.model('shape', shapeValidator),
			scope: 'document',
		}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))
		this.TLShape = shapeRecord

		this.storeSchema = StoreSchema.create<TLRecord, TLStoreProps>(
			{
				asset: TLAsset,
				camera: TLCamera,
				document: TLDocument,
				instance: TLInstance,
				instance_page_state: TLInstancePageState,
				page: TLPage,
				shape: shapeRecord,
				user: TLUser,
				user_document: TLUserDocument,
				user_presence: TLUserPresence,
				instance_presence: TLInstancePresence,
			},
			{
				snapshotMigrations: storeMigrations,
				onValidationFailure,
				ensureStoreIsUsable,
				derivePresenceState,
			}
		)
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
