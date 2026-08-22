import { Note } from './types'

const MAX_PLAYBACKS = 64

type ExpireCallback = (note: Note) => void

interface Playback {
	note: Note | null
	channel: number
	remaining: number
	isAllocated: boolean
	onExpire: ExpireCallback | null
}

/**
 * Fixed pool of note "voices". Port of kaneel's PlaybackManager: every fired
 * note grabs a slot whose `remaining` counter is decremented once per tick, and
 * the expire callback (which sends the note-off) fires when it hits zero.
 */
export class PlaybackManager {
	private playbacks: Playback[] = Array.from({ length: MAX_PLAYBACKS }, () => ({
		note: null,
		channel: 0,
		remaining: 0,
		isAllocated: false,
		onExpire: null,
	}))

	// Tick-counted callbacks, used to schedule ratchet retriggers.
	private scheduled: { remaining: number; fn(): void }[] = []

	schedule(delayTicks: number, fn: () => void) {
		this.scheduled.push({ remaining: Math.max(1, Math.round(delayTicks)), fn })
	}

	assignPlayback(note: Note, channel: number, onExpire: ExpireCallback) {
		for (const playback of this.playbacks) {
			if (!playback.isAllocated) {
				playback.note = note
				playback.channel = channel
				playback.remaining = note.length
				playback.isAllocated = true
				playback.onExpire = onExpire
				return
			}
		}
	}

	pollPlaybacks() {
		for (const playback of this.playbacks) {
			if (!playback.isAllocated) continue
			if (--playback.remaining <= 0) {
				playback.onExpire?.(playback.note!)
				playback.isAllocated = false
				playback.onExpire = null
				playback.note = null
			}
		}

		if (this.scheduled.length > 0) {
			const due: (() => void)[] = []
			this.scheduled = this.scheduled.filter((s) => {
				s.remaining--
				if (s.remaining <= 0) {
					due.push(s.fn)
					return false
				}
				return true
			})
			for (const fn of due) fn()
		}
	}

	cutAll() {
		this.scheduled = []
		for (const playback of this.playbacks) {
			if (playback.isAllocated) {
				playback.onExpire?.(playback.note!)
				playback.isAllocated = false
				playback.onExpire = null
				playback.note = null
			}
		}
	}

	// Cut any playing note that shares this note's pitch on the same channel.
	// Gives the mono-per-pitch retrigger behaviour from the C++ source, but
	// scoped per channel so sequences on different channels don't cut each other.
	findAndCut(note: Note, channel: number) {
		for (const playback of this.playbacks) {
			if (!playback.isAllocated || !playback.note) continue
			if (playback.note.pitch === note.pitch && playback.channel === channel) {
				playback.onExpire?.(playback.note)
				playback.isAllocated = false
				playback.onExpire = null
				playback.note = null
			}
		}
	}
}
