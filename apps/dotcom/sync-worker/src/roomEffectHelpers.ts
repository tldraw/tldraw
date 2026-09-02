import { TlaFile } from '@tldraw/dotcom-shared'

// A real Error so Sentry shows the slug and a stack; checks are DO-local instanceof.
// Lives outside TLFileDurableObject.ts (which pulls in cloudflare:workers) so it can be
// imported from plain Node tests.
export class RoomNotFoundError extends Error {
	constructor(slug: string) {
		super(`Room not found: ${slug}`)
		this.name = 'RoomNotFoundError'
	}
}

// A trashed file's room may never have existed; for live files a missing room is
// usually the duplicate-from-source race, which the outbox retry heals.
export function shouldSkipMissingRoomEffect(error: unknown, file: TlaFile): boolean {
	return error instanceof RoomNotFoundError && file.isDeleted
}

// Reported (not thrown) when an outbox file effect is still pending just under the drain's
// 30s effect timeout, so Sentry names the cause before the drain bumps the row. Without it a
// wedged effect parks a row as a bare EffectTimeoutError (#10541). The guaranteed fact is
// that the effect stalled; a boot stage, when present, says where the room boot is stuck —
// a null stage means the boot settled and the stall is in post-boot work (e.g. the
// per-session permission refresh).
export type BootStage =
	| 'storage-load'
	| 'source-await-persist'
	| 'source-r2-fetch'
	| 'source-r2-put'
	| 'room-create'

export class FileEffectStallError extends Error {
	constructor(
		slug: string,
		command: 'insert' | 'update',
		stage: BootStage | null,
		stageAgeMs: number | null,
		ms: number
	) {
		super(
			`file ${command} effect for ${slug} still pending after ${ms}ms` +
				(stage !== null
					? ` at boot stage ${stage} (${stageAgeMs}ms in stage)`
					: ' in post-boot work')
		)
		this.name = 'FileEffectStallError'
	}
}

// Reported when a duplicate-from-source boot gives up waiting for the source room's persist
// and proceeds with its last persisted snapshot.
export class SourcePersistTimeoutError extends Error {
	constructor(sourceSlug: string, ms: number) {
		super(
			`awaitPersist on source ${sourceSlug} did not settle within ${ms}ms; copying its last persisted snapshot`
		)
		this.name = 'SourcePersistTimeoutError'
	}
}

/**
 * Await `promise` for at most `ms`; 'timeout' means it was still pending. The promise's
 * eventual settlement (including rejection) is swallowed — callers use this for best-effort
 * work they are prepared to proceed without.
 */
export async function settleWithin(
	promise: Promise<unknown>,
	ms: number
): Promise<'settled' | 'timeout'> {
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		return await Promise.race([
			promise.then(
				() => 'settled' as const,
				() => 'settled' as const
			),
			new Promise<'timeout'>((resolve) => {
				timer = setTimeout(() => resolve('timeout'), ms)
			}),
		])
	} finally {
		clearTimeout(timer)
	}
}
