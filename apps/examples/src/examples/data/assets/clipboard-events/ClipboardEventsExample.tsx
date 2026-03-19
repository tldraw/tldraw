import { useCallback, useSyncExternalStore } from 'react'
import { Tldraw, type TldrawOptions } from 'tldraw'
import 'tldraw/tldraw.css'
import './clipboard-events.css'

// [1]
interface ClipboardLog {
	action: string
	source: string
	prevented: boolean
	detail?: string
}

interface ClipboardEventsState {
	disableCopy: boolean
	disablePaste: boolean
	filterRedOnCopy: boolean
	filterRedOnPaste: boolean
	log: ClipboardLog[]
}

const state: ClipboardEventsState = {
	disableCopy: false,
	disablePaste: false,
	filterRedOnCopy: false,
	filterRedOnPaste: false,
	log: [],
}

let stateVersion = 0
const listeners = new Set<() => void>()

function updateState(patch: Partial<ClipboardEventsState>) {
	Object.assign(state, patch)
	stateVersion++
	listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function getSnapshot() {
	return stateVersion
}

function addLog(entry: ClipboardLog) {
	updateState({ log: [...state.log.slice(-9), entry] })
	;(window as any).__tldraw_clipboard_log = [
		...((window as any).__tldraw_clipboard_log ?? []),
		entry,
	]
}

// [2]
const options: Partial<TldrawOptions> = {
	onClipboardCopy({ source }) {
		const prevented = state.disableCopy
		addLog({ action: 'copy', source, prevented })
		return prevented || undefined
	},
	onClipboardCut({ source }) {
		const prevented = state.disableCopy
		addLog({ action: 'cut', source, prevented })
		return prevented || undefined
	},
	onClipboardPaste({ source }) {
		const prevented = state.disablePaste
		addLog({ action: 'paste', source, prevented })
		return prevented || undefined
	},
	// [3]
	onBeforeCopyToClipboard({ content }) {
		if (!state.filterRedOnCopy) return
		const filtered = content.shapes.filter((s) => !('color' in s.props && s.props.color === 'red'))
		const filteredIds = new Set(filtered.map((s) => s.id))
		const result = {
			...content,
			shapes: filtered,
			rootShapeIds: content.rootShapeIds.filter((id) => filteredIds.has(id)),
		}
		addLog({
			action: 'filter-copy',
			source: 'onBeforeCopyToClipboard',
			prevented: false,
			detail: `kept ${filtered.length}/${content.shapes.length} shapes`,
		})
		return result
	},
	// [4]
	onBeforePasteFromClipboard({ content }) {
		if (!state.filterRedOnPaste) return
		if (content.type !== 'tldraw') return
		const filtered = content.content.shapes.filter(
			(s) => !('color' in s.props && s.props.color === 'red')
		)
		const filteredIds = new Set(filtered.map((s) => s.id))
		addLog({
			action: 'filter-paste',
			source: 'onBeforePasteFromClipboard',
			prevented: false,
			detail: `kept ${filtered.length}/${content.content.shapes.length} shapes`,
		})
		return {
			...content,
			content: {
				...content.content,
				shapes: filtered,
				rootShapeIds: content.content.rootShapeIds.filter((id) => filteredIds.has(id)),
			},
		}
	},
}

// [5]
;(window as any).__tldraw_clipboard_state = state
;(window as any).__tldraw_clipboard_updateState = updateState

function Controls() {
	useSyncExternalStore(subscribe, getSnapshot)

	const toggleCopy = useCallback(() => {
		updateState({ disableCopy: !state.disableCopy })
	}, [])

	const togglePaste = useCallback(() => {
		updateState({ disablePaste: !state.disablePaste })
	}, [])

	const toggleFilterCopy = useCallback(() => {
		updateState({ filterRedOnCopy: !state.filterRedOnCopy })
	}, [])

	const toggleFilterPaste = useCallback(() => {
		updateState({ filterRedOnPaste: !state.filterRedOnPaste })
	}, [])

	return (
		<div className="clipboard-events-panel">
			<div className="clipboard-events-controls">
				<label>
					<input type="checkbox" checked={state.disableCopy} onChange={toggleCopy} />
					Block copy/cut
				</label>
				<label>
					<input type="checkbox" checked={state.disablePaste} onChange={togglePaste} />
					Block paste
				</label>
				<label>
					<input type="checkbox" checked={state.filterRedOnCopy} onChange={toggleFilterCopy} />
					Filter red on copy
				</label>
				<label>
					<input type="checkbox" checked={state.filterRedOnPaste} onChange={toggleFilterPaste} />
					Filter red on paste
				</label>
			</div>
			<div className="clipboard-events-log" data-testid="clipboard-log">
				{state.log.length === 0 && <span className="clipboard-events-empty">No events yet</span>}
				{state.log.map((entry, i) => (
					<div key={i} className="clipboard-events-entry" data-testid="clipboard-log-entry">
						<strong>{entry.action}</strong> via <em>{entry.source}</em>
						{entry.prevented ? ' (blocked)' : ''}
						{entry.detail ? ` — ${entry.detail}` : ''}
					</div>
				))}
			</div>
		</div>
	)
}

export default function ClipboardEventsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				options={options}
				onMount={(editor) => {
					;(window as any).editor = editor
				}}
				components={{ TopPanel: Controls }}
				persistenceKey="clipboard-events-example"
			/>
		</div>
	)
}

/*
[1]
State is stored outside React so the clipboard callbacks (which are defined once as a
stable options object) can always read the latest values.

[2]
The options object is created once and the callbacks read from the shared state module.
This avoids issues with stale closures.

[3]
onBeforeCopyToClipboard filters red shapes from the clipboard content before it's written.

[4]
onBeforePasteFromClipboard filters red shapes from content when pasting. It only fires
for paste operations (keyboard shortcuts and menu), not for file drops.

[5]
State and updater are exposed on window for E2E testing.
*/
