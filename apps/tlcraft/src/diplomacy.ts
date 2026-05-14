// Diplomacy: per-pair war/peace state, treachery rules, and AI proposal logic.
//
// State model:
//   - DiplomacyState is a flat Map keyed by a canonical pair-of-ids string
//     ("p0|p1") with the lexicographically smaller id first. Symmetric by
//     construction; one entry per unordered pair.
//   - Default for any unobserved pair is 'war'. We only ever write entries
//     that move *off* the default, so save files stay small.
//
// Peace works like AoE2's Neutral stance: no auto-attacks between the
// players, units pass through each other's territory, towers don't fire.
// **Treachery is allowed**: a manual attack command against a peaceful
// player goes through, but the moment any damage lands on either side the
// pair flips back to 'war'.
//
// Vision is **not** shared during peace (kept simple per the design call).

import { atom } from 'tldraw'
import type { PlayerId } from './players'

export type RelationState = 'war' | 'peace'

function pairKey(a: PlayerId, b: PlayerId): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`
}

// Map: pair key → relation. Missing entry === 'war'.
export const diplomacyState$ = atom<Record<string, RelationState>>('diplomacyState', {})

export interface DiplomacyProposal {
	from: PlayerId
	to: PlayerId
	createdAt: number
	// Auto-declined after this many ms with no response. Lets the human take
	// their time but AI doesn't sit on a proposal forever.
	expiresAt: number
}

export const diplomacyProposals$ = atom<DiplomacyProposal[]>('diplomacyProposals', [])

// Per-pair cooldown so an AI doesn't spam proposals after one is declined.
// Map<pairKey, earliestProposeAt>.
const proposalCooldown = new Map<string, number>()

// Toast queue for "X declared war" / "X offers peace" / "Y declined" events.
export interface DiplomacyEvent {
	id: number
	kind: 'war-declared' | 'peace-offered' | 'peace-accepted' | 'peace-declined' | 'peace-broken'
	from: PlayerId
	to: PlayerId
	at: number
}
let _nextEventId = 1
export const diplomacyEvents$ = atom<DiplomacyEvent[]>('diplomacyEvents', [])

function pushEvent(kind: DiplomacyEvent['kind'], from: PlayerId, to: PlayerId, at: number) {
	diplomacyEvents$.update((list) => [...list, { id: _nextEventId++, kind, from, to, at }])
}

export function getRelation(a: PlayerId, b: PlayerId): RelationState {
	if (a === b) return 'peace' // a player is never at war with themselves
	return diplomacyState$.get()[pairKey(a, b)] ?? 'war'
}

export function setRelation(a: PlayerId, b: PlayerId, state: RelationState): void {
	if (a === b) return
	const key = pairKey(a, b)
	diplomacyState$.update((prev) => {
		const next = { ...prev }
		if (state === 'war') {
			delete next[key]
		} else {
			next[key] = state
		}
		return next
	})
}

/** Unilateral war declaration — instant, no acceptance required. Drops any
 * pending proposal between the two players. */
export function declareWar(from: PlayerId, to: PlayerId, now: number): void {
	if (from === to) return
	if (getRelation(from, to) === 'war') return
	setRelation(from, to, 'war')
	cancelProposalsBetween(from, to)
	pushEvent('war-declared', from, to, now)
}

/** Send a peace proposal from `from` to `to`. The recipient (human or AI)
 * must accept for the pair to flip to peace. */
export function proposePeace(from: PlayerId, to: PlayerId, now: number, expiresMs = 20_000): void {
	if (from === to) return
	if (getRelation(from, to) === 'peace') return
	const key = pairKey(from, to)
	const cooldown = proposalCooldown.get(key) ?? 0
	if (now < cooldown) return
	// Replace any existing proposal between this pair with the new one.
	diplomacyProposals$.update((list) => {
		const filtered = list.filter(
			(p) => !((p.from === from && p.to === to) || (p.from === to && p.to === from))
		)
		filtered.push({ from, to, createdAt: now, expiresAt: now + expiresMs })
		return filtered
	})
	pushEvent('peace-offered', from, to, now)
}

export function acceptPeace(from: PlayerId, to: PlayerId, now: number): boolean {
	const list = diplomacyProposals$.get()
	const matching = list.find((p) => p.from === from && p.to === to)
	if (!matching) return false
	setRelation(from, to, 'peace')
	diplomacyProposals$.update((arr) => arr.filter((p) => p !== matching))
	pushEvent('peace-accepted', to, from, now)
	return true
}

export function declinePeace(from: PlayerId, to: PlayerId, now: number): boolean {
	const list = diplomacyProposals$.get()
	const matching = list.find((p) => p.from === from && p.to === to)
	if (!matching) return false
	diplomacyProposals$.update((arr) => arr.filter((p) => p !== matching))
	const key = pairKey(from, to)
	// Don't allow a re-propose for ~30s — gives the situation a beat to change.
	proposalCooldown.set(key, now + 30_000)
	pushEvent('peace-declined', to, from, now)
	return true
}

export function cancelProposalsBetween(a: PlayerId, b: PlayerId): void {
	diplomacyProposals$.update((arr) =>
		arr.filter((p) => !((p.from === a && p.to === b) || (p.from === b && p.to === a)))
	)
}

/** Treachery hook. Call when one player deals damage to another. If they're
 * at peace, the pair flips to war immediately. Idempotent. */
export function onAttackDamage(attacker: PlayerId, victim: PlayerId, now: number): void {
	if (attacker === victim) return
	if (getRelation(attacker, victim) === 'war') return
	setRelation(attacker, victim, 'war')
	cancelProposalsBetween(attacker, victim)
	pushEvent('peace-broken', attacker, victim, now)
}

/** Tick: expire stale proposals. Cheap; we call it from the game loop. */
export function tickDiplomacy(now: number): void {
	const list = diplomacyProposals$.get()
	if (list.length === 0) return
	const surviving: DiplomacyProposal[] = []
	for (const p of list) {
		if (now >= p.expiresAt) {
			const key = pairKey(p.from, p.to)
			proposalCooldown.set(key, now + 30_000)
			pushEvent('peace-declined', p.to, p.from, now)
		} else {
			surviving.push(p)
		}
	}
	if (surviving.length !== list.length) diplomacyProposals$.set(surviving)
}

export function resetDiplomacy(): void {
	diplomacyState$.set({})
	diplomacyProposals$.set([])
	diplomacyEvents$.set([])
	proposalCooldown.clear()
}

// Memory-bounded event list — keep the most recent ~12 events so toasts /
// scoreboard log don't grow unbounded.
export function trimDiplomacyEvents(): void {
	const list = diplomacyEvents$.get()
	if (list.length > 12) diplomacyEvents$.set(list.slice(-12))
}
