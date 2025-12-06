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
