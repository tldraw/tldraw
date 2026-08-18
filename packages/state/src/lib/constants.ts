/**
 * The initial epoch value used to mark derivations (computed signals and effects) as dirty before their first computation.
 *
 * The global epoch starts at `GLOBAL_START_EPOCH + 1`, so any derivation initialized with
 * `GLOBAL_START_EPOCH` compares as older than every real epoch and is computed/executed at
 * least once without special initialization logic.
 *
 * @public
 */
export const GLOBAL_START_EPOCH = -1
