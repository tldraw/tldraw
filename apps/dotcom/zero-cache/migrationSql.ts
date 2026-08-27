/**
 * The runner applies every migration inside a transaction it opens itself, so a migration that
 * opens its own leaves the runner's transaction in a state it did not expect. migrate.ts refuses
 * one rather than trying to reconcile that.
 *
 * Only a `BEGIN;` or `COMMIT;` statement counts. plpgsql function bodies open with a bare `BEGIN`
 * and no semicolon, and a migration defining a trigger function is full of them.
 */
export function hasTransactionBlock(migrationSql: string): boolean {
	return /(BEGIN|COMMIT);/.test(migrationSql)
}
