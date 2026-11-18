import {
	BoardPresenceRequestBody,
	BoardPresenceResponseBody,
	MAX_BOARD_PRESENCE_FILE_IDS,
} from '@tldraw/dotcom-shared'
import { createContext, useContext, useEffect, useState } from 'react'
import { fetch } from 'tldraw'

const PRESENCE_POLL_MS = 20_000

const EMPTY_PRESENCE: ReadonlyMap<string, ReadonlySet<string>> = new Map()
const BoardPresenceContext = createContext(EMPTY_PRESENCE)

export const BoardPresenceProvider = BoardPresenceContext.Provider

/** Who is on the board right now, from the nearest {@link BoardPresenceProvider}. */
export function useBoardPresentUserIds(fileId: string): ReadonlySet<string> | undefined {
	return useContext(BoardPresenceContext).get(fileId)
}

/**
 * Who is on each board right now, by file id. Polled rather than pushed: the gallery holds no room
 * connections, and opening one per board to hear presence would cost far more than this. Only the
 * first {@link MAX_BOARD_PRESENCE_FILE_IDS} boards are asked about, and nothing is asked while the
 * tab is hidden.
 */
export function useBoardPresence(
	fileIds: string[],
	enabled: boolean
): ReadonlyMap<string, ReadonlySet<string>> {
	const [presence, setPresence] = useState(EMPTY_PRESENCE)
	const key = fileIds.slice(0, MAX_BOARD_PRESENCE_FILE_IDS).join(',')

	useEffect(() => {
		if (!enabled || !key) {
			setPresence(EMPTY_PRESENCE)
			return
		}
		const controller = new AbortController()
		const poll = async () => {
			if (document.visibilityState !== 'visible') return
			try {
				const res = await fetch('/api/app/board-presence', {
					method: 'POST',
					body: JSON.stringify({ fileIds: key.split(',') } satisfies BoardPresenceRequestBody),
					signal: controller.signal,
				})
				if (!res.ok) return
				const body = (await res.json()) as BoardPresenceResponseBody
				setPresence(
					new Map(Object.entries(body.presence).map(([fileId, ids]) => [fileId, new Set(ids)]))
				)
			} catch {
				// Aborted, or offline: keep showing the last answer until the next poll.
			}
		}
		poll()
		const interval = setInterval(poll, PRESENCE_POLL_MS)
		document.addEventListener('visibilitychange', poll)
		return () => {
			controller.abort()
			clearInterval(interval)
			document.removeEventListener('visibilitychange', poll)
		}
	}, [enabled, key])

	return presence
}
