import { HistoryEntry, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	SchemaShapeInfo,
	TLRecord,
	TLSchema,
	TLStore,
	TLStoreProps,
	TLUnknownShape,
	createTLSchema,
} from '@tldraw/tlschema'
import { EditorExtension } from '../editor/extensions/EditorExtension'
import { EditorExtensionManager } from '../editor/extensions/ExtensionManager'
import { TLShapeUtilConstructor } from '../editor/shapes/ShapeUtil'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export type TLStoreOptions = {
	initialData?: SerializedStore<TLRecord>
	defaultName?: string
} & (
	| {
			shapeUtils: readonly TLAnyShapeUtilConstructor[]
			/** @alpha */
			extensions?: readonly EditorExtension<any>[]
	  }
	| { schema: StoreSchema<TLRecord, TLStoreProps> }
)

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/** @alpha */
export function createTLSchemaFromExtensions({
	extensions = [],
	shapeUtils = [],
}: {
	extensions?: readonly EditorExtension<any>[]
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
} = {}): TLSchema {
	const ext = new EditorExtensionManager(null, extensions)
	const allShapeUtils = checkShapesAndAddCore([...ext.shapes, ...shapeUtils])
	return createTLSchema({ shapes: shapesArrayToShapeMap(allShapeUtils) })
}

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({ initialData, defaultName = '', ...rest }: TLStoreOptions): TLStore {
	const schema = 'schema' in rest ? rest.schema : createTLSchemaFromExtensions(rest)
	return new Store({
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

function shapesArrayToShapeMap(shapeUtils: readonly TLShapeUtilConstructor<TLUnknownShape>[]) {
	return Object.fromEntries(
		shapeUtils.map((s): [string, SchemaShapeInfo] => [
			s.type,
			{
				props: s.props,
				migrations: s.migrations,
			},
		])
	)
}
