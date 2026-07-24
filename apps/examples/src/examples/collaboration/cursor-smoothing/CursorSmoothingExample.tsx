import { useRef, useState } from 'react'
import {
	CollaboratorCursorOverlayUtil,
	createUserId,
	Editor,
	InstancePresenceRecordType,
	TLInstancePresence,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

// How often the simulated peer "broadcasts" a cursor update, in milliseconds.
// Real collaborative sync is throttled to ~30fps (≈33ms); we use a slower rate
// here to make the difference between raw and smoothed motion obvious.
const BROADCAST_INTERVAL_MS = 120

// A smooth wandering path (two out-of-phase sine pairs) in page space. Returns
// the peer's "true" cursor position at a given time.
function pathAt(ms: number) {
	const t = ms / 1000
	return {
		x: 320 + 180 * Math.sin(t * 0.9) + 60 * Math.sin(t * 2.3),
		y: 260 + 150 * Math.cos(t * 1.1) + 50 * Math.cos(t * 1.7),
	}
}

export default function CursorSmoothingExample() {
	const smoothingRef = useRef(true)
	const [smoothing, setSmoothing] = useState(true)

	function onMount(editor: Editor) {
		// The overlay util that draws collaborator cursors. We flip its
		// `smoothing` option live from the checkbox so you can compare.
		const cursorUtil =
			editor.overlays.getOverlayUtil<CollaboratorCursorOverlayUtil>('collaborator_cursor')

		let peer: TLInstancePresence = InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId(editor.store.id),
			currentPageId: editor.getCurrentPageId(),
			userId: createUserId('smoothing-peer'),
			userName: 'Simulated peer',
			color: '#e03131',
			cursor: { x: 320, y: 260, velocity: { x: 0, y: 0 }, type: 'default', rotation: 0 },
		})

		let lastBroadcast = -Infinity

		function loop(now: number) {
			cursorUtil.options.smoothing = smoothingRef.current

			// Only "broadcast" a new sample every BROADCAST_INTERVAL_MS, exactly
			// like a network-throttled presence update.
			if (now - lastBroadcast >= BROADCAST_INTERVAL_MS) {
				lastBroadcast = now
				const pos = pathAt(now)

				// Instantaneous velocity from the true path, in page units/ms — this
				// is the vector the schema change lets us broadcast. The receiver
				// dead-reckons along it between samples.
				const ahead = pathAt(now + 8)
				const behind = pathAt(now - 8)
				const velocity = { x: (ahead.x - behind.x) / 16, y: (ahead.y - behind.y) / 16 }

				peer = {
					...peer,
					cursor: { ...peer.cursor!, x: pos.x, y: pos.y, velocity },
					lastActivityTimestamp: Date.now(),
				}
				editor.store.mergeRemoteChanges(() => editor.store.put([peer]))
			}

			raf = editor.timers.requestAnimationFrame(loop)
		}

		let raf = editor.timers.requestAnimationFrame(loop)
		return () => cancelAnimationFrame(raf)
	}

	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw persistenceKey="cursor-smoothing-example" onMount={onMount} />
			<label
				style={{
					position: 'absolute',
					top: 8,
					left: '50%',
					transform: 'translateX(-50%)',
					zIndex: 1000,
					display: 'flex',
					gap: 8,
					alignItems: 'center',
					padding: '6px 12px',
					borderRadius: 8,
					background: 'var(--color-panel)',
					boxShadow: 'var(--shadow-2)',
					font: '13px var(--tl-font-sans, sans-serif)',
					pointerEvents: 'all',
				}}
			>
				<input
					type="checkbox"
					checked={smoothing}
					onChange={(e) => {
						smoothingRef.current = e.target.checked
						setSmoothing(e.target.checked)
					}}
				/>
				Smooth cursor (broadcasting velocity, updates every {BROADCAST_INTERVAL_MS}ms)
			</label>
		</div>
	)
}
