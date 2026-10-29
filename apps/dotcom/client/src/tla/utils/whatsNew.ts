import { TlaUser, WhatsNewResponse, WhatsNewUpdate } from '@tldraw/dotcom-shared'
import { atom, fetch } from 'tldraw'

const FETCH_TIMEOUT_MS = 5000

/** null = not loaded, or the fetch failed. */
export const whatsNewUpdates$ = atom<WhatsNewUpdate[] | null>('whatsNewUpdates', null)

let loadPromise: Promise<WhatsNewUpdate[] | null> | null = null

/** Once per page load, never awaited on the boot path, never throws. A failure just leaves What's new hidden. */
export function loadWhatsNew(opts: { includeDrafts: boolean }) {
	loadPromise ??= (async () => {
		try {
			const res = await fetch(`/api/app/whats-new${opts.includeDrafts ? '?drafts=1' : ''}`, {
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			})
			if (!res.ok) return null
			const { updates }: WhatsNewResponse = await res.json()
			whatsNewUpdates$.set(updates)
			return updates
		} catch {
			return null
		}
	})()
	return loadPromise
}

export function getUnreadUpdates(
	updates: WhatsNewUpdate[],
	user: Pick<TlaUser, 'whatsNewSeenAt' | 'createdAt'>
) {
	const seenAt = user.whatsNewSeenAt ?? user.createdAt
	return updates.filter(
		(u) => u.status === 'published' && u.publishedAt !== null && u.publishedAt > seenAt
	)
}

/** Server time from the Update, not the client clock: a slow device clock would otherwise leave it Unread forever. */
export function getSeenAtAfterShowing(shown: WhatsNewUpdate[]) {
	let newest: number | null = null
	for (const u of shown) {
		if (u.status === 'published' && u.publishedAt !== null && u.publishedAt > (newest ?? 0)) {
			newest = u.publishedAt
		}
	}
	return newest
}
