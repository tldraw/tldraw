import {
	CLIENT_FIXUP_SCRIPT,
	MigrationsForShapes,
	TLBaseShape,
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
	ValidatorsForShapes,
	arrowShapeTypeMigrations,
	arrowShapeTypeValidator,
	bookmarkShapeTypeMigrations,
	bookmarkShapeTypeValidator,
	createTLSchema,
	drawShapeTypeMigrations,
	drawShapeTypeValidator,
	embedShapeTypeMigrations,
	embedShapeTypeValidator,
	frameShapeTypeMigrations,
	frameShapeTypeValidator,
	geoShapeTypeMigrations,
	geoShapeTypeValidator,
	groupShapeTypeMigrations,
	groupShapeTypeValidator,
	imageShapeTypeMigrations,
	imageShapeTypeValidator,
	lineShapeTypeMigrations,
	lineShapeTypeValidator,
	noteShapeTypeMigrations,
	noteShapeTypeValidator,
	textShapeTypeMigrations,
	textShapeTypeValidator,
	videoShapeTypeMigrations,
	videoShapeTypeValidator,
} from '@tldraw/tlschema'
import { RecordType, Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'
import { Signal } from 'signia'
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

type UtilsForShapes<T extends TLBaseShape<any, any>> = {
	[K in T['type']]: TLShapeUtilConstructor<any>
}

/** @public */
export class TldrawEditorConfig {
	static readonly default = new TldrawEditorConfig({})

	readonly storeSchema: StoreSchema<TLRecord, TLStoreProps>
	readonly TLShape: RecordType<TLShape, 'type' | 'props' | 'index' | 'parentId'>
	readonly tools: readonly StateNodeConstructor[]

	readonly shapeUtils: UtilsForShapes<TLShape>
	readonly shapeValidators: ValidatorsForShapes<TLShape>
	readonly shapeMigrations: MigrationsForShapes<TLShape>

	constructor(opts: {
		shapeUtils?: UtilsForShapes<TLShape>
		shapeValidators?: ValidatorsForShapes<TLShape>
		shapeMigrations?: MigrationsForShapes<TLShape>
		tools?: readonly StateNodeConstructor[]
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}) {
		const {
			shapeUtils = {},
			shapeMigrations = {},
			shapeValidators = {},
			tools = [],
			derivePresenceState,
		} = opts

		this.tools = tools

		this.shapeUtils = {
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
			...shapeUtils,
		}

		this.shapeMigrations = {
			arrow: arrowShapeTypeMigrations,
			bookmark: bookmarkShapeTypeMigrations,
			draw: drawShapeTypeMigrations,
			embed: embedShapeTypeMigrations,
			frame: frameShapeTypeMigrations,
			geo: geoShapeTypeMigrations,
			group: groupShapeTypeMigrations,
			image: imageShapeTypeMigrations,
			line: lineShapeTypeMigrations,
			note: noteShapeTypeMigrations,
			text: textShapeTypeMigrations,
			video: videoShapeTypeMigrations,
			...shapeMigrations,
		}

		this.shapeValidators = {
			arrow: arrowShapeTypeValidator,
			bookmark: bookmarkShapeTypeValidator,
			draw: drawShapeTypeValidator,
			embed: embedShapeTypeValidator,
			frame: frameShapeTypeValidator,
			geo: geoShapeTypeValidator,
			group: groupShapeTypeValidator,
			image: imageShapeTypeValidator,
			line: lineShapeTypeValidator,
			note: noteShapeTypeValidator,
			text: textShapeTypeValidator,
			video: videoShapeTypeValidator,
			...shapeValidators,
		}

		this.storeSchema = createTLSchema({
			shapeMigrations: this.shapeMigrations,
			shapeValidators: this.shapeValidators,
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
