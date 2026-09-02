/**
 * The runner applies every migration inside a transaction it opens itself, so a migration that
 * opens its own leaves the runner's transaction in a state it did not expect. migrate.ts refuses
 * one rather than trying to reconcile that.
 *
 * Only a statement counts: BEGIN, START TRANSACTION, COMMIT, ROLLBACK or END TRANSACTION, with or
 * without WORK/TRANSACTION, in any case, followed by a semicolon. plpgsql function bodies open with
 * a bare `BEGIN` and no semicolon, and a migration defining a trigger function is full of them.
 *
 * A miss is worse than a false positive. The runner sends each file with the simple query
 * protocol, so a stray `commit;` ends the runner's transaction mid-file and everything after it,
 * `--dry-run` included, applies for real.
 */
export function hasTransactionBlock(migrationSql: string): boolean {
	return /\b(begin|start\s+transaction|commit|rollback|end\s+transaction)(\s+(work|transaction))?\s*;/i.test(
		migrationSql
	)
}
