import { describe, expect, it } from 'vitest'
import { createWorld, GRID } from '../overgrowth/game-state'
import { stepSim } from '../overgrowth/sim'
import { deserializeWorld, serializeWorld } from './net'

// Grow a world for a while, then assert a serialize → deserialize round-trip
// preserves everything the overlay reads: per-cell ownership, rock layout, the
// vine tree (parent links), cores and tips.
describe('overgrowth multiplayer snapshot', () => {
	it('round-trips ownership, rock, vine tree, cores and tips', () => {
		const world = createWorld()
		for (let i = 0; i < 400; i++) stepSim(world)

		const recon = deserializeWorld(serializeWorld(world))

		// Same number of pegs, in the same cells.
		expect(recon.pegs.length).toBe(world.pegs.length)
		expect(recon.pegs.length).toBe(GRID.cols * GRID.rows)

		let owned = 0
		let blocked = 0
		let withParent = 0
		for (const orig of world.pegs) {
			const r = recon.pegById.get(orig.id)!
			expect(r).toBeTruthy()
			// Ownership + rock match exactly.
			expect(r.owner).toBe(orig.owner)
			expect(r.blocked).toBe(orig.blocked)
			if (orig.owner) owned++
			if (orig.blocked) blocked++
			// Parent link preserved (presence + which cell it points at).
			expect(!!r.parent).toBe(!!orig.parent)
			if (orig.parent && r.parent) {
				const op = world.pegById.get(orig.parent)!
				const rp = recon.pegById.get(r.parent)!
				expect([rp.col, rp.row]).toEqual([op.col, op.row])
				withParent++
			}
		}

		// The growth actually populated the board (guards against a trivial pass).
		expect(owned).toBeGreaterThan(50)
		expect(blocked).toBeGreaterThan(50)
		expect(withParent).toBeGreaterThan(20)

		// One reconstructed strand per parent link.
		expect(recon.strands.length).toBe(withParent)

		// Cores, sources, tips carried over.
		expect(recon.sources).toEqual(world.sources)
		expect(recon.coreHp).toEqual(world.coreHp)
		expect(recon.tips.length).toBe(world.tips.length)
	})
})
