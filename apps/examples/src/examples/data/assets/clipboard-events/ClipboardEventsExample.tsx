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
	handleRawPaste: boolean
	useAsyncCallbacks: boolean
	log: ClipboardLog[]
}

const state: ClipboardEventsState = {
	disableCopy: false,
	disablePaste: false,
	filterRedOnCopy: false,
	filterRedOnPaste: false,
	handleRawPaste: false,
	useAsyncCallbacks: false,
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
	updateState({ log: [entry, ...state.log].slice(0, 3) })
	;(window as any).__tldraw_clipboard_log = [
		...((window as any).__tldraw_clipboard_log ?? []),
		entry,
	]
}

// [2]
function delay(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const options: Partial<TldrawOptions> = {
	onClipboardPasteRaw(info) {
		if (!state.handleRawPaste) return
		function doThings() {
			if (info.source === 'native-event') {
				const kinds = info.clipboardData
					? [...info.clipboardData.items].map((i) => `${i.kind}:${i.type}`).join(', ')
					: '(no clipboardData)'
				addLog({
					action: 'raw-paste',
					source: 'native-event',
					prevented: false,
					detail: `${kinds}${state.useAsyncCallbacks ? ' (async)' : ''}`,
				})
			} else {
				addLog({
					action: 'raw-paste',
					source: 'clipboard-read',
					prevented: false,
					detail: `${info.clipboardItems.length} clipboard item(s)${state.useAsyncCallbacks ? ' (async)' : ''}`,
				})
			}
		}

		if (state.useAsyncCallbacks) {
			delay(500).then(() => doThings())
		} else {
			doThings()
		}
		return false
	},
	async onBeforeCopyToClipboard({ content, operation, source }) {
		if (state.useAsyncCallbacks) await delay(500)
		if (state.disableCopy) {
			addLog({
				action: operation,
				source,
				prevented: true,
			})
			return false
		}
		addLog({
			action: operation,
			source,
			prevented: false,
		})
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
	async onBeforePasteFromClipboard({ content, source }) {
		if (state.useAsyncCallbacks) await delay(500)
		if (state.disablePaste) {
			addLog({ action: 'paste', source, prevented: true })
			return false
		}
		addLog({ action: 'paste', source, prevented: false })
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

// [3]
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

	const toggleRawPaste = useCallback(() => {
		updateState({ handleRawPaste: !state.handleRawPaste })
	}, [])

	const toggleAsync = useCallback(() => {
		updateState({ useAsyncCallbacks: !state.useAsyncCallbacks })
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
				<label>
					<input type="checkbox" checked={state.handleRawPaste} onChange={toggleRawPaste} />
					Handle raw paste (take over)
				</label>
				<label>
					<input type="checkbox" checked={state.useAsyncCallbacks} onChange={toggleAsync} />
					Async callbacks (500ms delay)
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

onBeforeCopyToClipboard runs for both copy and cut; use `operation` to tell them apart.
Return `false` to cancel the clipboard write. For cut, cancelling also keeps the selection.

onBeforePasteFromClipboard runs when pasted content is about to be applied. Return
`false` to cancel. `source` is `native-event` (keyboard paste event) or `clipboard-read`.

onClipboardPasteRaw runs first. `source` is `native-event` (paste event + DataTransfer) or
`clipboard-read` (ClipboardItem[] from the clipboard API). Return `false` to cancel tldraw's default
paste handling for that gesture (same as other clipboard `onBefore*` hooks).

All three callbacks support async (returning a Promise). The "Async callbacks" toggle adds a
500ms delay to each callback to verify that async resolution works on all platforms.

[3]
State and updater are exposed on window for E2E testing.
*/
