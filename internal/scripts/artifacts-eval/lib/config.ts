import { join } from 'path'
import type { EvalEnv } from './types'

/** History buckets hold one full snapshot copy per persist at `app_rooms/<slug>/<ISO timestamp>`. */
export const HISTORY_BUCKETS: Record<EvalEnv, string> = {
	production: 'rooms-history-ephemeral',
	staging: 'rooms-history-ephemeral-preview',
}

export const ARTIFACTS_NAMESPACE = 'snapshots-eval'

export const DEFAULT_WORK_DIR = join(__dirname, '..', '.data')

export function roomHistoryPrefix(slug: string, isApp: boolean): string {
	return `${isApp ? 'app_rooms' : 'public_rooms'}/${slug}/`
}

// Cost model constants (2026-08 public pricing).
export const ARTIFACTS_STORAGE_USD_PER_GB_MO = 0.5
export const ARTIFACTS_USD_PER_1K_OPS = 0.15
export const ARTIFACTS_FREE_OPS_PER_MO = 10_000
export const R2_STORAGE_USD_PER_GB_MO = 0.015
/** Current size of the rooms-history-ephemeral bucket, per infra. */
export const R2_HISTORY_TOTAL_GB = 400_000
/** Artifacts platform limits to flag against. */
export const ARTIFACTS_MAX_REPO_GB = 10
export const ARTIFACTS_MAX_ACCOUNT_GB = 1_000
