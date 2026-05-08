// Deterministic PRNG for the simulation. Seeded once at match start; every
// random decision in the sim (AI, training spawn jitter, map generation,
// nation/town shuffles) advances this generator. Identical seed → identical
// match. Required for the planned lockstep multiplayer mode and useful for
// replays + reproducible bug reports in single-player.
//
// We use mulberry32 — a 32-bit PRNG with good distribution for our needs and
// roughly 5ns per call. Anything heavier would be measurable in our tick
// budget. The state is module-local because the simulation is a singleton
// per browser tab.

let _state = 1 >>> 0

/** Reset the generator to a known state. Pass a 32-bit unsigned int. */
export function setRandomSeed(seed: number) {
	_state = seed >>> 0 || 1 // mulberry32 needs a non-zero state
}

/** Get the current internal state — useful for debug snapshots / desync hunts. */
export function getRandomState(): number {
	return _state
}

/** Returns a float in [0, 1). */
export function nextRandom(): number {
	let t = (_state += 0x6d2b79f5)
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Returns an integer in [0, maxExclusive). */
export function nextInt(maxExclusive: number): number {
	return Math.floor(nextRandom() * maxExclusive)
}

/** Returns a float in [min, max). */
export function nextRange(min: number, max: number): number {
	return min + nextRandom() * (max - min)
}

/** Pick a uniformly random element from a non-empty array. */
export function pickRandom<T>(items: readonly T[]): T {
	return items[nextInt(items.length)]
}

/** Fisher–Yates shuffle in place using the seeded PRNG. */
export function shuffleInPlace<T>(items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = nextInt(i + 1)
		;[items[i], items[j]] = [items[j], items[i]]
	}
	return items
}

/** Generate a fresh seed from `Math.random` (allowed at session start, before
 * the sim begins — not inside the tick). */
export function freshSeed(): number {
	return Math.floor(Math.random() * 0x100000000) >>> 0
}
