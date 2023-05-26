import {
	CLIENT_FIXUP_SCRIPT,
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLDefaultShape,
	TLInstanceId,
	TLInstancePresence,
	TLRecord,
	TLShape,
	TLStore,
	TLStoreProps,
	createTLSchema,
	defaultTldrawEditorValidator,
} from '@tldraw/tlschema'
import { Migrations, RecordType, Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'
import { Signal, computed } from 'signia'
import { TLArrowUtil } from '../app/shapeutils/TLArrowUtil/TLArrowUtil'
import { TLBookmarkUtil } from '../app/shapeutils/TLBookmarkUtil/TLBookmarkUtil'
import { TLDrawUtil } from '../app/shapeutils/TLDrawUtil/TLDrawUtil'
import { TLEmbedUtil } from '../app/shapeutils/TLEmbedUtil/TLEmbedUtil'
import { TLFrameUtil } from '../app/shapeutils/TLFrameUtil/TLFrameUtil'
import { TLGeoUtil } from '../app/shapeutils/TLGeoUtil/TLGeoUtil'
import { TLGroupUtil } from '../app/shapeutils/TLGroupUtil/TLGroupUtil'
import { TLImageUtil } from '../app/shapeutils/TLImageUtil/TLImageUtil'
import { TLLineUtil } from '../app/shapeutils/TLLineUtil/TLLineUtil'
import { TLNoteUtil } from '../app/shapeutils/TLNoteUtil/TLNoteUtil'
import { TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'
import { TLTextUtil } from '../app/shapeutils/TLTextUtil/TLTextUtil'
import { TLVideoUtil } from '../app/shapeutils/TLVideoUtil/TLVideoUtil'
import { StateNodeConstructor } from '../app/statechart/StateNode'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

// Secret shape types that don't have a shape util yet
type ShapeTypesNotImplemented = 'icon'

const DEFAULT_SHAPE_UTILS: {
	[K in Exclude<TLDefaultShape['type'], ShapeTypesNotImplemented>]: TLShapeUtilConstructor<any>
} = {
	arrow: TLArrowUtil,
	bookmark: TLBookmarkUtil,
	draw: TLDrawUtil,
	embed: TLEmbedUtil,
	frame: TLFrameUtil,
	geo: TLGeoUtil,
	group: TLGroupUtil,
	image: TLImageUtil,
	line: TLLineUtil,
	note: TLNoteUtil,
	text: TLTextUtil,
	video: TLVideoUtil,
}

/** @public */
export type TldrawEditorConfigOptions = {
	tools?: readonly StateNodeConstructor[]
	shapes?: Record<
		string,
		{
			util: TLShapeUtilConstructor<any>
			migrations?: Migrations
		}
	>
	/** @internal */
	derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	userPreferences?: Signal<TLUserPreferences>
	setUserPreferences?: (userPreferences: TLUserPreferences) => void
	validator?: { validate: (r: any) => any }
}

/** @public */
export class TldrawEditorConfig {
	// Custom tools
	readonly tools: readonly StateNodeConstructor[]

	// Custom shape utils
	readonly shapeUtils: Record<TLShape['type'], TLShapeUtilConstructor<any>>

	// The record used for TLShape incorporating any custom shapes
	readonly TLShape: RecordType<TLShape, 'type' | 'props' | 'index' | 'parentId'>

	// The schema used for the store incorporating any custom shapes
	readonly storeSchema: StoreSchema<TLRecord, TLStoreProps>
	readonly derivePresenceState: (store: TLStore) => Signal<TLInstancePresence | null>
	readonly userPreferences: Signal<TLUserPreferences>
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void

	constructor(opts = {} as TldrawEditorConfigOptions) {
		const {
			validator = defaultTldrawEditorValidator,
			shapes = {},
			tools = [],
			derivePresenceState,
		} = opts

		this.tools = tools
		this.derivePresenceState = derivePresenceState ?? (() => computed('presence', () => null))
		this.userPreferences =
			opts.userPreferences ?? computed('userPreferences', () => getUserPreferences())
		this.setUserPreferences = opts.setUserPreferences ?? setUserPreferences

		this.shapeUtils = {
			...DEFAULT_SHAPE_UTILS,
			...Object.fromEntries(Object.entries(shapes).map(([k, v]) => [k, v.util])),
		}

		this.storeSchema = createTLSchema({
			customShapes: shapes,
			validator,
		})

		this.TLShape = this.storeSchema.types.shape as RecordType<
			TLShape,
			'type' | 'props' | 'index' | 'parentId'
		>
	}

	createStore(config: {
		/** The store's initial data. */
		initialData?: StoreSnapshot<TLRecord>
		instanceId: TLInstanceId
	}): TLStore {
		let initialData = config.initialData
		if (initialData) {
			initialData = CLIENT_FIXUP_SCRIPT(initialData)
		}

		return new Store<TLRecord, TLStoreProps>({
			schema: this.storeSchema,
			initialData,
			props: {
				instanceId: config?.instanceId ?? InstanceRecordType.createId(),
				documentId: TLDOCUMENT_ID,
			},
		})
	}
}
