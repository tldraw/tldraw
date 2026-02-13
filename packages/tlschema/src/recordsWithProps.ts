import {
	Migration,
	MigrationId,
	MigrationSequence,
	RecordType,
	StandaloneDependsOn,
	UnknownRecord,
	createMigrationSequence,
} from '@tldraw/store'
import { MakeUndefinedOptional, assert } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { SchemaPropsInfo } from './createTLSchema'

/**
 * Maps a record's property types to their corresponding validators.
 *
 * This utility type takes a record type with a `props` object and creates
 * a mapping where each property key maps to a validator for that property's type.
 * This is used to define validation schemas for record properties.
 *
 * @example
 * ```ts
 * interface MyShape extends TLBaseShape<'custom', { width: number; color: string }> {}
 *
 * // Define validators for the shape properties
 * const myShapeProps: RecordProps<MyShape> = {
 *   width: T.number,
 *   color: T.string
 * }
 * ```
 *
 * @public
 */
export type RecordProps<R extends UnknownRecord & { props: object }> = {
	[K in keyof R['props']]: T.Validatable<R['props'][K]>
}

/**
 * Extracts the TypeScript types from a record properties configuration.
 *
 * Takes a configuration object where values are validators and returns the
 * corresponding TypeScript types, with undefined values made optional.
 *
 * @example
 * ```ts
 * const shapePropsConfig = {
 *   width: T.number,
 *   height: T.number,
 *   color: T.optional(T.string)
 * }
 *
 * type ShapeProps = RecordPropsType<typeof shapePropsConfig>
 * // Result: { width: number; height: number; color?: string }
 * ```
 *
 * @public
 */
export type RecordPropsType<Config extends Record<string, T.Validatable<any>>> =
	MakeUndefinedOptional<{
		[K in keyof Config]: T.TypeOf<Config[K]>
	}>

/**
 * A migration definition for shape or record properties.
 *
 * Defines how to transform record properties when migrating between schema versions.
 * Each migration has an `up` function to upgrade data and an optional `down` function
 * to downgrade data if needed.
 *
 * @example
 * ```ts
 * const addColorMigration: TLPropsMigration = {
 *   id: 'com.myapp.shape.custom/1.0.0',
 *   up: (props) => {
 *     // Add a default color property
 *     return { ...props, color: 'black' }
 *   },
 *   down: (props) => {
 *     // Remove the color property
 *     const { color, ...rest } = props
 *     return rest
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLPropsMigration {
	readonly id: MigrationId
	readonly dependsOn?: MigrationId[]
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly up: (props: any) => any
	/**
	 * If a down migration was deployed more than a couple of months ago it should be safe to retire it.
	 * We only really need them to smooth over the transition between versions, and some folks do keep
	 * browser tabs open for months without refreshing, but at a certain point that kind of behavior is
	 * on them. Plus anyway recently chrome has started to actually kill tabs that are open for too long
	 * rather than just suspending them, so if other browsers follow suit maybe it's less of a concern.
	 *
	 * @public
	 */
	readonly down?: 'none' | 'retired' | ((props: any) => any)
}

/**
 * A sequence of property migrations for a record type.
 *
 * Contains an ordered array of migrations that should be applied to transform
 * record properties from one version to another. Migrations can include both
 * property-specific migrations and standalone dependency declarations.
 *
 * @example
 * ```ts
 * const myShapeMigrations: TLPropsMigrations = {
 *   sequence: [
 *     {
 *       id: 'com.myapp.shape.custom/1.0.0',
 *       up: (props) => ({ ...props, version: 1 })
 *     },
 *     {
 *       id: 'com.myapp.shape.custom/2.0.0',
 *       up: (props) => ({ ...props, newFeature: true })
 *     }
 *   ]
 * }
 * ```
 *
 * @public
 */
export interface TLPropsMigrations {
	readonly sequence: Array<StandaloneDependsOn | TLPropsMigration>
}

/**
 * Processes property migrations for all record types in a schema.
 *
 * Takes a collection of record configurations and converts their migrations
 * into proper migration sequences that can be used by the store system.
 * Handles different migration formats including legacy migrations.
 *
 * @param typeName - The base type name for the records (e.g., 'shape', 'binding')
 * @param records - Record of type names to their schema configuration
 * @returns Array of processed migration sequences
 *
 * @example
 * ```ts
 * const shapeRecords = {
 *   geo: { props: geoProps, migrations: geoMigrations },
 *   arrow: { props: arrowProps, migrations: arrowMigrations }
 * }
 *
 * const sequences = processPropsMigrations('shape', shapeRecords)
 * ```
 *
 * @internal
 */
export function processPropsMigrations<R extends UnknownRecord & { type: string; props: object }>(
	typeName: R['typeName'],
	records: Record<string, SchemaPropsInfo>
) {
	const result: MigrationSequence[] = []

	for (const [subType, { migrations }] of Object.entries(records)) {
		const sequenceId = `com.tldraw.${typeName}.${subType}`
		if (!migrations) {
			// provide empty migrations sequence to allow for future migrations
			result.push(
				createMigrationSequence({
					sequenceId,
					retroactive: true,
					sequence: [],
				})
			)
		} else if ('sequenceId' in migrations) {
			assert(
				sequenceId === migrations.sequenceId,
				`sequenceId mismatch for ${subType} ${RecordType} migrations. Expected '${sequenceId}', got '${migrations.sequenceId}'`
			)
			result.push(migrations)
		} else if ('sequence' in migrations) {
			result.push(
				createMigrationSequence({
					sequenceId,
					retroactive: true,
					sequence: migrations.sequence.map((m) =>
						'id' in m ? createPropsMigration(typeName, subType, m) : m
					),
				})
			)
		} else {
			// legacy migrations, will be removed in the future
			result.push(
				createMigrationSequence({
					sequenceId,
					retroactive: true,
					sequence: Object.keys(migrations.migrators)
						.map((k) => Number(k))
						.sort((a: number, b: number) => a - b)
						.map(
							(version): Migration => ({
								id: `${sequenceId}/${version}`,
								scope: 'record',
								filter: (r) => r.typeName === typeName && (r as R).type === subType,
								up: (record: any) => {
									const result = migrations.migrators[version].up(record)
									if (result) {
										return result
									}
								},
								down: (record: any) => {
									const result = migrations.migrators[version].down(record)
									if (result) {
										return result
									}
								},
							})
						),
				})
			)
		}
	}

	return result
}

/**
 * Creates a store migration from a props migration definition.
 *
 * Converts a high-level property migration into a low-level store migration
 * that can be applied to records. The resulting migration will only affect
 * records of the specified type and subtype.
 *
 * @param typeName - The base type name (e.g., 'shape', 'binding')
 * @param subType - The specific subtype (e.g., 'geo', 'arrow')
 * @param m - The property migration definition
 * @returns A store migration that applies the property transformation
 *
 * @example
 * ```ts
 * const propsMigration: TLPropsMigration = {
 *   id: 'com.myapp.shape.custom/1.0.0',
 *   up: (props) => ({ ...props, color: 'blue' })
 * }
 *
 * const storeMigration = createPropsMigration('shape', 'custom', propsMigration)
 * ```
 *
 * @internal
 */
export function createPropsMigration<R extends UnknownRecord & { type: string; props: object }>(
	typeName: R['typeName'],
	subType: R['type'],
	m: TLPropsMigration
): Migration {
	return {
		id: m.id,
		dependsOn: m.dependsOn,
		scope: 'record',
		filter: (r) => r.typeName === typeName && (r as R).type === subType,
		up: (record: any) => {
			const result = m.up(record.props)
			if (result) {
				record.props = result
			}
		},
		down:
			typeof m.down === 'function'
				? (record: any) => {
						const result = (m.down as (props: any) => any)(record.props)
						if (result) {
							record.props = result
						}
					}
				: undefined,
	}
}
