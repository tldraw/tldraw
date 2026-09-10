/**
 * Sentinel below any real epoch. Derived signals and effects start with their epochs set to this
 * so they are dirty until their first run; real epochs start at `GLOBAL_START_EPOCH + 1`.
 *
 * @internal
 */
export const GLOBAL_START_EPOCH = -1
