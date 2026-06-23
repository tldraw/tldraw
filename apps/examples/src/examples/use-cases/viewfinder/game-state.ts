import { atom } from 'tldraw'

// One creature in the crowd, living in page space. (vx, vy) is its velocity.
// `seed` drives its idle wander and per-creature drawing jitter so the field
// looks alive and every creature is a little different. Exactly one creature
// has `isWally` set: it carries the tell and flees from the viewfinder.
export interface Creature {
	id: string
	x: number
	y: number
	vx: number
	vy: number
	seed: number
	isWally: boolean
	// Wally only: how close he is to being framed (0..1), and a phase that drives
	// his comedic flailing while he dodges.
	panic: number
	wobble: number
}

export interface World {
	creatures: Creature[]
	wally: Creature
	found: boolean
}

// The field the crowd lives on, in page units. Creatures bounce off its edges,
// so the corners are where a fleeing Wally can be cornered.
export const FIELD = { w: 1800, h: 1300 }

// How many creatures share the field.
const COUNT = 140

let world: World = createWorld()

export function getWorld() {
	return world
}

function rand(min: number, max: number) {
	return min + Math.random() * (max - min)
}

export function createWorld(): World {
	const creatures: Creature[] = []
	for (let i = 0; i < COUNT; i++) {
		creatures.push({
			id: `c:${i}`,
			x: rand(40, FIELD.w - 40),
			y: rand(40, FIELD.h - 40),
			vx: rand(-0.5, 0.5),
			vy: rand(-0.5, 0.5),
			seed: Math.random() * Math.PI * 2,
			isWally: false,
			panic: 0,
			wobble: 0,
		})
	}
	const wally = creatures[Math.floor(Math.random() * creatures.length)]
	wally.isWally = true
	return { creatures, wally, found: false }
}

export function resetWorld() {
	world = createWorld()
	publishWorld()
}

// --- reactive bridge: republished each tick so the overlay + HUD re-render ---

export const frame$ = atom('vf-frame', 0)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}
