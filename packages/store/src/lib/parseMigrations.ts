import { Migration, MigrationOptions } from '..'

const str = JSON.stringify

export function parseMigrations(_migrations: MigrationOptions | undefined) {
	const { order, sequences } = _migrations ?? { order: [], sequences: [] }

	// TODO: export the migration setup logic as a validator that people can run in their tests
	const includedSequenceIds = new Set<string>(sequences.map((s) => s.sequence.id))

	const sortedMigrationIds = [...order]

	const migrations = new Map<string, Migration>()

	const allUnusedMigrationIds = new Set<string>()

	// check that sequences are valid and included in linear order
	for (const { sequence, versionAtInstallation } of sequences) {
		const firstUsedMigrationIdx =
			sequence.migrations.findIndex((m) => m.id === versionAtInstallation) + 1
		if (firstUsedMigrationIdx === 0 && versionAtInstallation !== 'root') {
			throw new Error(`Missing versionAtInstallation id ${str(versionAtInstallation)}`)
		}
		const unusedMigrationIds = sequence.migrations.slice(0, firstUsedMigrationIdx).map((m) => m.id)

		// if any unused are present in `order` it's an error
		for (const unusedMigrationId of unusedMigrationIds) {
			if (!unusedMigrationId.startsWith(sequence.id + '/')) {
				throw new Error(
					`Migration id ${str(unusedMigrationId)} must start with ${str(sequence.id)}`
				)
			}
			if (allUnusedMigrationIds.has(unusedMigrationId)) {
				throw new Error(`Duplicate migration id ${str(unusedMigrationId)}`)
			}
			if (order.includes(unusedMigrationId)) {
				throw new Error(
					`Unused migration id ${str(unusedMigrationId)} is present in your migration order. Did you specify 'versionAtInstallation' correctly?`
				)
			}
			allUnusedMigrationIds.add(unusedMigrationId)
		}

		// now check that the migrations which are supposed to be in `order` are all present
		// and in the right... order
		const usedMigrations = sequence.migrations.slice(firstUsedMigrationIdx)
		const missingMigrations = []
		let lastIdx = -1
		for (const migration of usedMigrations) {
			if (!migration.id.startsWith(sequence.id + '/')) {
				throw new Error(`Migration id ${str(migration.id)} must start with ${str(sequence.id)}`)
			}
			if (migrations.has(migration.id)) {
				throw new Error(`Duplicate migration id ${migration.id}`)
			}
			migrations.set(migration.id, migration)
			const orderIdx = order.indexOf(migration.id)
			if (orderIdx === -1) {
				missingMigrations.push(migration.id)
			} else if (orderIdx <= lastIdx) {
				throw new Error(
					`Migration id ${str(migration.id)} is out of order. It should come after ${str(order[lastIdx])}`
				)
			} else {
				lastIdx = orderIdx
			}
		}

		if (missingMigrations.length) {
			// TODO: add link to migration docs
			throw new Error(
				`Missing migrations from your migration order. Did you just update a tldraw dependency?
Paste these in at the end of your existing migration ordering.
${str(missingMigrations)}
`
			)
		}
	}

	// check that all ids are present and any inter-sequence dependencies are satisfied
	for (let i = 0; i < sortedMigrationIds.length; i++) {
		const id = sortedMigrationIds[i]
		const migration = migrations.get(id)
		if (!migration) {
			// TODO: Link to migration docs
			throw new Error(
				`Missing migration details for ${str(id)}. Did you forget to add a migration sequence?`
			)
		}
		if (migration.dependsOn?.length) {
			for (const dependentId of migration.dependsOn) {
				if (allUnusedMigrationIds.has(dependentId)) {
					// if a migration was unused this dependency has implicitly been satisfied
					continue
				}
				const depIdx = sortedMigrationIds.indexOf(dependentId)
				if (depIdx === -1) {
					throw new Error(
						`Migration id ${str(id)} depends on missing migration ${str(dependentId)}`
					)
				}
				if (depIdx === i) {
					throw new Error(`Migration id ${str(id)} depends on itself. This is not allowed.`)
				}
				if (depIdx > i) {
					throw new Error(
						`Migration id ${str(id)} depends on migration ${str(
							dependentId
						)} which comes after it. This is not allowed.`
					)
				}
			}
		}
	}

	return { sortedMigrationIds, migrations, includedSequenceIds }
}
