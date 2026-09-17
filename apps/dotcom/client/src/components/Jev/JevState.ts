import { JevPrediction } from '@tldraw/dotcom-shared'
import { Atom, Editor, atom } from 'tldraw'
import { JevUpdate } from './JevScheduler'

export type JevHistoryEntry = JevUpdate<JevPrediction> & { id: number; time: number }
export interface JevState {
	history: JevHistoryEntry[]
}

const states = new WeakMap<Editor, Atom<JevState>>()

export function getJevState(editor: Editor) {
	let state = states.get(editor)
	if (!state) {
		state = atom<JevState>('Jev status', { history: [] })
		states.set(editor, state)
	}
	return state
}

export function recordJevUpdate(editor: Editor, update: JevUpdate<JevPrediction>) {
	getJevState(editor).update(({ history }) => {
		const latest = history[0]
		if (update.status !== 'thinking' && latest?.status === 'thinking') {
			return { history: [{ ...update, id: latest.id, time: latest.time }, ...history.slice(1)] }
		}
		return {
			history: [{ ...update, id: (latest?.id ?? 0) + 1, time: Date.now() }, ...history].slice(
				0,
				100
			),
		}
	})
}
