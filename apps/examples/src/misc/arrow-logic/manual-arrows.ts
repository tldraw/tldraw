import { Vec } from 'tldraw'
import { ArrowDirection, MINIMUM_LEG_LENGTH } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'

// Midle leg of an S is too short if the centers of A and B are too close on the axis of the leg
function sArrowMiddleLegTooShort(g: ArrowNavigationGrid, dir: ArrowDirection) {
	switch (dir) {
		case 'right': {
			return Math.abs(g.A.c.y - g.B.c.y) < MINIMUM_LEG_LENGTH
		}
		case 'down': {
			return Math.abs(g.A.c.x - g.B.c.x) < MINIMUM_LEG_LENGTH
		}
		case 'left': {
			return Math.abs(g.A.c.y - g.B.c.y) < MINIMUM_LEG_LENGTH
		}
		case 'up': {
			return Math.abs(g.A.c.x - g.B.c.x) < MINIMUM_LEG_LENGTH
		}
	}
}

// Outside leg of an S is too short if the edge of A is too close to the center of C
function sArrowOutsideLegTooShort(g: ArrowNavigationGrid, dir: ArrowDirection) {
	switch (dir) {
		case 'right': {
			return g.A.e.r.x > g.C.c.x
		}
		case 'down': {
			return g.A.e.b.y > g.C.c.y
		}
		case 'left': {
			return g.A.e.l.x < g.C.c.x
		}
		case 'up': {
			return g.A.e.t.y < g.C.c.y
		}
	}
}

// An I arrow is just a straight line aligned with the center of the shapes on the axis of the arrow
function getIArrowPath(g: ArrowNavigationGrid, dir: ArrowDirection, averaged?: boolean) {
	if (averaged) {
		switch (dir) {
			case 'right': {
				return [new Vec(g.A.r.x, g.C.c.y), new Vec(g.B.l.x, g.C.c.y)]
			}
			case 'down': {
				return [new Vec(g.C.c.x, g.A.b.y), new Vec(g.C.c.x, g.B.t.y)]
			}
			case 'left': {
				return [new Vec(g.A.l.x, g.C.c.y), new Vec(g.B.r.x, g.C.c.y)]
			}
			case 'up': {
				return [new Vec(g.C.c.x, g.A.t.y), new Vec(g.C.c.x, g.B.b.y)]
			}
		}
	}

	switch (dir) {
		case 'right': {
			return [new Vec(g.A.r.x, g.A.r.y), new Vec(g.B.l.x, g.A.r.y)]
		}
		case 'down': {
			return [new Vec(g.A.b.x, g.A.b.y), new Vec(g.A.b.x, g.B.t.y)]
		}
		case 'left': {
			return [new Vec(g.A.l.x, g.A.l.y), new Vec(g.B.r.x, g.A.l.y)]
		}
		case 'up': {
			return [new Vec(g.A.t.x, g.A.t.y), new Vec(g.A.t.x, g.B.b.y)]
		}
	}
}

// A U arrow goes out to the outside expanded bounds and wraps around the outside corner before returning to the other box on the same edge (e.g. top to top)
function getUArrowPath(g: ArrowNavigationGrid, dir1: ArrowDirection, dir2: ArrowDirection) {
	switch (dir1) {
		case 'right': {
			if (dir2 === 'down') {
				if (g.overlap) {
					return [g.A.t, g.A.e.t, g.D.tcr, g.D.tcl, g.B.e.t, g.B.t]
				} else {
					return [g.A.t, g.A.e.t, g.D.tcl, g.D.tcr, g.B.e.t, g.B.t]
				}
			} else if (dir2 === 'up') {
				if (g.overlap) {
					return [g.A.b, g.A.e.b, g.D.bcr, g.D.bcl, g.B.e.b, g.B.b]
				} else {
					return [g.A.b, g.A.e.b, g.D.bcl, g.D.bcr, g.B.e.b, g.B.b]
				}
			}
			break
		}
		case 'down': {
			if (dir2 === 'left') {
				if (g.overlap) {
					return [g.A.l, g.A.e.l, g.D.lcb, g.D.lct, g.B.e.l, g.B.l]
				} else {
					return [g.A.l, g.A.e.l, g.D.lct, g.D.lcb, g.B.e.l, g.B.l]
				}
			} else if (dir2 === 'right') {
				if (g.overlap) {
					return [g.A.r, g.A.e.r, g.D.rcb, g.D.rct, g.B.e.r, g.B.r]
				} else {
					return [g.A.r, g.A.e.r, g.D.rct, g.D.rcb, g.B.e.r, g.B.r]
				}
			}
			break
		}
		case 'left': {
			if (dir2 === 'down') {
				if (g.overlap) {
					return [g.A.t, g.A.e.t, g.D.tcl, g.D.tcr, g.B.e.t, g.B.t]
				} else {
					return [g.A.t, g.A.e.t, g.D.tcr, g.D.tcl, g.B.e.t, g.B.t]
				}
			} else if (dir2 === 'up') {
				if (g.overlap) {
					return [g.A.b, g.A.e.b, g.D.bcl, g.D.tcl, g.B.e.b, g.B.b]
				} else {
					return [g.A.b, g.A.e.b, g.D.tcl, g.D.bcl, g.B.e.b, g.B.b]
				}
			}
			break
		}
		case 'up': {
			if (dir2 === 'left') {
				if (g.overlap) {
					return [g.A.l, g.A.e.l, g.D.lct, g.D.lcb, g.B.e.l, g.B.l]
				} else {
					return [g.A.l, g.A.e.l, g.D.lcb, g.D.lct, g.B.e.l, g.B.l]
				}
			} else if (dir2 === 'right') {
				if (g.overlap) {
					return [g.A.r, g.A.e.r, g.D.rct, g.D.rcb, g.B.e.r, g.B.r]
				} else {
					return [g.A.r, g.A.e.r, g.D.rcb, g.D.rct, g.B.e.r, g.B.r]
				}
			}
			break
		}
	}

	return []
}

// An L arrow goes out to the outside of the center bounds and then returns to the other box on the closest edge (e.g. right to top)
function getLArrowPath(g: ArrowNavigationGrid, dir: ArrowDirection) {
	switch (dir) {
		case 'right': {
			return [
				g.A.r,
				g.A.e.r,
				g.vDir === 'down' ? g.C.tr : g.C.br,
				g.vDir === 'down' ? g.B.e.t : g.B.e.b,
				g.vDir === 'down' ? g.B.t : g.B.b,
			]
		}
		case 'down': {
			return [
				g.hDir === 'right' ? g.A.r : g.A.l,
				g.hDir === 'right' ? g.A.e.r : g.A.e.l,
				g.hDir === 'right' ? g.C.tr : g.C.tl,
				g.B.e.t,
				g.B.t,
			]
		}
		case 'left': {
			return [
				g.A.l,
				g.A.e.l,
				g.vDir === 'down' ? g.C.tl : g.C.bl,
				g.vDir === 'down' ? g.B.e.t : g.B.e.b,
				g.vDir === 'down' ? g.B.t : g.B.b,
			]
		}
		case 'up': {
			return [
				g.hDir === 'right' ? g.A.r : g.A.l,
				g.hDir === 'right' ? g.A.e.r : g.A.e.l,
				g.hDir === 'right' ? g.C.br : g.C.bl,
				g.B.e.b,
				g.B.b,
			]
		}
	}
}

function getSArrowPath(g: ArrowNavigationGrid, dir: ArrowDirection) {
	switch (dir) {
		case 'right': {
			return [
				g.A.r,
				g.A.e.r,
				g.vDir === 'down' ? g.C.t : g.C.b,
				g.vDir === 'down' ? g.C.b : g.C.t,
				g.B.e.l,
				g.B.l,
			]
		}
		case 'down': {
			return [
				g.A.b,
				g.A.e.b,
				g.hDir === 'left' ? g.C.r : g.C.l,
				g.hDir === 'left' ? g.C.l : g.C.r,
				g.B.e.t,
				g.B.t,
			]
		}
		case 'left': {
			return [
				g.A.l,
				g.A.e.l,
				g.vDir === 'down' ? g.C.t : g.C.b,
				g.vDir === 'down' ? g.C.b : g.C.t,
				g.B.e.r,
				g.B.r,
			]
		}
		case 'up': {
			return [
				g.A.t,
				g.A.e.t,
				g.hDir === 'left' ? g.C.r : g.C.l,
				g.hDir === 'left' ? g.C.l : g.C.r,
				g.B.e.b,
				g.B.b,
			]
		}
	}
}
