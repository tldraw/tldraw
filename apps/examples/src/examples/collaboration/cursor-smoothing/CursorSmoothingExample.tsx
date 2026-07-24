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

// The peer's "true" cursor position at a given time, in page space.
// - smooth path: a wandering pair of sine waves.
// - stress path: fast linear darts between corners with a dead stop at each one,
//   so the motion has abrupt starts, stops, and direction reversals. This is the
//   case that trips up prediction/extrapolation; interpolation just tweens
//   between received points, so it should stay glitch-free.
function pathAt(ms: number, stress: boolean) {
	if (!stress) {
		const t = ms / 1000
		return {
			x: 320 + 180 * Math.sin(t * 0.9) + 60 * Math.sin(t * 2.3),
			y: 260 + 150 * Math.cos(t * 1.1) + 50 * Math.cos(t * 1.7),
		}
	}

	const corners = [
		{ x: 150, y: 260 },
		{ x: 520, y: 260 },
		{ x: 520, y: 430 },
		{ x: 150, y: 430 },
	]
	const legMs = 900
	const leg = Math.floor(ms / legMs)
	const phase = (ms % legMs) / legMs
	const a = corners[leg % corners.length]
	const b = corners[(leg + 1) % corners.length]
	// Move over the first 35% of the leg, then hold — abrupt start and stop.
	const moveFrac = 0.35
	const k = phase < moveFrac ? phase / moveFrac : 1
	return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

export default function CursorSmoothingExample() {
	const smoothingRef = useRef(true)
	const stressRef = useRef(false)
	const [smoothing, setSmoothing] = useState(true)
	const [stress, setStress] = useState(false)

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
			cursor: { x: 320, y: 260, type: 'default', rotation: 0 },
		})

		let lastBroadcast = -Infinity

		function loop(now: number) {
			cursorUtil.options.smoothing = smoothingRef.current

			// Only "broadcast" a new sample every BROADCAST_INTERVAL_MS, exactly
			// like a network-throttled presence update. No velocity — the receiver
			// tweens between the samples it gets.
			if (now - lastBroadcast >= BROADCAST_INTERVAL_MS) {
				lastBroadcast = now
				const pos = pathAt(now, stressRef.current)
				peer = {
					...peer,
					cursor: { ...peer.cursor!, x: pos.x, y: pos.y },
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
			<div
				style={{
					position: 'absolute',
					top: 8,
					left: '50%',
					transform: 'translateX(-50%)',
					zIndex: 1000,
					display: 'flex',
					gap: 16,
					alignItems: 'center',
					padding: '6px 12px',
					borderRadius: 8,
					background: 'var(--color-panel)',
					boxShadow: 'var(--shadow-2)',
					font: '13px var(--tl-font-sans, sans-serif)',
					pointerEvents: 'all',
				}}
			>
				<label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
					<input
						type="checkbox"
						checked={smoothing}
						onChange={(e) => {
							smoothingRef.current = e.target.checked
							setSmoothing(e.target.checked)
						}}
					/>
					Smooth cursor (updates every {BROADCAST_INTERVAL_MS}ms)
				</label>
				<label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
					<input
						type="checkbox"
						checked={stress}
						onChange={(e) => {
							stressRef.current = e.target.checked
							setStress(e.target.checked)
						}}
					/>
					Stress test (abrupt stops &amp; reversals)
				</label>
			</div>
		</div>
	)
}
