import { HistoryEntry, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	SchemaBindingInfo,
	SchemaShapeInfo,
	TLRecord,
	TLStore,
	TLStoreProps,
	TLUnknownBinding,
	TLUnknownShape,
	createTLSchema,
} from '@tldraw/tlschema'
import { TLBindingUtilConstructor } from '../editor/bindings/BindingUtil'
import { TLShapeUtilConstructor } from '../editor/shapes/ShapeUtil'
import { TLAnyBindingUtilConstructor, checkBindingsAndAddCore } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export type TLStoreOptions = {
	initialData?: SerializedStore<TLRecord>
	defaultName?: string
} & (
	| {
			shapeUtils?: readonly TLAnyShapeUtilConstructor[]
			bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	  }
	| { schema?: StoreSchema<TLRecord, TLStoreProps> }
)

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({ initialData, defaultName = '', ...rest }: TLStoreOptions): TLStore {
	const schema =
		'schema' in rest && rest.schema
			? // we have a schema
			  rest.schema
			: // we need a schema
			  createTLSchema({
					shapes: currentPageShapesToShapeMap(
						checkShapesAndAddCore('shapeUtils' in rest && rest.shapeUtils ? rest.shapeUtils : [])
					),
					bindings: currentPageBindingsToBindingMap(
						checkBindingsAndAddCore(
							'bindingUtils' in rest && rest.bindingUtils ? rest.bindingUtils : []
						)
					),
			  })

	return new Store({
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

function currentPageShapesToShapeMap(shapeUtils: TLShapeUtilConstructor<TLUnknownShape>[]) {
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

function currentPageBindingsToBindingMap(
	bindingUtils: TLBindingUtilConstructor<TLUnknownBinding>[]
) {
	return Object.fromEntries(
		bindingUtils.map((s): [string, SchemaBindingInfo] => [
			s.type,
			{
				props: s.props,
				migrations: s.migrations,
			},
		])
	)
}
