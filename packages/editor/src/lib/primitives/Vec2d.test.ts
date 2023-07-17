import { Vec2d } from './Vec2d'

describe('iteratable', () => {
	it('Constructs', () => {
		const v = new Vec2d(1, 2)
		const { x, y } = v
		expect(x).toBeCloseTo(1)
		expect(y).toBeCloseTo(2)
	})
})

describe('Vec2d.Clamp', () => {
	it('Clamps a vector between a range.', () => {
		expect(Vec2d.Clamp(new Vec2d(9, 5), 7, 10)).toMatchObject(new Vec2d(9, 7))
		expect(Vec2d.Clamp(new Vec2d(-9, 5), 0, 10)).toMatchObject(new Vec2d(0, 5))
	})
})

describe('Vec2d.Clamp', () => {
	it('Clamps a vector between a range.', () => {
		expect(Vec2d.Clamp(new Vec2d(9, 5), 7, 10)).toMatchObject(new Vec2d(9, 7))
		expect(Vec2d.Clamp(new Vec2d(-9, 5), 0, 10)).toMatchObject(new Vec2d(0, 5))
	})
	it('Clamps a vector between a range.', () => {
		expect(Vec2d.Clamp(new Vec2d(9, 5), 10)).toMatchObject(new Vec2d(10, 10))
		expect(Vec2d.Clamp(new Vec2d(-9, 5), 10)).toMatchObject(new Vec2d(10, 10))
	})
})

describe('Vec2d.Neg', () => {
	it('Negates a vector.', () => {
		expect(Vec2d.Neg(new Vec2d(9, 5))).toMatchObject(new Vec2d(-9, -5))
		expect(Vec2d.Neg(new Vec2d(-9, 0))).toMatchObject(new Vec2d(9, -0))
	})
})

describe('Vec2d.Add', () => {
	it('Adds two vectors.', () => {
		expect(Vec2d.Add(new Vec2d(9, 5), new Vec2d(2, 1))).toMatchObject(new Vec2d(11, 6))
		expect(Vec2d.Add(new Vec2d(-9, 5), new Vec2d(2, -1))).toMatchObject(new Vec2d(-7, 4))
	})
})

describe('Vec2d.AddScalar', () => {
	it('Adds a scalar to a vector.', () => {
		expect(Vec2d.AddScalar(new Vec2d(9, 5), 2)).toMatchObject(new Vec2d(11, 7))
		expect(Vec2d.AddScalar(new Vec2d(-9, 5), 2)).toMatchObject(new Vec2d(-7, 7))
	})
})

describe('Vec2d.Sub', () => {
	it('Subtracts two vectors.', () => {
		expect(Vec2d.Sub(new Vec2d(9, 5), new Vec2d(2, 1))).toMatchObject(new Vec2d(7, 4))
		expect(Vec2d.Sub(new Vec2d(-9, 5), new Vec2d(2, -1))).toMatchObject(new Vec2d(-11, 6))
	})
})

describe('Vec2d.SubScalar', () => {
	it('Subtracts a scalar from a vector.', () => {
		expect(Vec2d.SubScalar(new Vec2d(9, 5), 2)).toMatchObject(new Vec2d(7, 3))
		expect(Vec2d.SubScalar(new Vec2d(-9, 5), 2)).toMatchObject(new Vec2d(-11, 3))
	})
})

describe('Vec2d.Mul', () => {
	it('Get a vector multiplied by a scalar.', () => {
		expect(Vec2d.Mul(new Vec2d(9, 9), 3)).toMatchObject(new Vec2d(27, 27))
		expect(Vec2d.Mul(new Vec2d(10, 10), 2)).toMatchObject(new Vec2d(20, 20))
	})
})

describe('Vec2d.DivV', () => {
	it('Get a vector multiplied by a vector.', () => {
		expect(Vec2d.MulV(new Vec2d(16, 12), new Vec2d(2, 4))).toMatchObject(new Vec2d(32, 48))
		expect(Vec2d.MulV(new Vec2d(5, 15), new Vec2d(5, 3))).toMatchObject(new Vec2d(25, 45))
	})
})

describe('Vec2d.Div', () => {
	it('Get a vector divided by a scalar.', () => {
		expect(Vec2d.Div(new Vec2d(9, 9), 3)).toMatchObject(new Vec2d(3, 3))
		expect(Vec2d.Div(new Vec2d(10, 10), 2)).toMatchObject(new Vec2d(5, 5))
	})
})

describe('Vec2d.DivV', () => {
	it('Get a vector divided by a vector.', () => {
		expect(Vec2d.DivV(new Vec2d(16, 12), new Vec2d(2, 4))).toMatchObject(new Vec2d(8, 3))
		expect(Vec2d.DivV(new Vec2d(5, 15), new Vec2d(5, 3))).toMatchObject(new Vec2d(1, 5))
	})
})

describe('Vec2d.Per', () => {
	it('Gets the perpendicular rotation of a vector.', () => {
		expect(Vec2d.Per(new Vec2d(1, -1))).toMatchObject(new Vec2d(-1, -1))
		expect(Vec2d.Per(new Vec2d(-1, 1))).toMatchObject(new Vec2d(1, 1))
	})
})

describe('Vec2d.Dpr', () => {
	it('Gets the dot product of two vectors.', () => {
		expect(Vec2d.Dpr(new Vec2d(1, 0), new Vec2d(1, 0))).toEqual(1)
		expect(Vec2d.Dpr(new Vec2d(1, 0), new Vec2d(0, 0))).toEqual(0)
		expect(Vec2d.Dpr(new Vec2d(1, 0), new Vec2d(-1, 0))).toEqual(-1)
	})
})

describe('Vec2d.Cpr', () => {
	it('Gets the cross product (outer product) of two vectors.', () => {
		expect(Vec2d.Cpr(new Vec2d(0, 1), new Vec2d(1, 1))).toEqual(-1)
		expect(Vec2d.Cpr(new Vec2d(1, 1), new Vec2d(1, 1))).toEqual(0)
		expect(Vec2d.Cpr(new Vec2d(1, 1), new Vec2d(0, 1))).toEqual(1)
	})
})

describe('Vec2d.Len2', () => {
	it('Gets the length of a vector squared.', () => {
		expect(Vec2d.Len2(new Vec2d(0, 0))).toEqual(0)
		expect(Vec2d.Len2(new Vec2d(0, 1))).toEqual(1)
		expect(Vec2d.Len2(new Vec2d(1, 1))).toEqual(2)
	})
})

describe('Vec2d.Len', () => {
	it('Gets the length of a vector.', () => {
		expect(Vec2d.Len(new Vec2d(0, 0))).toEqual(0)
		expect(Vec2d.Len(new Vec2d(0, 1))).toEqual(1)
		expect(Vec2d.Len(new Vec2d(1, 1))).toEqual(1.4142135623730951)
	})
})

describe('Vec2d.Pry', () => {
	it('Projects a vector A over vector B.', () => {
		expect(Vec2d.Pry(new Vec2d(0, 0), new Vec2d(0, 10))).toEqual(0)
		expect(Vec2d.Pry(new Vec2d(0, 0), new Vec2d(10, 10))).toEqual(0)
		expect(Vec2d.Pry(new Vec2d(10, 10), new Vec2d(0, 10))).toEqual(10)
		expect(Vec2d.Pry(new Vec2d(10, 10), new Vec2d(10, 10))).toEqual(14.14213562373095)
	})
})

describe('Vec2d.Uni', () => {
	it('Gets the normalized vector.', () => {
		expect(Vec2d.Uni(new Vec2d(0, 10))).toMatchObject(new Vec2d(0, 1))
		expect(Vec2d.Uni(new Vec2d(10, 10))).toMatchObject(
			new Vec2d(0.7071067811865475, 0.7071067811865475)
		)
	})
})

describe('Vec2d.Tan', () => {
	it('Gets the tangent between two vectors.', () => {
		expect(Vec2d.Tan(new Vec2d(0, 0), new Vec2d(0, 10))).toMatchObject(new Vec2d(0, -1))
		expect(Vec2d.Tan(new Vec2d(0, 0), new Vec2d(10, 10))).toMatchObject(
			new Vec2d(-0.7071067811865475, -0.7071067811865475)
		)
	})
})

describe('Vec2d.Dist2', () => {
	it('Finds the squared distance between two points.', () => {
		expect(Vec2d.Dist2(new Vec2d(0, 0), new Vec2d(0, 10))).toEqual(100)
		expect(Vec2d.Dist2(new Vec2d(0, 0), new Vec2d(10, 10))).toEqual(200)
	})
})

describe('Vec2d.Dist', () => {
	it('Finds the distance between two points.', () => {
		expect(Vec2d.Dist(new Vec2d(0, 0), new Vec2d(0, 10))).toEqual(10)
		expect(Vec2d.Dist(new Vec2d(0, 0), new Vec2d(10, 10))).toEqual(14.142135623730951)
	})
})

// describe('Vec2d.Ang2', () => {
//   it('Finds the angle in radians between two vectors.', () => {
//     expect(Vec2d.Ang2(new Vec2d(1, 0), new Vec2d(0, 1))).toEqual(Math.PI / 2)
//   })
// })

// describe('Vec2d.Ang3', () => {
//   it('Gets the angle of ∠ABC', () => {
//     expect(Vec2d.Ang3([5, 0], new Vec2d(0, 0), new Vec2d(0, 5))).toEqual(Math.PI / 2)
//     expect(Vec2d.Ang3(new Vec2d(1, 0), new Vec2d(0, 0), new Vec2d(0, 1))).toEqual(Math.PI / 2)
//   })
// })

describe('Vec2d.Angle', () => {
	it('Finds the angle in radians between two points.', () => {
		expect(Vec2d.Angle(new Vec2d(0, 0), new Vec2d(10, 10))).toEqual(Math.PI / 4)
		expect(Vec2d.Angle(new Vec2d(0, 0), new Vec2d(10, 0))).toEqual(0)
		expect(Vec2d.Angle(new Vec2d(0, 0), new Vec2d(0, 10))).toEqual(Math.PI / 2)
	})
})

describe('Vec2d.Med', () => {
	it('Finds the midpoint between two vectors.', () => {
		expect(Vec2d.Med(new Vec2d(0, 0), new Vec2d(10, 10))).toMatchObject(new Vec2d(5, 5))
		expect(Vec2d.Med(new Vec2d(0, 0), new Vec2d(10, 0))).toMatchObject(new Vec2d(5, 0))
		expect(Vec2d.Med(new Vec2d(0, 0), new Vec2d(0, 10))).toMatchObject(new Vec2d(0, 5))
		expect(Vec2d.Med(new Vec2d(-100, 0), new Vec2d(0, 100))).toMatchObject(new Vec2d(-50, 50))
	})
})

describe('Vec2d.Rot', () => {
	it('Rotates a vector by a rotation in radians.', () => {
		const { x, y } = Vec2d.Rot(new Vec2d(1, 0), Math.PI / 4)
		expect(x).toBeCloseTo(0.7, 1)
		expect(y).toBeCloseTo(0.7, 1)
	})
})

describe('Vec2d.RotWith', () => {
	it('Rotates a vector around a second vector by a rotation in radians.', () => {
		expect(Vec2d.RotWith(new Vec2d(1, 0), new Vec2d(0, 0), Math.PI / 4)).toMatchObject(
			new Vec2d(0.7071067811865476, 0.7071067811865475)
		)
	})
})

describe('Vec2d.Equals', () => {
	it('Gets whether two vectors are identical.', () => {
		expect(Vec2d.Equals(new Vec2d(1, 2), new Vec2d(1, 2))).toEqual(true)
		expect(Vec2d.Equals(new Vec2d(1, 2), new Vec2d(1, 3))).toEqual(false)
		expect(Vec2d.Equals(new Vec2d(-0, 2), new Vec2d(0, 2))).toEqual(true)
	})
})

describe('Vec2d.Int', () => {
	it('Interpolate from A to B', () => {
		expect(Vec2d.Lrp(new Vec2d(0, 0), new Vec2d(10, 10), 0.5)).toMatchObject(new Vec2d(5, 5))
		expect(Vec2d.Lrp(new Vec2d(0, 0), new Vec2d(10, 10), 2)).toMatchObject(new Vec2d(20, 20))
	})
})

describe('Vec2d.Rescale', () => {
	it('Rescales a vector by a scalar', () => {
		expect(Vec2d.Rescale(new Vec2d(5, 0), 1)).toMatchObject(new Vec2d(1, 0))
		expect(Vec2d.Rescale(new Vec2d(5, 0), 2)).toMatchObject(new Vec2d(2, 0))
		expect(Vec2d.Rescale(new Vec2d(0.5, 0.25), 2)).toEqual(
			new Vec2d(1.7888543819998317, 0.8944271909999159)
		)
	})
})

describe('Vec2d.IsClockwise', () => {
	it('Gets whether point A and point B wind clockwise around point C.', () => {
		expect(Vec2d.Clockwise(new Vec2d(0, 0), new Vec2d(5, 5), new Vec2d(0, 5))).toEqual(true)
		expect(Vec2d.Clockwise(new Vec2d(5, 5), new Vec2d(0, 0), new Vec2d(0, 5))).toEqual(false)
		expect(Vec2d.Clockwise(new Vec2d(0, 10), new Vec2d(0, 0), new Vec2d(0, 5))).toEqual(false)
	})
})

describe('Vec2d.ToFixed', () => {
	it('Rounds a vector to the a given precision.', () => {
		expect(Vec2d.ToFixed(new Vec2d(1.2345, 5.678), 1)).toMatchObject(new Vec2d(1.2, 5.7))
		expect(Vec2d.ToFixed(new Vec2d(1.2345, 5.678), 2)).toMatchObject(new Vec2d(1.23, 5.68))
	})
})

describe('Vec2d.Snap', () => {
	it('Snaps a vector to the nearest increment provided.', () => {
		expect(Vec2d.Snap(new Vec2d(10.5, 28), 10)).toMatchObject(new Vec2d(10, 30))
	})
})

describe('Vec2d.NearestPointOnLineThroughPoint', () => {
	it('Gets the distance from a point to a line that passes through a given point.', () => {
		expect(
			Vec2d.NearestPointOnLineThroughPoint(new Vec2d(0, 0), new Vec2d(0, 1), new Vec2d(5, 5))
		).toMatchObject(new Vec2d(0, 5))
	})
})

describe('Vec2d.DistanceToLineThroughPoint', () => {
	it('Gets the distance from a point to a line that passes through a given point.', () => {
		expect(
			Vec2d.DistanceToLineThroughPoint(new Vec2d(0, 0), new Vec2d(0, 1), new Vec2d(5, 5))
		).toEqual(5)
	})
})

describe('Vec2d.NearestPointOnLineSegment', () => {
	it('Gets the distance from a point to a line segment.', () => {
		expect(
			Vec2d.NearestPointOnLineSegment(new Vec2d(0, 0), new Vec2d(0, 10), new Vec2d(5, 5))
		).toMatchObject(new Vec2d(0, 5))
	})
})

describe('Vec2d.DistanceToLineSegment', () => {
	it('Gets the distance from a point to a line segment.', () => {
		expect(Vec2d.DistanceToLineSegment(new Vec2d(0, 0), new Vec2d(0, 10), new Vec2d(5, 5))).toEqual(
			5
		)
	})
})

describe('Vec2d.Nudge', () => {
	it('Pushes a point towards another point by a given distance.', () => {
		expect(Vec2d.Nudge(new Vec2d(0, 0), new Vec2d(0, 10), 5)).toMatchObject(new Vec2d(0, 5))
	})
})

// describe('Vec2d.NudgeAtVector', () => {
//   it('Pushes a point in a given direction vector by a given distance.', () => {
//     expect(Vec2d.NudgeAtVector(new Vec2d(0, 0), new Vec2d(0.5, 0.75), 10)).toEqual(
//       new Vec2d(5, 7.5)
//     )
//   })
// })

// describe('Vec2d.NudgeAtAngle', () => {
//   it('Pushes a point in a given angle by a given distance.', () => {
//     expect(Vec2d.NudgeAtAngle(new Vec2d(0, 0), Math.PI / 8, 10)).toEqual(
//       new Vec2d(9.238795325112868, 3.826834323650898)
//     )
//   })
// })

// describe('Vec2d.PointsBetween', () => {
//   it('Interpolates points between two points.', () => {
//     expect(Vec2d.PointsBetween(new Vec2d(0, 0), [100, 100], 10)).toMatchObject(new Vec2)(
//       new Vec2d(0, 0, 1),
//       new Vec2d(11.11111111111111, 11.11111111111111, 0.8888888888888888),
//       new Vec2d(22.22222222222222, 22.22222222222222, 0.7777777777777778),
//       new Vec2d(33.33333333333333, 33.33333333333333, 0.6666666666666667),
//       new Vec2d(44.44444444444444, 44.44444444444444, 0.5555555555555556),
//       new Vec2d(55.55555555555556, 55.55555555555556, 0.5555555555555556),
//       new Vec2d(66.66666666666666, 66.66666666666666, 0.6666666666666666),
//       new Vec2d(77.77777777777779, 77.77777777777779, 0.7777777777777778),
//       new Vec2d(88.88888888888889, 88.88888888888889, 0.8888888888888888),
//       new Vec2d(100, 100, 1),
//     ])
//   })
// })

describe('Vec2d.Slope', () => {
	it('Gets a slope from a vector.', () => {
		expect(Vec2d.Slope(new Vec2d(0, 0), new Vec2d(100, 100))).toEqual(1)
		expect(Vec2d.Slope(new Vec2d(0, 0), new Vec2d(50, 100))).toEqual(2)
		expect(Vec2d.Slope(new Vec2d(0, 0), new Vec2d(-50, 100))).toEqual(-2)
		expect(Vec2d.Slope(new Vec2d(123, 456), new Vec2d(789, 24))).toEqual(-0.6486486486486487)
	})
})

describe('Vec2d.ToAngle', () => {
	it('Gets an angle from a vector.', () => {
		expect(Vec2d.ToAngle(new Vec2d(1, 0.5))).toEqual(0.4636476090008061)
	})
})

describe('Vec2d.Max', () => {
	it('Gets the minimum of the given vectors', () => {
		expect(Vec2d.Max(new Vec2d(4, 1), new Vec2d(3, 2))).toMatchObject(new Vec2d(4, 2))
		expect(Vec2d.Max(new Vec2d(3, 2), new Vec2d(4, 1))).toMatchObject(new Vec2d(4, 2))
	})
})

describe('Vec2d.Min', () => {
	it('Gets the minimum of the given vectors', () => {
		expect(Vec2d.Min(new Vec2d(4, 1), new Vec2d(3, 2))).toMatchObject(new Vec2d(3, 1))
		expect(Vec2d.Min(new Vec2d(3, 2), new Vec2d(4, 1))).toMatchObject(new Vec2d(3, 1))
	})
})

describe('Vec2d.snapToGrid', () => {
	it('snaps to the nearest given increment, mutating the original vector and returning it', () => {
		expect(new Vec2d(25, 29).snapToGrid(8)).toMatchObject(new Vec2d(24, 32))
		expect(new Vec2d(25, 29).snapToGrid(8)).toMatchObject(new Vec2d(24, 32))
		expect(new Vec2d(25, 29).snapToGrid(3)).toMatchObject(new Vec2d(24, 30))
		expect(new Vec2d(25, 29).snapToGrid(10)).toMatchObject(new Vec2d(30, 30))
		expect(new Vec2d(12, 49).snapToGrid(10)).toMatchObject(new Vec2d(10, 50))

		expect(Vec2d.SnapToGrid(new Vec2d(25, 29))).toMatchObject(new Vec2d(24, 32))
		expect(Vec2d.SnapToGrid(new Vec2d(25, 29), 8)).toMatchObject(new Vec2d(24, 32))
		expect(Vec2d.SnapToGrid(new Vec2d(25, 29), 3)).toMatchObject(new Vec2d(24, 30))
		expect(Vec2d.SnapToGrid(new Vec2d(25, 29), 10)).toMatchObject(new Vec2d(30, 30))
		expect(Vec2d.SnapToGrid(new Vec2d(12, 49), 10)).toMatchObject(new Vec2d(10, 50))
	})
})
