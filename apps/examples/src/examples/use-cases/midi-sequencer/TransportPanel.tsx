import { useRef } from 'react'
import {
	parseTldrawJsonFile,
	serializeTldrawJsonBlob,
	loadSnapshot,
	useEditor,
	useValue,
} from 'tldraw'
import { MidiEngine } from './engine/MidiEngine'
import { getSongBpm, setSongBpm, syncAllShapes } from './syncEngine'

// Global transport + output selection + song save/open, shown in the top panel.
export function TransportPanel() {
	const editor = useEditor()
	const engine = MidiEngine.get(editor)
	const transport = useValue('transport', () => engine.transport.get(), [engine])
	const midi = useValue('midi', () => engine.midi.get(), [engine])
	const bpm = useValue('bpm', () => getSongBpm(editor), [editor])
	const fileInput = useRef<HTMLInputElement>(null)

	const saveSong = async () => {
		const blob = await serializeTldrawJsonBlob(editor)
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'song.tldr'
		a.click()
		URL.revokeObjectURL(url)
	}

	const openSong = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		e.target.value = '' // allow re-opening the same file
		if (!file) return
		const result = parseTldrawJsonFile({ schema: editor.store.schema, json: await file.text() })
		if (!result.ok) {
			// eslint-disable-next-line no-alert
			window.alert('Could not open that file — it does not look like a tldraw song.')
			return
		}
		loadSnapshot(editor.store, result.value.getStoreSnapshot())
		// loadSnapshot replaces the store wholesale, so rebuild the engine from it.
		syncAllShapes(editor)
	}

	return (
		<div className="midi-transport tlui-menu">
			<button
				className={`midi-transport__play ${transport.playing ? 'is-playing' : ''}`}
				onClick={() => engine.togglePlay()}
			>
				{transport.playing ? '■ Stop' : '▶ Play'}
			</button>

			<label className="midi-transport__bpm">
				BPM
				<input
					type="number"
					min={20}
					max={300}
					value={bpm}
					onChange={(e) => setSongBpm(editor, Number(e.target.value) || 120)}
				/>
			</label>

			<button
				className="midi-transport__file"
				onClick={saveSong}
				title="Download this song as a .tldr file"
			>
				Save song
			</button>
			<button
				className="midi-transport__file"
				onClick={() => fileInput.current?.click()}
				title="Open a .tldr song file"
			>
				Open song
			</button>
			<input
				ref={fileInput}
				type="file"
				accept=".tldr,application/json"
				style={{ display: 'none' }}
				onChange={openSong}
			/>

			{!midi.supported ? (
				<span className="midi-transport__warn">
					Web MIDI not supported (use a Chromium browser)
				</span>
			) : !midi.enabled ? (
				<button onClick={() => engine.enableMidi()}>Enable MIDI</button>
			) : midi.outputs.length === 0 ? (
				<span className="midi-transport__warn">
					No MIDI outputs — enable the IAC Driver in Audio MIDI Setup, then turn on its input in
					GarageBand
				</span>
			) : (
				<label className="midi-transport__out">
					Out
					<select
						value={midi.selectedId ?? ''}
						onChange={(e) => engine.selectOutput(e.target.value)}
					>
						{midi.outputs.map((o) => (
							<option key={o.id} value={o.id}>
								{o.name}
							</option>
						))}
					</select>
				</label>
			)}

			{midi.enabled && (
				<button
					className="midi-transport__file"
					onClick={() => engine.rescanMidi()}
					title="Re-scan MIDI ports (e.g. after reopening GarageBand)"
				>
					Rescan
				</button>
			)}
		</div>
	)
}
