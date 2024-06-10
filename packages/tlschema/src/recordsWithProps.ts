import {
	Migration,
	MigrationId,
	MigrationSequence,
	RecordType,
	StandaloneDependsOn,
	UnknownRecord,
	createMigrationSequence,
} from '@tldraw/store'
import { Expand, assert } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { SchemaPropsInfo } from './createTLSchema'

/** @public */
export type RecordProps<R extends UnknownRecord & { props: object }> = {
	[K in keyof R['props']]: T.Validatable<R['props'][K]>
}

/** @public */
export type RecordPropsType<Config extends Record<string, T.Validatable<any>>> = Expand<{
	[K in keyof Config]: T.TypeOf<Config[K]>
}>

/**
 * @public
 */
export interface TLPropsMigration {
	readonly id: MigrationId
	readonly dependsOn?: MigrationId[]
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
 * @public
 */
export interface TLPropsMigrations {
	readonly sequence: Array<StandaloneDependsOn | TLPropsMigration>
}

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
					retroactive: false,
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
					retroactive: false,
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
					retroactive: false,
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
