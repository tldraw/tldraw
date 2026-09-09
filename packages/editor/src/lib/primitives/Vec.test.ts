import { Vec } from './Vec'

describe('iteratable', () => {
	it('Constructs', () => {
		const v = new Vec(1, 2)
		const { x, y } = v
		expect(x).toBeCloseTo(1)
		expect(y).toBeCloseTo(2)
	})
})

describe('Vec.Clamp', () => {
	it('Clamps a vector between a range.', () => {
		expect(Vec.Clamp(new Vec(9, 5), 7, 10)).toMatchObject(new Vec(9, 7))
		expect(Vec.Clamp(new Vec(-9, 5), 0, 10)).toMatchObject(new Vec(0, 5))
	})
})

describe('Vec.Clamp', () => {
	it('Clamps a vector between a range.', () => {
		expect(Vec.Clamp(new Vec(9, 5), 7, 10)).toMatchObject(new Vec(9, 7))
		expect(Vec.Clamp(new Vec(-9, 5), 0, 10)).toMatchObject(new Vec(0, 5))
	})
	it('Clamps a vector between a range.', () => {
		expect(Vec.Clamp(new Vec(9, 5), 10)).toMatchObject(new Vec(10, 10))
		expect(Vec.Clamp(new Vec(-9, 5), 10)).toMatchObject(new Vec(10, 10))
	})
})

describe('Vec.Neg', () => {
	it('Negates a vector.', () => {
		expect(Vec.Neg(new Vec(9, 5))).toMatchObject(new Vec(-9, -5))
		expect(Vec.Neg(new Vec(-9, 0))).toMatchObject(new Vec(9, -0))
	})
})

describe('Vec.Add', () => {
	it('Adds two vectors.', () => {
		expect(Vec.Add(new Vec(9, 5), new Vec(2, 1))).toMatchObject(new Vec(11, 6))
		expect(Vec.Add(new Vec(-9, 5), new Vec(2, -1))).toMatchObject(new Vec(-7, 4))
	})
})

describe('Vec.AddScalar', () => {
	it('Adds a scalar to a vector.', () => {
		expect(Vec.AddScalar(new Vec(9, 5), 2)).toMatchObject(new Vec(11, 7))
		expect(Vec.AddScalar(new Vec(-9, 5), 2)).toMatchObject(new Vec(-7, 7))
	})
})

describe('Vec.Sub', () => {
	it('Subtracts two vectors.', () => {
		expect(Vec.Sub(new Vec(9, 5), new Vec(2, 1))).toMatchObject(new Vec(7, 4))
		expect(Vec.Sub(new Vec(-9, 5), new Vec(2, -1))).toMatchObject(new Vec(-11, 6))
	})
})

describe('Vec.SubScalar', () => {
	it('Subtracts a scalar from a vector.', () => {
		expect(Vec.SubScalar(new Vec(9, 5), 2)).toMatchObject(new Vec(7, 3))
		expect(Vec.SubScalar(new Vec(-9, 5), 2)).toMatchObject(new Vec(-11, 3))
	})
})

describe('Vec.Mul', () => {
	it('Get a vector multiplied by a scalar.', () => {
		expect(Vec.Mul(new Vec(9, 9), 3)).toMatchObject(new Vec(27, 27))
		expect(Vec.Mul(new Vec(10, 10), 2)).toMatchObject(new Vec(20, 20))
	})
})

describe('Vec.DivV', () => {
	it('Get a vector multiplied by a vector.', () => {
		expect(Vec.MulV(new Vec(16, 12), new Vec(2, 4))).toMatchObject(new Vec(32, 48))
		expect(Vec.MulV(new Vec(5, 15), new Vec(5, 3))).toMatchObject(new Vec(25, 45))
	})
})

describe('Vec.Div', () => {
	it('Get a vector divided by a scalar.', () => {
		expect(Vec.Div(new Vec(9, 9), 3)).toMatchObject(new Vec(3, 3))
		expect(Vec.Div(new Vec(10, 10), 2)).toMatchObject(new Vec(5, 5))
	})
})

describe('Vec.DivV', () => {
	it('Get a vector divided by a vector.', () => {
		expect(Vec.DivV(new Vec(16, 12), new Vec(2, 4))).toMatchObject(new Vec(8, 3))
		expect(Vec.DivV(new Vec(5, 15), new Vec(5, 3))).toMatchObject(new Vec(1, 5))
	})
})

describe('Vec.Per', () => {
	it('Gets the perpendicular rotation of a vector.', () => {
		expect(Vec.Per(new Vec(1, -1))).toMatchObject(new Vec(-1, -1))
		expect(Vec.Per(new Vec(-1, 1))).toMatchObject(new Vec(1, 1))
	})
})

describe('Vec.Dpr', () => {
	it('Gets the dot product of two vectors.', () => {
		expect(Vec.Dpr(new Vec(1, 0), new Vec(1, 0))).toEqual(1)
		expect(Vec.Dpr(new Vec(1, 0), new Vec(0, 0))).toEqual(0)
		expect(Vec.Dpr(new Vec(1, 0), new Vec(-1, 0))).toEqual(-1)
	})
})

describe('Vec.Cpr', () => {
	it('Gets the cross product (outer product) of two vectors.', () => {
		expect(Vec.Cpr(new Vec(0, 1), new Vec(1, 1))).toEqual(-1)
		expect(Vec.Cpr(new Vec(1, 1), new Vec(1, 1))).toEqual(0)
		expect(Vec.Cpr(new Vec(1, 1), new Vec(0, 1))).toEqual(1)
	})
})

describe('Vec.Len2', () => {
	it('Gets the length of a vector squared.', () => {
		expect(Vec.Len2(new Vec(0, 0))).toEqual(0)
		expect(Vec.Len2(new Vec(0, 1))).toEqual(1)
		expect(Vec.Len2(new Vec(1, 1))).toEqual(2)
	})
})

describe('Vec.Len', () => {
	it('Gets the length of a vector.', () => {
		expect(Vec.Len(new Vec(0, 0))).toEqual(0)
		expect(Vec.Len(new Vec(0, 1))).toEqual(1)
		expect(Vec.Len(new Vec(1, 1))).toEqual(1.4142135623730951)
	})
})

describe('Vec.Pry', () => {
	it('Projects a vector A over vector B.', () => {
		expect(Vec.Pry(new Vec(0, 0), new Vec(0, 10))).toEqual(0)
		expect(Vec.Pry(new Vec(0, 0), new Vec(10, 10))).toEqual(0)
		expect(Vec.Pry(new Vec(10, 10), new Vec(0, 10))).toEqual(10)
		expect(Vec.Pry(new Vec(10, 10), new Vec(10, 10))).toEqual(14.14213562373095)
	})
})

describe('Vec.Uni', () => {
	it('Gets the normalized vector.', () => {
		expect(Vec.Uni(new Vec(0, 10))).toMatchObject(new Vec(0, 1))
		expect(Vec.Uni(new Vec(10, 10))).toMatchObject(new Vec(0.7071067811865475, 0.7071067811865475))
	})

	it('Divide-by-zero spits out 0', () => {
		expect(Vec.Uni(new Vec(0, 0))).toMatchObject(new Vec(0, 0))
	})
})

describe('Vec.Tan', () => {
	it('Gets the tangent between two vectors.', () => {
		expect(Vec.Tan(new Vec(0, 0), new Vec(0, 10))).toMatchObject(new Vec(0, -1))
		expect(Vec.Tan(new Vec(0, 0), new Vec(10, 10))).toMatchObject(
			new Vec(-0.7071067811865475, -0.7071067811865475)
		)
	})
})

describe('Vec.Dist2', () => {
	it('Finds the squared distance between two points.', () => {
		expect(Vec.Dist2(new Vec(0, 0), new Vec(0, 10))).toEqual(100)
		expect(Vec.Dist2(new Vec(0, 0), new Vec(10, 10))).toEqual(200)
	})
})

describe('Vec.Dist', () => {
	it('Finds the distance between two points.', () => {
		expect(Vec.Dist(new Vec(0, 0), new Vec(0, 10))).toEqual(10)
		expect(Vec.Dist(new Vec(0, 0), new Vec(10, 10))).toEqual(14.142135623730951)
	})
})

// describe('Vec.Ang2', () => {
//   it('Finds the angle in radians between two vectors.', () => {
//     expect(Vec.Ang2(new Vec(1, 0), new Vec(0, 1))).toEqual(Math.PI / 2)
//   })
// })

// describe('Vec.Ang3', () => {
//   it('Gets the angle of ∠ABC', () => {
//     expect(Vec.Ang3([5, 0], new Vec(0, 0), new Vec(0, 5))).toEqual(Math.PI / 2)
//     expect(Vec.Ang3(new Vec(1, 0), new Vec(0, 0), new Vec(0, 1))).toEqual(Math.PI / 2)
//   })
// })

describe('Vec.Angle', () => {
	it('Finds the angle in radians between two points.', () => {
		expect(Vec.Angle(new Vec(0, 0), new Vec(10, 10))).toEqual(Math.PI / 4)
		expect(Vec.Angle(new Vec(0, 0), new Vec(10, 0))).toEqual(0)
		expect(Vec.Angle(new Vec(0, 0), new Vec(0, 10))).toEqual(Math.PI / 2)
	})
})

describe('Vec.Med', () => {
	it('Finds the midpoint between two vectors.', () => {
		expect(Vec.Med(new Vec(0, 0), new Vec(10, 10))).toMatchObject(new Vec(5, 5))
		expect(Vec.Med(new Vec(0, 0), new Vec(10, 0))).toMatchObject(new Vec(5, 0))
		expect(Vec.Med(new Vec(0, 0), new Vec(0, 10))).toMatchObject(new Vec(0, 5))
		expect(Vec.Med(new Vec(-100, 0), new Vec(0, 100))).toMatchObject(new Vec(-50, 50))
	})
})

describe('Vec.Rot', () => {
	it('Rotates a vector by a rotation in radians.', () => {
		const { x, y } = Vec.Rot(new Vec(1, 0), Math.PI / 4)
		expect(x).toBeCloseTo(0.7, 1)
		expect(y).toBeCloseTo(0.7, 1)
	})
})

describe('Vec.RotWith', () => {
	it('Rotates a vector around a second vector by a rotation in radians.', () => {
		expect(Vec.RotWith(new Vec(1, 0), new Vec(0, 0), Math.PI / 4)).toMatchObject(
			new Vec(0.7071067811865476, 0.7071067811865475)
		)
	})
})

describe('Vec.Equals', () => {
	it('Gets whether two vectors are identical.', () => {
		expect(Vec.Equals(new Vec(1, 2), new Vec(1, 2))).toEqual(true)
		expect(Vec.Equals(new Vec(1, 2), new Vec(1, 3))).toEqual(false)
		expect(Vec.Equals(new Vec(-0, 2), new Vec(0, 2))).toEqual(true)
	})
})

describe('Vec.Int', () => {
	it('Interpolate from A to B', () => {
		expect(Vec.Lrp(new Vec(0, 0), new Vec(10, 10), 0.5)).toMatchObject(new Vec(5, 5))
		expect(Vec.Lrp(new Vec(0, 0), new Vec(10, 10), 2)).toMatchObject(new Vec(20, 20))
	})
})

describe('Vec.Rescale', () => {
	it('Rescales a vector by a scalar', () => {
		expect(Vec.Rescale(new Vec(5, 0), 1)).toMatchObject(new Vec(1, 0))
		expect(Vec.Rescale(new Vec(5, 0), 2)).toMatchObject(new Vec(2, 0))
		expect(Vec.Rescale(new Vec(0.5, 0.25), 2)).toEqual(
			new Vec(1.7888543819998317, 0.8944271909999159)
		)
	})
})

describe('Vec.IsClockwise', () => {
	it('Gets whether point A and point B wind clockwise around point C.', () => {
		expect(Vec.Clockwise(new Vec(0, 0), new Vec(5, 5), new Vec(0, 5))).toEqual(true)
		expect(Vec.Clockwise(new Vec(5, 5), new Vec(0, 0), new Vec(0, 5))).toEqual(false)
		expect(Vec.Clockwise(new Vec(0, 10), new Vec(0, 0), new Vec(0, 5))).toEqual(false)
	})
})

describe('Vec.ToFixed', () => {
	it('Rounds a vector to the a given precision.', () => {
		expect(Vec.ToFixed(new Vec(1.2345, 5.678))).toMatchObject(new Vec(1.23, 5.68))
	})
})

describe('Vec.Snap', () => {
	it('Snaps a vector to the nearest increment provided.', () => {
		expect(Vec.Snap(new Vec(10.5, 28), 10)).toMatchObject(new Vec(10, 30))
	})
})

describe('Vec.NearestPointOnLineThroughPoint', () => {
	it('Gets the distance from a point to a line that passes through a given point.', () => {
		expect(
			Vec.NearestPointOnLineThroughPoint(new Vec(0, 0), new Vec(0, 1), new Vec(5, 5))
		).toMatchObject(new Vec(0, 5))
	})
})

describe('Vec.DistanceToLineThroughPoint', () => {
	it('Gets the distance from a point to a line that passes through a given point.', () => {
		expect(Vec.DistanceToLineThroughPoint(new Vec(0, 0), new Vec(0, 1), new Vec(5, 5))).toEqual(5)
	})
})

describe('Vec.NearestPointOnLineSegment', () => {
	it('Gets the distance from a point to a line segment.', () => {
		expect(
			Vec.NearestPointOnLineSegment(new Vec(0, 0), new Vec(0, 10), new Vec(5, 5))
		).toMatchObject(new Vec(0, 5))
	})
})

describe('Vec.DistanceToLineSegment', () => {
	it('Gets the distance from a point to a line segment.', () => {
		expect(Vec.DistanceToLineSegment(new Vec(0, 0), new Vec(0, 10), new Vec(5, 5))).toEqual(5)
	})
})

describe('Vec.Nudge', () => {
	it('Pushes a point towards another point by a given distance.', () => {
		expect(Vec.Nudge(new Vec(0, 0), new Vec(0, 10), 5)).toMatchObject(new Vec(0, 5))
	})
})

// describe('Vec.NudgeAtVector', () => {
//   it('Pushes a point in a given direction vector by a given distance.', () => {
//     expect(Vec.NudgeAtVector(new Vec(0, 0), new Vec(0.5, 0.75), 10)).toEqual(
//       new Vec(5, 7.5)
//     )
//   })
// })

// describe('Vec.NudgeAtAngle', () => {
//   it('Pushes a point in a given angle by a given distance.', () => {
//     expect(Vec.NudgeAtAngle(new Vec(0, 0), Math.PI / 8, 10)).toEqual(
//       new Vec(9.238795325112868, 3.826834323650898)
//     )
//   })
// })

// describe('Vec.PointsBetween', () => {
//   it('Interpolates points between two points.', () => {
//     expect(Vec.PointsBetween(new Vec(0, 0), [100, 100], 10)).toMatchObject(new Vec2)(
//       new Vec(0, 0, 1),
//       new Vec(11.11111111111111, 11.11111111111111, 0.8888888888888888),
//       new Vec(22.22222222222222, 22.22222222222222, 0.7777777777777778),
//       new Vec(33.33333333333333, 33.33333333333333, 0.6666666666666667),
//       new Vec(44.44444444444444, 44.44444444444444, 0.5555555555555556),
//       new Vec(55.55555555555556, 55.55555555555556, 0.5555555555555556),
//       new Vec(66.66666666666666, 66.66666666666666, 0.6666666666666666),
//       new Vec(77.77777777777779, 77.77777777777779, 0.7777777777777778),
//       new Vec(88.88888888888889, 88.88888888888889, 0.8888888888888888),
//       new Vec(100, 100, 1),
//     ])
//   })
// })

describe('Vec.Slope', () => {
	it('Gets a slope from a vector.', () => {
		expect(Vec.Slope(new Vec(0, 0), new Vec(100, 100))).toEqual(1)
		expect(Vec.Slope(new Vec(0, 0), new Vec(50, 100))).toEqual(2)
		expect(Vec.Slope(new Vec(0, 0), new Vec(-50, 100))).toEqual(-2)
		expect(Vec.Slope(new Vec(123, 456), new Vec(789, 24))).toEqual(-0.6486486486486487)
		// A.x happened to equal B.y here, which used to trip the vertical guard
		expect(Vec.Slope(new Vec(1, 0), new Vec(0, 1))).toEqual(-1)
		expect(Vec.Slope(new Vec(5, 0), new Vec(5, 10))).toBeNaN()
	})
})

describe('Vec.cross', () => {
	it('Matches the static Vec.Cross.', () => {
		expect(Vec.Cross(new Vec(1, 2, 3), new Vec(4, 5, 6))).toMatchObject({ x: -3, y: 6 })
		expect(new Vec(1, 2, 3).cross(new Vec(4, 5, 6))).toMatchObject({ x: -3, y: 6 })
	})
})

describe('Vec.ToAngle', () => {
	it('Gets an angle from a vector.', () => {
		expect(Vec.ToAngle(new Vec(1, 0.5))).toEqual(0.4636476090008061)
	})
})

describe('Vec.Max', () => {
	it('Gets the minimum of the given vectors', () => {
		expect(Vec.Max(new Vec(4, 1), new Vec(3, 2))).toMatchObject(new Vec(4, 2))
		expect(Vec.Max(new Vec(3, 2), new Vec(4, 1))).toMatchObject(new Vec(4, 2))
	})
})

describe('Vec.Min', () => {
	it('Gets the minimum of the given vectors', () => {
		expect(Vec.Min(new Vec(4, 1), new Vec(3, 2))).toMatchObject(new Vec(3, 1))
		expect(Vec.Min(new Vec(3, 2), new Vec(4, 1))).toMatchObject(new Vec(3, 1))
	})
})

describe('Vec.snapToGrid', () => {
	it('snaps to the nearest given increment, mutating the original vector and returning it', () => {
		expect(new Vec(25, 29).snapToGrid(8)).toMatchObject(new Vec(24, 32))
		expect(new Vec(25, 29).snapToGrid(8)).toMatchObject(new Vec(24, 32))
		expect(new Vec(25, 29).snapToGrid(3)).toMatchObject(new Vec(24, 30))
		expect(new Vec(25, 29).snapToGrid(10)).toMatchObject(new Vec(30, 30))
		expect(new Vec(12, 49).snapToGrid(10)).toMatchObject(new Vec(10, 50))

		expect(Vec.SnapToGrid(new Vec(25, 29))).toMatchObject(new Vec(24, 32))
		expect(Vec.SnapToGrid(new Vec(25, 29), 8)).toMatchObject(new Vec(24, 32))
		expect(Vec.SnapToGrid(new Vec(25, 29), 3)).toMatchObject(new Vec(24, 30))
		expect(Vec.SnapToGrid(new Vec(25, 29), 10)).toMatchObject(new Vec(30, 30))
		expect(Vec.SnapToGrid(new Vec(12, 49), 10)).toMatchObject(new Vec(10, 50))
	})
})

describe('Vec.Average', () => {
	it('correctly calculates the average of an array of vectors', () => {
		const vecs = [new Vec(2, 4), new Vec(8, 16)]
		expect(Vec.Average(vecs)).toMatchObject(new Vec(5, 10))
	})

	it('returns a (0,0) vector when passing any empty array', () => {
		expect(Vec.Average([])).toMatchObject(new Vec(0, 0))
	})
})

describe('Vec instance mutators', () => {
	it('exposes z as pressure', () => {
		expect(new Vec(1, 2).pressure).toBe(1)
		expect(new Vec(1, 2, 0.5).pressure).toBe(0.5)
	})

	it('set defaults each component to its current value', () => {
		const v = new Vec(1, 2, 3)
		expect(v.set(4)).toBe(v)
		expect(v).toEqual(new Vec(4, 2, 3))
		expect(v.set(undefined, 5)).toEqual(new Vec(4, 5, 3))
		expect(v.set(7, 8, 9)).toEqual(new Vec(7, 8, 9))
	})

	it('setTo copies a model and resets z to 1 when the model has none', () => {
		const v = new Vec(1, 2, 0.5)
		expect(v.setTo({ x: 3, y: 4 })).toBe(v)
		expect(v).toEqual(new Vec(3, 4, 1))
		expect(v.setTo({ x: 5, y: 6, z: 0.25 })).toEqual(new Vec(5, 6, 0.25))
	})

	it('rot rotates in place and short-circuits on zero', () => {
		const v = new Vec(1, 0)
		expect(v.rot(0)).toBe(v)
		expect(v).toEqual(new Vec(1, 0))
		v.rot(Math.PI / 2)
		expect(v.x).toBeCloseTo(0, 10)
		expect(v.y).toBeCloseTo(1, 10)
	})

	it('rotWith rotates in place around a center', () => {
		const v = new Vec(20, 10)
		expect(v.rotWith({ x: 10, y: 10 }, 0)).toBe(v)
		v.rotWith({ x: 10, y: 10 }, Math.PI)
		expect(v.x).toBeCloseTo(0, 10)
		expect(v.y).toBeCloseTo(10, 10)
	})

	it('clone returns a separate instance with the same z', () => {
		const v = new Vec(1, 2, 0.3)
		const c = v.clone()
		expect(c).not.toBe(v)
		expect(c).toEqual(new Vec(1, 2, 0.3))
	})

	it('add, addXY and addScalar mutate and return the vector', () => {
		const v = new Vec(1, 2)
		expect(v.add({ x: 10, y: 20 })).toBe(v)
		expect(v).toMatchObject({ x: 11, y: 22 })
		expect(v.addXY(1, 2)).toMatchObject({ x: 12, y: 24 })
		expect(v.addScalar(-2)).toMatchObject({ x: 10, y: 22 })
	})

	it('sub, subXY and subScalar mutate and return the vector', () => {
		const v = new Vec(10, 20)
		expect(v.sub({ x: 1, y: 2 })).toBe(v)
		expect(v).toMatchObject({ x: 9, y: 18 })
		expect(v.subXY(4, 8)).toMatchObject({ x: 5, y: 10 })
		expect(v.subScalar(5)).toMatchObject({ x: 0, y: 5 })
	})

	it('clamp limits each component', () => {
		expect(new Vec(-5, 50).clamp(0)).toMatchObject({ x: 0, y: 50 })
		expect(new Vec(-5, 50).clamp(0, 10)).toMatchObject({ x: 0, y: 10 })
		expect(new Vec(5, 5).clamp(0, 10)).toMatchObject({ x: 5, y: 5 })
	})

	it('div, divV, mul and mulV mutate and return the vector', () => {
		const v = new Vec(8, 12)
		expect(v.div(4)).toBe(v)
		expect(v).toMatchObject({ x: 2, y: 3 })
		expect(v.divV({ x: 2, y: 3 })).toMatchObject({ x: 1, y: 1 })
		expect(v.mul(5)).toMatchObject({ x: 5, y: 5 })
		expect(v.mulV({ x: 2, y: -3 })).toMatchObject({ x: 10, y: -15 })
	})

	it('abs and neg flip signs in place', () => {
		expect(new Vec(-1, 2).abs()).toMatchObject({ x: 1, y: 2 })
		expect(new Vec(-1, 2).neg()).toMatchObject({ x: 1, y: -2 })
	})

	it('nudge pushes toward another point by a distance', () => {
		expect(new Vec(0, 0).nudge({ x: 0, y: 10 }, 5)).toMatchObject({ x: 0, y: 5 })
		expect(new Vec(10, 10).nudge({ x: 0, y: 10 }, 4)).toMatchObject({ x: 6, y: 10 })
	})

	it('per rotates a quarter turn in place', () => {
		expect(new Vec(1, -1).per()).toMatchObject({ x: -1, y: -1 })
		expect(new Vec(0, 5).per()).toMatchObject({ x: 5, y: -0 })
	})

	it('uni normalizes in place and leaves the zero vector alone', () => {
		expect(new Vec(0, 10).uni()).toMatchObject({ x: 0, y: 1 })
		expect(new Vec(3, 4).uni()).toMatchObject({ x: 0.6, y: 0.8 })
		expect(new Vec(0, 0).uni()).toMatchObject({ x: 0, y: 0 })
	})

	it('tan becomes the unit direction from another point', () => {
		expect(new Vec(0, 0).tan({ x: 0, y: 10 })).toMatchObject({ x: 0, y: -1 })
		expect(new Vec(3, 4).tan({ x: 0, y: 0 })).toMatchObject({ x: 0.6, y: 0.8 })
	})

	it('lrp interpolates toward another point in place', () => {
		const v = new Vec(0, 0)
		expect(v.lrp({ x: 10, y: 20 }, 0.5)).toBe(v)
		expect(v).toMatchObject({ x: 5, y: 10 })
	})

	it('toFixed rounds in place to two decimals', () => {
		const v = new Vec(1.2345, 5.678)
		expect(v.toFixed()).toBe(v)
		expect(v).toMatchObject({ x: 1.23, y: 5.68 })
	})
})

describe('Vec instance queries', () => {
	it('mirror their static counterparts', () => {
		const a = new Vec(10, 10)
		expect(a.dpr({ x: 1, y: 0 })).toBe(10)
		expect(a.cpr({ x: 0, y: 1 })).toBe(10)
		expect(a.len2()).toBe(200)
		expect(a.len()).toBeCloseTo(Math.sqrt(200), 10)
		expect(a.pry({ x: 0, y: 10 })).toBe(10)
		expect(a.dist({ x: 10, y: 0 })).toBe(10)
		expect(new Vec(5, 5).distanceToLineSegment({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(5)
		expect(new Vec(0, 0).slope({ x: 50, y: 100 })).toBe(2)
		expect(new Vec(0, 0).angle({ x: 0, y: 10 })).toBe(Math.PI / 2)
		expect(new Vec(0, -1).toAngle()).toBeCloseTo((3 * Math.PI) / 2, 10)
		expect(a.equals({ x: 10.00001, y: 10 })).toBe(true)
		expect(a.equalsXY(10, 10)).toBe(true)
		expect(a.equalsXY(10.00001, 10)).toBe(false)
	})

	it('serializes without mutating', () => {
		const v = new Vec(1.234, 5.678, 0.5)
		expect(v.toString()).toBe('1.23, 5.68')
		expect(v).toMatchObject({ x: 1.234, y: 5.678 })
		expect(v.toJson()).toEqual({ x: 1.234, y: 5.678, z: 0.5 })
		expect(v.toArray()).toEqual([1.234, 5.678, 0.5])
	})
})

describe('Vec static constructors and conversions', () => {
	it('From defaults z to 1 and FromArray reads x and y', () => {
		expect(Vec.From({ x: 1, y: 2 })).toEqual(new Vec(1, 2, 1))
		expect(Vec.From({ x: 1, y: 2, z: 0.3 })).toEqual(new Vec(1, 2, 0.3))
		expect(Vec.FromArray([3, 4])).toEqual(new Vec(3, 4, 1))
	})

	it('Cast returns the same instance for a Vec and wraps a model', () => {
		const v = new Vec(1, 2)
		expect(Vec.Cast(v)).toBe(v)
		const model = { x: 1, y: 2 }
		const cast = Vec.Cast(model)
		expect(cast).toBeInstanceOf(Vec)
		expect(cast).toEqual(new Vec(1, 2, 1))
	})

	it('FromAngle builds a vector of the given length', () => {
		expect(Vec.FromAngle(0)).toMatchObject({ x: 1, y: 0 })
		const up = Vec.FromAngle(Math.PI / 2, 10)
		expect(up.x).toBeCloseTo(0, 10)
		expect(up.y).toBeCloseTo(10, 10)
	})

	it('ToInt rounds each component and treats a missing z as 0', () => {
		expect(Vec.ToInt(new Vec(1.6, 2.4, 0.7))).toEqual(new Vec(2, 2, 1))
		expect(Vec.ToInt({ x: -1.6, y: 2.4 })).toEqual(new Vec(-2, 2, 0))
	})

	it('ToCss, ToString, ToArray and ToJson format a model', () => {
		expect(Vec.ToCss({ x: 1.5, y: 2 })).toBe('1.5,2')
		expect(Vec.ToString({ x: 1.5, y: 2 })).toBe('1.5, 2')
		expect(Vec.ToArray(new Vec(1, 2, 0.5))).toEqual([1, 2, 0.5])
		expect(Vec.ToJson(new Vec(1, 2, 0.5))).toEqual({ x: 1, y: 2, z: 0.5 })
		expect(Vec.ToJson({ x: 1, y: 2 })).toEqual({ x: 1, y: 2, z: undefined })
	})

	it('IsNaN and IsFinite inspect x and y only', () => {
		expect(Vec.IsNaN(new Vec(NaN, 0))).toBe(true)
		expect(Vec.IsNaN(new Vec(0, NaN))).toBe(true)
		expect(Vec.IsNaN(new Vec(0, 0, NaN))).toBe(false)
		expect(Vec.IsFinite(new Vec(1, 2))).toBe(true)
		expect(Vec.IsFinite(new Vec(Infinity, 2))).toBe(false)
		expect(Vec.IsFinite(new Vec(1, NaN))).toBe(false)
	})
})

describe('Vec static arithmetic', () => {
	it('AddXY and SubXY offset by raw coordinates', () => {
		expect(Vec.AddXY({ x: 1, y: 2 }, 3, 4)).toMatchObject({ x: 4, y: 6 })
		expect(Vec.SubXY({ x: 1, y: 2 }, 3, 4)).toMatchObject({ x: -2, y: -2 })
	})

	it('Abs takes the absolute value of each component', () => {
		expect(Vec.Abs({ x: -1, y: 2 })).toMatchObject({ x: 1, y: 2 })
		expect(Vec.Abs({ x: -1, y: -2 })).toMatchObject({ x: 1, y: 2 })
	})

	it('Rot defaults to no rotation', () => {
		expect(Vec.Rot({ x: 3, y: 4 })).toMatchObject({ x: 3, y: 4 })
		const r = Vec.Rot({ x: 1, y: 0 }, Math.PI)
		expect(r.x).toBeCloseTo(-1, 10)
		expect(r.y).toBeCloseTo(0, 10)
	})

	it('Lrp returns the endpoints at t=0 and t=1 and ignores z', () => {
		expect(Vec.Lrp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0)).toEqual(new Vec(0, 0, 1))
		expect(Vec.Lrp({ x: 0, y: 0 }, { x: 10, y: 20 }, 1)).toEqual(new Vec(10, 20, 1))
		expect(Vec.Lrp(new Vec(0, 0, 0.2), new Vec(10, 20, 0.8), 0.25)).toEqual(new Vec(2.5, 5, 1))
	})

	it('ScaleWithOrigin scales relative to a point', () => {
		expect(Vec.ScaleWithOrigin({ x: 10, y: 10 }, 2, { x: 5, y: 5 })).toMatchObject({
			x: 15,
			y: 15,
		})
		expect(Vec.ScaleWithOrigin({ x: 5, y: 5 }, 3, { x: 5, y: 5 })).toMatchObject({ x: 5, y: 5 })
	})

	it('EqualsXY is exact while Equals tolerates tiny differences', () => {
		expect(Vec.EqualsXY({ x: 1, y: 2 }, 1, 2)).toBe(true)
		expect(Vec.EqualsXY({ x: 1.00001, y: 2 }, 1, 2)).toBe(false)
		expect(Vec.Equals({ x: 1.00001, y: 2 }, { x: 1, y: 2 })).toBe(true)
		expect(Vec.Equals({ x: 1.001, y: 2 }, { x: 1, y: 2 })).toBe(false)
	})

	it('Average sums every vector then divides', () => {
		expect(Vec.Average([new Vec(0, 0), new Vec(3, 6), new Vec(6, 0)])).toMatchObject({
			x: 3,
			y: 2,
		})
		expect(Vec.Average([{ x: -4, y: 4 }])).toMatchObject({ x: -4, y: 4 })
	})
})

describe('Vec distances and angles', () => {
	it('ManhattanDist sums the axis distances', () => {
		expect(Vec.ManhattanDist({ x: 0, y: 0 }, { x: 3, y: -4 })).toBe(7)
		expect(Vec.ManhattanDist({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0)
	})

	it('DistMin is a strict less-than check on the distance', () => {
		expect(Vec.DistMin({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(false)
		expect(Vec.DistMin({ x: 0, y: 0 }, { x: 3, y: 4 }, 5.1)).toBe(true)
		expect(Vec.DistMin({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false)
	})

	it('AngleBetween returns a signed angle between two vectors', () => {
		expect(Vec.AngleBetween({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2, 10)
		expect(Vec.AngleBetween({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(-Math.PI / 2, 10)
		expect(Vec.AngleBetween({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(0)
		expect(Vec.AngleBetween({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(Math.PI, 10)
	})

	it('AngleBetween clamps rounding noise so parallel vectors never produce NaN', () => {
		const result = Vec.AngleBetween({ x: 0.1, y: 0.2 }, { x: 0.1, y: 0.2 })
		expect(result).not.toBeNaN()
		expect(result).toBeCloseTo(0, 10)
	})

	it('ToAngle maps negative angles into [0, 2PI)', () => {
		expect(Vec.ToAngle({ x: 1, y: 0 })).toBe(0)
		expect(Vec.ToAngle({ x: 0, y: 1 })).toBeCloseTo(Math.PI / 2, 10)
		expect(Vec.ToAngle({ x: 0, y: -1 })).toBeCloseTo((3 * Math.PI) / 2, 10)
		expect(Vec.ToAngle({ x: -1, y: 0 })).toBeCloseTo(Math.PI, 10)
	})

	it('Clockwise is false for collinear points', () => {
		expect(Vec.Clockwise({ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 })).toBe(false)
	})
})

describe('Vec line segment helpers', () => {
	const A = { x: 0, y: 0 }
	const B = { x: 10, y: 0 }
	const beyond = { x: 15, y: 5 }
	const before = { x: -5, y: 5 }

	it('NearestPointOnLineSegment clamps to the segment by default', () => {
		expect(Vec.NearestPointOnLineSegment(A, B, beyond)).toMatchObject({ x: 10, y: 0 })
		expect(Vec.NearestPointOnLineSegment(A, B, before)).toMatchObject({ x: 0, y: 0 })
		expect(Vec.NearestPointOnLineSegment(A, B, { x: 4, y: 7 })).toMatchObject({ x: 4, y: 0 })
	})

	it('NearestPointOnLineSegment can project onto the infinite line', () => {
		expect(Vec.NearestPointOnLineSegment(A, B, beyond, false)).toMatchObject({ x: 15, y: 0 })
		expect(Vec.NearestPointOnLineSegment(A, B, before, false)).toMatchObject({ x: -5, y: 0 })
	})

	it('NearestPointOnLineSegment returns the start for a zero-length segment', () => {
		const P = { x: 3, y: 3 }
		expect(Vec.NearestPointOnLineSegment(P, P, { x: 10, y: 10 })).toEqual(new Vec(3, 3, 1))
	})

	it('DistanceToLineSegment clamps by default and projects when asked', () => {
		expect(Vec.DistanceToLineSegment(A, B, beyond)).toBeCloseTo(Math.sqrt(50), 10)
		expect(Vec.DistanceToLineSegment(A, B, beyond, false)).toBe(5)
		expect(Vec.DistanceToLineSegment(A, B, before)).toBeCloseTo(Math.sqrt(50), 10)
		expect(Vec.DistanceToLineSegment(A, B, before, false)).toBe(5)
	})

	it('DistanceToLineSegment falls back to point distance for a zero-length segment', () => {
		const P = { x: 3, y: 3 }
		expect(Vec.DistanceToLineSegment(P, P, { x: 0, y: 0 })).toBeCloseTo(Math.sqrt(18), 10)
	})

	it('DistanceToLineThroughPoint is symmetric about the line', () => {
		const u = { x: 1, y: 0 }
		expect(Vec.DistanceToLineThroughPoint(A, u, { x: 7, y: 3 })).toBe(3)
		expect(Vec.DistanceToLineThroughPoint(A, u, { x: 7, y: -3 })).toBe(3)
	})
})

describe('Vec.PointsBetween', () => {
	it('eases position and simulates pressure between two points', () => {
		const points = Vec.PointsBetween({ x: 0, y: 0 }, { x: 100, y: 100 }, 3)
		expect(points).toEqual([
			new Vec(0, 0, 0.825),
			new Vec(25, 25, 0.74375),
			new Vec(100, 100, 0.825),
		])
	})

	it('defaults to six steps', () => {
		const points = Vec.PointsBetween({ x: 0, y: 0 }, { x: 10, y: 0 })
		expect(points).toHaveLength(6)
		expect(points[0]).toMatchObject({ x: 0, y: 0 })
		expect(points[5]).toMatchObject({ x: 10, y: 0 })
	})

	it('accepts a custom easing for the spacing', () => {
		const points = Vec.PointsBetween({ x: 0, y: 0 }, { x: 100, y: 0 }, 5, (t) => t)
		expect(points.map((p) => p.x)).toEqual([0, 25, 50, 75, 100])
	})
})
