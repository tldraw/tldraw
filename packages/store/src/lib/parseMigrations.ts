import { tldrawError } from '@tldraw/utils'
import { Migration, MigrationId, MigrationOptions, MigrationSequence } from '..'

const str = (obj: any) => JSON.stringify(obj, null, 2)

export function parseMigrations(_migrations: MigrationOptions | undefined) {
	const { order, sequences } = _migrations ?? { order: [], sequences: [] }

	// TODO: export the migration setup logic as a validator that people can run in their tests
	const includedSequenceIds = new Set<string>()

	const sortedMigrationIds = [...order]

	const migrations = new Map<string, Migration>()

	const allUnusedMigrationIds = new Set<string>()
	const allMigrationIds = new Set<string>()

	// validate sequences
	for (const { sequence, versionAtInstallation } of sequences) {
		// 0. Check that there are no duplicate sequence ids
		if (includedSequenceIds.has(sequence.id)) {
			throw duplicateSequenceError(sequence.id)
		}
		includedSequenceIds.add(sequence.id)

		// 1. Check that versionAtInstallation is valid
		//    It must be either "root" or the id of a migration in the sequence
		const firstUsedMigrationIdx =
			sequence.migrations.findIndex((m) => m.id === versionAtInstallation) + 1

		if (firstUsedMigrationIdx === 0 && versionAtInstallation !== 'root') {
			throw badVersionAtInstallationError(sequence, versionAtInstallation)
		}

		// 2. Check that all migrations have a correctly-formatted id, and that there are no duplications
		for (const { id } of sequence.migrations) {
			if (!id.startsWith(sequence.id + '/')) {
				throw badMigrationIdError(sequence, id)
			}
			if (allMigrationIds.has(id)) {
				throw duplicateMigrationError(id)
			}
			allMigrationIds.add(id)
		}

		const unusedMigrationIds = sequence.migrations.slice(0, firstUsedMigrationIdx).map((m) => m.id)

		// 3. Check that no unused migrations are included in the 'order' array
		for (const unusedMigrationId of unusedMigrationIds) {
			if (order.includes(unusedMigrationId)) {
				throw orderReferencingUnusedMigrationError(
					unusedMigrationId,
					versionAtInstallation,
					sequence.id
				)
			}
			allUnusedMigrationIds.add(unusedMigrationId)
		}

		// 4. Check that the migrations which are supposed to be in the `order` array are all present
		//    and in the right... order.
		const usedMigrations = sequence.migrations.slice(firstUsedMigrationIdx)
		const missingMigrations: MigrationId[] = []
		let lastIdx = -1
		for (const migration of usedMigrations) {
			migrations.set(migration.id, migration)
			const orderIdx = order.indexOf(migration.id)
			if (orderIdx === -1) {
				missingMigrations.push(migration.id)
			} else if (orderIdx <= lastIdx) {
				throw outOfOrderError(migration.id, order[lastIdx])
			} else {
				lastIdx = orderIdx
			}
		}

		// 5. Complain if any migrations are missing
		if (missingMigrations.length) {
			throw missingMigrationsError(missingMigrations)
		}
	}

	for (let i = 0; i < sortedMigrationIds.length; i++) {
		// 6. Check that all migrations mentioned in the order array are present
		//    in provided sequences.
		const id = sortedMigrationIds[i]
		const migration = migrations.get(id)
		if (!migration) {
			throw missingMigrationDetailsError(id, includedSequenceIds)
		}
		// 7. Check that all cross-sequence dependencies are satisfied
		if (migration.dependsOn?.length) {
			for (const dependentId of migration.dependsOn) {
				if (allUnusedMigrationIds.has(dependentId)) {
					// if a migration was unused this dependency has implicitly been satisfied
					continue
				}
				const depIdx = sortedMigrationIds.indexOf(dependentId)
				if (depIdx === -1) {
					throw missingDependencyMigrationError(migration, dependentId, includedSequenceIds)
				}
				if (depIdx === i) {
					throw selfReferencingDependencyError(migration.id)
				}
				if (depIdx > i) {
					throw outOfOrderError(dependentId, id)
				}
			}
		}
	}

	return { sortedMigrationIds, migrations, includedSequenceIds }
}

function selfReferencingDependencyError(id: MigrationId) {
	return tldrawError(`Migration id ${str(id)} depends on itself. This is not allowed.`)
}

function missingDependencyMigrationError(
	migration: Migration,
	dependentId: string,
	includedSequenceIds: Set<string>
) {
	const sequenceId = dependentId.split('/')[0]
	if (!includedSequenceIds.has(sequenceId)) {
		// TODO: Link to docs
		// TODO: Allow ignoring? (overrides)
		return tldrawError(
			`Your order array includes the migration ${str(
				migration.id
			)} which depends on a migration with ID ${str(
				dependentId
			)} but you did not provide a sequence with id ${str(
				sequenceId
			)}. Did you forget to add the migration sequence?`
		)
	} else {
		return tldrawError(
			`Your order array includes the migration ${str(
				migration.id
			)} which depends on a migration with ID ${str(dependentId)} but the sequence ${str(
				sequenceId
			)} does not include a migration with that ID. Do you need to update an npm dependency?`
		)
	}
}

function missingMigrationDetailsError(migrationId: string, includedSequenceIds: Set<string>) {
	const sequenceId = migrationId.split('/')[0]
	if (!includedSequenceIds.has(sequenceId)) {
		// TODO: Link to docs
		return tldrawError(
			`Your order array includes the migration ID ${str(
				migrationId
			)} but you did not provide a sequence with id ${str(
				sequenceId
			)}. Did you forget to add the migration sequence?`
		)
	} else {
		// TODO: Link to docs
		return tldrawError(
			`Your order array includes the migration ID ${str(migrationId)} but the sequence ${str(
				sequenceId
			)} does not include a migration with that ID.`
		)
	}
}

function outOfOrderError(aId: MigrationId, bId: MigrationId) {
	// TODO: Link to docs
	return tldrawError(`Migration id ${str(aId)} is out of order. It should come after ${str(bId)}`)
}

function orderReferencingUnusedMigrationError(
	unusedMigrationId: string,
	versionAtInstallation: string,
	sequenceId: string
) {
	if (unusedMigrationId === versionAtInstallation) {
		// TODO: Link to docs
		return tldrawError(
			`Your migration order array includes the ID you specified as the versionAtInstallation for sequence ${str(
				sequenceId
			)}. This is an error.
		
versionAtInstallation, in this case ${str(
				unusedMigrationId
			)}, should not appear in the migration order array, but any and all subsequent migration IDs should.`
		)
	} else {
		// TODO: Link to docs
		return tldrawError(
			`Your migration order array includes the migration ${str(
				unusedMigrationId
			)} which appears _before_ the specified 'versionAtInstallation' ${str(versionAtInstallation)}.
			
This is an error. Only migrations that appear _after_ the specified 'versionAtInstallation' should be included in the migration order array.`
		)
	}
}

function duplicateSequenceError(id: string) {
	// TODO: Link to docs
	return tldrawError(
		`You provided more than one sequence with id ${str(
			id
		)}. Sequences must have globally-unique ids.`
	)
}

function duplicateMigrationError(id: string) {
	// TODO: Link to docs
	return tldrawError(
		`More than one migration with id ${str(
			id
		)} was encountered. Migrations must have globally-unique ids.`
	)
}

function badMigrationIdError(sequence: MigrationSequence, id: string) {
	// TODO: Link to docs
	return tldrawError(
		`Migration id ${str(id)} is incorrectly formatted. Ids must start with ${str(
			sequence.id + '/'
		)}.`
	)
}

function badVersionAtInstallationError(sequence: MigrationSequence, versionAtInstallation: string) {
	// TODO: Link to docs
	return tldrawError(
		`The versionAtInstallation option specified for the ${str(sequence.id)} migration sequence is invalid.
				
${str(versionAtInstallation)} does not match one of the migrations in the sequence.
				
Use either "root" or one of the following migration ids: ${str(
			sequence.migrations.map((m) => m.id)
		)}`
	)
}

function missingMigrationsError(missingIds: string[]) {
	// TODO: Link to docs
	return tldrawError(
		`Some migration IDs are missing from your migration order array. Did you just update a tldraw dependency?

Add the following IDs to the end of your existing migration order array: ${str(missingIds)}
`
	)
}
