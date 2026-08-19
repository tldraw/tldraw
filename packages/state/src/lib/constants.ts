/**
 * The initial epoch value used to mark derivations (computed signals and effects) as dirty before their first computation.
 *
 * This constant ensures that all computed signals and effects start in a "dirty" state, guaranteeing they will
 * be computed/executed at least once when first accessed or started. The value -1 is used because:
 * - Global epoch starts at 0 (GLOBAL_START_EPOCH + 1)
 * - Any derived signal initialized with GLOBAL_START_EPOCH (-1) will be considered dirty when compared to any positive epoch
 * - This forces initial computation/execution without requiring special initialization logic
 *
 * Used by:
 * - Computed signals to track when they were last changed
 * - Effect schedulers to track when they were last executed
 * - Transaction system for initial global and reaction epoch values
 *
 * @example
 * ```ts
 * // In Computed class constructor
 * lastChangedEpoch = GLOBAL_START_EPOCH // -1, marking as dirty
 *
 * // When global epoch is 5, this computed will be dirty since -1 < 5
 * const needsComputation = this.lastChangedEpoch < globalEpoch
 * ```
 *
 * @public
 */
export const GLOBAL_START_EPOCH = -1
