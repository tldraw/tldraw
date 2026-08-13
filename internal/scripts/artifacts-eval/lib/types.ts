export type EvalEnv = 'staging' | 'production'

/** A tldraw record as it appears in snapshot JSON. */
export interface SnapshotRecord {
	id: string
	[key: string]: unknown
}

/** Mirrors RoomSnapshot from @tldraw/sync-core without depending on the package. */
export interface SnapshotJson {
	clock?: number
	documentClock?: number
	documents: Array<{ state: SnapshotRecord; lastChangedClock?: number }>
	tombstones?: Record<string, number>
	schema?: unknown
}

export type Stratum = `${'small' | 'medium' | 'large'}/${'short' | 'medium' | 'long'}`

export interface RoomSample {
	slug: string
	env: EvalEnv
	isApp: boolean
	versionCount: number
	totalRawBytes: number
	latestSize: number
	stratum: Stratum
	/** ISO timestamps of every history object, ascending. Doubles as the persist-rate dataset. */
	timestamps: string[]
	/** Set by the fetch stage: bytes actually downloaded (should equal totalRawBytes). */
	fetchedBytes?: number
}

export type Layout = 'records' | 'blob'

export interface RepoMeasurement {
	slug: string
	layout: Layout
	commitCount: number
	recordFileCount: number
	rawBytes: number
	/** Pack size right after fast-import, before gc — proxy for accumulated un-repacked pushes. */
	prePackBytes: number
	/** Pack size after `git gc --aggressive --prune=now` — the best-case number. */
	gcPackedBytes: number
	buildMs: number
	verified: boolean
}

export interface PushMeasurement {
	slug: string
	layout: Layout
	repoName: string
	pushMs: number
	wireBytes: number | null
	commitCountRemote: number | null
	readBackOk: boolean
	/** Raw repo details JSON from the Artifacts API, for later inspection of size fields. */
	serverRepoDetails: unknown
	serverReportedBytes: number | null
	recheckedAt?: string
	serverReportedBytesRecheck?: number | null
}

export interface IncrementalPushSample {
	index: number
	pushMs: number
	wireBytes: number | null
}

export interface IncrementalMeasurement {
	slug: string
	variant: 'v1-git-per-commit' | 'v2-isomorphic-per-commit' | 'v3-git-batched'
	repoName: string
	pushes: IncrementalPushSample[]
	totalWireBytes: number | null
	serverReportedBytes: number | null
	serverRepoDetails: unknown
}

export interface EvalResults {
	rooms: RoomSample[]
	measurements: RepoMeasurement[]
	pushes: PushMeasurement[]
	incremental: IncrementalMeasurement[]
}
