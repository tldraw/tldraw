import { ProjectileKind } from './tower-config'

// We synthesize fire sounds with Web Audio API rather than loading assets so
// the example stays self-contained. The AudioContext is created lazily on the
// first call to side-step browser autoplay restrictions — by then the user has
// already clicked something to place a tower.

let ctx: AudioContext | null = null
let lastPlayedAt = 0
const MIN_INTERVAL_MS = 25 // hard cap to stop a wall of overlapping shots

function getCtx(): AudioContext | null {
	if (ctx) return ctx
	try {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		if (!Ctor) return null
		ctx = new Ctor()
		return ctx
	} catch {
		return null
	}
}

interface ToneSpec {
	type: OscillatorType
	startFreq: number
	endFreq: number
	durationMs: number
	gain: number
}

const TONES: Record<ProjectileKind, ToneSpec> = {
	arrow: { type: 'sawtooth', startFreq: 760, endFreq: 480, durationMs: 90, gain: 0.07 },
	rock: { type: 'square', startFreq: 160, endFreq: 70, durationMs: 180, gain: 0.1 },
	orb: { type: 'sine', startFreq: 880, endFreq: 320, durationMs: 220, gain: 0.09 },
}

export function playUpgradeSound() {
	const c = getCtx()
	if (!c) return
	if (c.state === 'suspended') c.resume().catch(() => {})

	// Two quick ascending sine notes — a small "level up" chime.
	const t0 = c.currentTime
	const notes = [
		{ freq: 660, start: 0, durMs: 120 },
		{ freq: 990, start: 90, durMs: 180 },
	]
	for (const n of notes) {
		const osc = c.createOscillator()
		osc.type = 'sine'
		const gain = c.createGain()
		const startAt = t0 + n.start / 1000
		const stopAt = startAt + n.durMs / 1000
		osc.frequency.setValueAtTime(n.freq, startAt)
		gain.gain.setValueAtTime(0.001, startAt)
		gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.01)
		gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
		osc.connect(gain).connect(c.destination)
		osc.start(startAt)
		osc.stop(stopAt + 0.02)
	}
}

export function playFireSound(kind: ProjectileKind) {
	const c = getCtx()
	if (!c) return
	if (c.state === 'suspended') c.resume().catch(() => {})

	const now = performance.now()
	if (now - lastPlayedAt < MIN_INTERVAL_MS) return
	lastPlayedAt = now

	const spec = TONES[kind]
	const t0 = c.currentTime
	const t1 = t0 + spec.durationMs / 1000

	const osc = c.createOscillator()
	osc.type = spec.type
	osc.frequency.setValueAtTime(spec.startFreq, t0)
	osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.endFreq), t1)

	const gain = c.createGain()
	gain.gain.setValueAtTime(spec.gain, t0)
	gain.gain.exponentialRampToValueAtTime(0.0001, t1)

	osc.connect(gain).connect(c.destination)
	osc.start(t0)
	osc.stop(t1 + 0.02)
}
