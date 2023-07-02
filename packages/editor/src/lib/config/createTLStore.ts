import { HistoryEntry, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import { TLRecord, TLStore, TLStoreProps, createTLSchema } from '@tldraw/tlschema'
import { checkShapesAndAddCore } from './defaultShapes'
import { AnyTLShapeInfo, TLShapeInfo } from './defineShape'

/** @public */
export type TLStoreOptions = {
	initialData?: SerializedStore<TLRecord>
	defaultName?: string
	customColors?: readonly string[]
} & ({ shapes: readonly AnyTLShapeInfo[] } | { schema: StoreSchema<TLRecord, TLStoreProps> })

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

// FIXME: copied from packages/tlschema/src/styles/TLColorStyle.ts as idk how code is shared across packages
const colors = [
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
] as const

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({ initialData, defaultName = '', customColors, ...rest }: TLStoreOptions): TLStore {
	const schema =
		'schema' in rest
			? rest.schema
			: createTLSchema({
				shapes: shapesArrayToShapeMap(checkShapesAndAddCore(rest.shapes)),
				colors: [...colors, ...(customColors || [])]
			})
	return new Store({
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

function shapesArrayToShapeMap(shapes: TLShapeInfo[]) {
	return Object.fromEntries(shapes.map((s) => [s.type, s]))
}
