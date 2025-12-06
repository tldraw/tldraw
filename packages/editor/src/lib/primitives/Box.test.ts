import { Box } from './Box'
import { Vec } from './Vec'

describe('Box', () => {
	let box: Box

	beforeEach(() => {
		box = new Box(10, 20, 100, 200)
	})

	it('Creates a box', () => {
		const newBox = new Box(0, 0, 100, 100)
		expect(newBox).toMatchObject({
			x: 0,
			y: 0,
			w: 100,
			h: 100,
		})
	})

	describe('Box.point', () => {
		it('gets the point as a Vec', () => {
			expect(box.point).toEqual(new Vec(10, 20))
		})

		it('sets the point with a Vec', () => {
			box.point = new Vec(50, 60)
			expect(box.x).toBe(50)
			expect(box.y).toBe(60)
		})
	})

	describe('Box.minX', () => {
		it('gets the minimum X value', () => {
			expect(box.minX).toBe(10)
		})

		it('sets the minimum X value', () => {
			box.minX = 30
			expect(box.x).toBe(30)
		})
	})

	describe('Box.left', () => {
		it('gets the left edge', () => {
			expect(box.left).toBe(10)
		})
	})

	describe('Box.midX', () => {
		it('gets the middle X value', () => {
			expect(box.midX).toBe(60) // 10 + 100/2
		})
	})

	describe('Box.maxX', () => {
		it('gets the maximum X value', () => {
			expect(box.maxX).toBe(110) // 10 + 100
		})
	})

	describe('Box.right', () => {
		it('gets the right edge', () => {
			expect(box.right).toBe(110) // 10 + 100
		})
	})

	describe('Box.minY', () => {
		it('gets the minimum Y value', () => {
			expect(box.minY).toBe(20)
		})

		it('sets the minimum Y value', () => {
			box.minY = 40
			expect(box.y).toBe(40)
		})
	})

	describe('Box.top', () => {
		it('gets the top edge', () => {
			expect(box.top).toBe(20)
		})
	})

	describe('Box.midY', () => {
		it('gets the middle Y value', () => {
			expect(box.midY).toBe(120) // 20 + 200/2
		})
	})

	describe('Box.maxY', () => {
		it('gets the maximum Y value', () => {
			expect(box.maxY).toBe(220) // 20 + 200
		})
	})

	describe('Box.bottom', () => {
		it('gets the bottom edge', () => {
			expect(box.bottom).toBe(220) // 20 + 200
		})
	})

	describe('Box.width', () => {
		it('gets the width', () => {
			expect(box.width).toBe(100)
		})

		it('sets the width', () => {
			box.width = 150
			expect(box.w).toBe(150)
		})
	})

	describe('Box.height', () => {
		it('gets the height', () => {
			expect(box.height).toBe(200)
		})

		it('sets the height', () => {
			box.height = 250
			expect(box.h).toBe(250)
		})
	})

	describe('Box.aspectRatio', () => {
		it('gets the aspect ratio', () => {
			expect(box.aspectRatio).toBe(0.5) // 100/200
		})
	})

	describe('Box.center', () => {
		it('gets the center point', () => {
			expect(box.center).toEqual(new Vec(60, 120))
		})

		it('sets the center point', () => {
			box.center = new Vec(100, 150)
			expect(box.x).toBe(50) // 100 - 100/2
			expect(box.y).toBe(50) // 150 - 200/2
		})
	})

	describe('Box.corners', () => {
		it('gets the corners', () => {
			const corners = box.corners
			expect(corners).toEqual([
				new Vec(10, 20), // top-left
				new Vec(110, 20), // top-right (fixed from buggy bottom-right)
				new Vec(110, 220), // bottom-right
				new Vec(10, 220), // bottom-left
			])
		})
	})

	describe('Box.cornersAndCenter', () => {
		it('gets the corners and center', () => {
			const cornersAndCenter = box.cornersAndCenter
			expect(cornersAndCenter).toEqual([
				new Vec(10, 20), // top-left
				new Vec(110, 20), // top-right (fixed from buggy bottom-right)
				new Vec(110, 220), // bottom-right
				new Vec(10, 220), // bottom-left
				new Vec(60, 120), // center
			])
		})
	})

	describe('Box.sides', () => {
		it('gets the sides as pairs of vectors', () => {
			const sides = box.sides
			const corners = box.corners
			expect(sides).toEqual([
				[corners[0], corners[1]],
				[corners[1], corners[2]],
				[corners[2], corners[3]],
				[corners[3], corners[0]],
			])
		})
	})

	describe('Box.size', () => {
		it('gets the size as a Vec', () => {
			expect(box.size).toEqual(new Vec(100, 200))
		})
	})

	describe('Box.toFixed', () => {
		it('applies precision to all values', () => {
			const impreciseBox = new Box(10.123456789, 20.987654321, 100.555555, 200.777777)
			const result = impreciseBox.toFixed()
			expect(result.x).toBeCloseTo(10.123456789, 6)
			expect(result.y).toBeCloseTo(20.987654321, 6)
			expect(result.w).toBeCloseTo(100.555555, 6)
			expect(result.h).toBeCloseTo(200.777777, 6)
			expect(result).toBe(impreciseBox) // returns self
		})
	})

	describe('Box.setTo', () => {
		it('copies values from another box', () => {
			const otherBox = new Box(50, 60, 150, 250)
			const result = box.setTo(otherBox)
			expect(box.x).toBe(50)
			expect(box.y).toBe(60)
			expect(box.w).toBe(150)
			expect(box.h).toBe(250)
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.set', () => {
		it('sets all values', () => {
			const result = box.set(30, 40, 120, 180)
			expect(box.x).toBe(30)
			expect(box.y).toBe(40)
			expect(box.w).toBe(120)
			expect(box.h).toBe(180)
			expect(result).toBe(box) // returns self
		})

		it('uses default values when no parameters provided', () => {
			const result = box.set()
			expect(box.x).toBe(0)
			expect(box.y).toBe(0)
			expect(box.w).toBe(0)
			expect(box.h).toBe(0)
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.expand', () => {
		it('expands to include another box', () => {
			const otherBox = new Box(5, 15, 120, 240) // overlaps and extends
			const result = box.expand(otherBox)
			expect(box.x).toBe(5) // min of 10 and 5
			expect(box.y).toBe(15) // min of 20 and 15
			expect(box.w).toBe(120) // max(110, 125) - min(10, 5) = 125 - 5
			expect(box.h).toBe(240) // max(220, 255) - min(20, 15) = 255 - 15
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.expandBy', () => {
		it('expands by a given amount', () => {
			const result = box.expandBy(10)
			expect(box.x).toBe(0) // 10 - 10
			expect(box.y).toBe(10) // 20 - 10
			expect(box.w).toBe(120) // 100 + 10*2
			expect(box.h).toBe(220) // 200 + 10*2
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.scale', () => {
		it('scales the box by a factor', () => {
			const result = box.scale(2)
			expect(box.x).toBe(5) // 10/2
			expect(box.y).toBe(10) // 20/2
			expect(box.w).toBe(50) // 100/2
			expect(box.h).toBe(100) // 200/2
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.clone', () => {
		it('creates a copy of the box', () => {
			const cloned = box.clone()
			expect(cloned).toEqual(box)
			expect(cloned).not.toBe(box) // different object
		})
	})

	describe('Box.translate', () => {
		it('translates the box by a delta', () => {
			const delta = new Vec(5, 10)
			const result = box.translate(delta)
			expect(box.x).toBe(15) // 10 + 5
			expect(box.y).toBe(30) // 20 + 10
			expect(box.w).toBe(100) // unchanged
			expect(box.h).toBe(200) // unchanged
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.snapToGrid', () => {
		it('snaps the box to a grid', () => {
			const testBox = new Box(12, 18, 95, 185)
			testBox.snapToGrid(10)
			expect(testBox.minX).toBe(10) // rounded to nearest 10
			expect(testBox.minY).toBe(20) // rounded to nearest 10
			expect(testBox.width).toBe(100) // snapped width
			expect(testBox.height).toBe(180) // snapped height
		})

		it('ensures minimum size of 1', () => {
			const testBox = new Box(0, 0, 3, 3)
			testBox.snapToGrid(10)
			expect(testBox.width).toBe(1) // minimum 1
			expect(testBox.height).toBe(1) // minimum 1
		})
	})

	describe('Box.collides', () => {
		it('returns true when boxes collide', () => {
			const otherBox = new Box(50, 100, 100, 100) // overlaps
			expect(box.collides(otherBox)).toBe(true)
		})

		it('returns false when boxes do not collide', () => {
			const otherBox = new Box(200, 300, 100, 100) // no overlap
			expect(box.collides(otherBox)).toBe(false)
		})
	})

	describe('Box.contains', () => {
		it('returns true when this box contains the other', () => {
			const otherBox = new Box(20, 30, 50, 100) // inside box
			expect(box.contains(otherBox)).toBe(true)
		})

		it('returns false when this box does not contain the other', () => {
			const otherBox = new Box(5, 5, 200, 300) // larger than box
			expect(box.contains(otherBox)).toBe(false)
		})
	})

	describe('Box.includes', () => {
		it('returns true when boxes collide or contain', () => {
			const collidingBox = new Box(50, 100, 100, 100)
			const containedBox = new Box(20, 30, 50, 100)
			expect(box.includes(collidingBox)).toBe(true)
			expect(box.includes(containedBox)).toBe(true)
		})

		it('returns false when boxes do not interact', () => {
			const separateBox = new Box(200, 300, 100, 100)
			expect(box.includes(separateBox)).toBe(false)
		})
	})

	describe('Box.containsPoint', () => {
		it('returns true when point is inside', () => {
			const point = new Vec(50, 100)
			expect(box.containsPoint(point)).toBe(true)
		})

		it('returns false when point is outside', () => {
			const point = new Vec(150, 300)
			expect(box.containsPoint(point)).toBe(false)
		})

		it('respects margin', () => {
			const point = new Vec(5, 15) // just outside
			expect(box.containsPoint(point)).toBe(false)
			expect(box.containsPoint(point, 10)).toBe(true) // with margin
		})
	})

	describe('Box.getHandlePoint', () => {
		it('returns correct points for corners', () => {
			expect(box.getHandlePoint('top_left')).toEqual(new Vec(10, 20))
			expect(box.getHandlePoint('top_right')).toEqual(new Vec(110, 20))
			expect(box.getHandlePoint('bottom_left')).toEqual(new Vec(10, 220))
			expect(box.getHandlePoint('bottom_right')).toEqual(new Vec(110, 220))
		})

		it('returns correct points for edges', () => {
			expect(box.getHandlePoint('top')).toEqual(new Vec(60, 20))
			expect(box.getHandlePoint('right')).toEqual(new Vec(110, 120))
			expect(box.getHandlePoint('bottom')).toEqual(new Vec(60, 220))
			expect(box.getHandlePoint('left')).toEqual(new Vec(10, 120))
		})
	})

	describe('Box.toJson', () => {
		it('returns box model object', () => {
			expect(box.toJson()).toEqual({
				x: 10,
				y: 20,
				w: 100,
				h: 200,
			})
		})
	})

	describe('Box.resize', () => {
		it('resizes from top-left handle', () => {
			box.resize('top_left', 10, 20)
			expect(box.minX).toBe(20) // moved right
			expect(box.minY).toBe(40) // moved down
			expect(box.width).toBe(90) // reduced width
			expect(box.height).toBe(180) // reduced height
		})

		it('resizes from bottom-right handle', () => {
			box.resize('bottom_right', 10, 20)
			expect(box.minX).toBe(10) // unchanged
			expect(box.minY).toBe(20) // unchanged
			expect(box.width).toBe(110) // increased width
			expect(box.height).toBe(220) // increased height
		})
	})

	describe('Box.union', () => {
		it('creates union with another box', () => {
			const otherBox = { x: 5, y: 15, w: 120, h: 240 }
			const result = box.union(otherBox)
			expect(box.x).toBe(5)
			expect(box.y).toBe(15)
			expect(box.width).toBe(120) // max(110, 125) - min(10, 5)
			expect(box.height).toBe(240) // max(220, 255) - min(20, 15)
			expect(result).toBe(box) // returns self
		})
	})

	describe('Box.equals', () => {
		it('returns true for equal boxes', () => {
			const otherBox = new Box(10, 20, 100, 200)
			expect(box.equals(otherBox)).toBe(true)
		})

		it('returns false for different boxes', () => {
			const otherBox = new Box(10, 20, 100, 201)
			expect(box.equals(otherBox)).toBe(false)
		})
	})

	describe('Box.zeroFix', () => {
		it('ensures minimum size of 1', () => {
			const zeroBox = new Box(0, 0, 0, 0)
			const result = zeroBox.zeroFix()
			expect(zeroBox.w).toBe(1)
			expect(zeroBox.h).toBe(1)
			expect(result).toBe(zeroBox) // returns self
		})
	})

	// Static method tests
	describe('Box.From', () => {
		it('creates box from box model', () => {
			const boxModel = { x: 5, y: 10, w: 50, h: 100 }
			const result = Box.From(boxModel)
			expect(result).toEqual(new Box(5, 10, 50, 100))
		})
	})

	describe('Box.FromCenter', () => {
		it('creates box from center and size', () => {
			const center = new Vec(50, 100)
			const size = new Vec(20, 40)
			const result = Box.FromCenter(center, size)
			expect(result).toEqual(new Box(40, 80, 20, 40))
		})
	})

	describe('Box.FromPoints', () => {
		it('creates box from array of points', () => {
			const points = [new Vec(10, 20), new Vec(110, 220), new Vec(50, 100)]
			const result = Box.FromPoints(points)
			expect(result).toEqual(new Box(10, 20, 100, 200))
		})

		it('returns empty box for empty array', () => {
			const result = Box.FromPoints([])
			expect(result).toEqual(new Box())
		})
	})

	describe('Box.Expand', () => {
		it('creates expanded box from two boxes', () => {
			const boxA = new Box(10, 20, 100, 200)
			const boxB = new Box(5, 15, 120, 240)
			const result = Box.Expand(boxA, boxB)
			expect(result).toEqual(new Box(5, 15, 120, 240))
		})
	})

	describe('Box.ExpandBy', () => {
		it('creates expanded box by amount', () => {
			const result = Box.ExpandBy(box, 10)
			expect(result).toEqual(new Box(0, 10, 120, 220))
		})
	})

	describe('Box.Collides', () => {
		it('returns true when boxes collide', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(25, 25, 50, 50)
			expect(Box.Collides(boxA, boxB)).toBe(true)
		})

		it('returns false when boxes do not collide', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(100, 100, 50, 50)
			expect(Box.Collides(boxA, boxB)).toBe(false)
		})
	})

	describe('Box.Contains', () => {
		it('returns true when first box contains second', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 50, 50)
			expect(Box.Contains(boxA, boxB)).toBe(true)
		})

		it('returns false when first box does not contain second', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(10, 10, 100, 100)
			expect(Box.Contains(boxA, boxB)).toBe(false)
		})
	})

	describe('Box.ContainsApproximately', () => {
		it('returns true when first box exactly contains second', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 50, 50)
			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)
		})

		it('returns false when first box clearly does not contain second', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(10, 10, 100, 100)
			expect(Box.ContainsApproximately(boxA, boxB)).toBe(false)
		})

		it('returns true when containment is within default precision tolerance', () => {
			// Box B extends very slightly outside A (within floating-point precision)
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 80, 80)
			// Move B's max edges just slightly outside A's bounds
			boxB.w = 90.000000000001 // maxX = 100.000000000001 (slightly beyond 100)
			boxB.h = 90.000000000001 // maxY = 100.000000000001 (slightly beyond 100)

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)
			expect(Box.Contains(boxA, boxB)).toBe(false) // strict contains would fail
		})

		it('returns false when containment exceeds default precision tolerance', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 80, 80)
			// Move B's max edges clearly outside A's bounds
			boxB.w = 95 // maxX = 105 (clearly beyond 100)
			boxB.h = 95 // maxY = 105 (clearly beyond 100)

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(false)
		})

		it('respects custom precision parameter', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 85, 85) // maxX=95, maxY=95

			// With loose precision (10), should contain (95 is within 100-10=90 tolerance)
			expect(Box.ContainsApproximately(boxA, boxB, 10)).toBe(true)

			// With tight precision (4), should still contain (95 is within 100-4=96)
			expect(Box.ContainsApproximately(boxA, boxB, 4)).toBe(true)

			// Since 95 < 100, the precision parameter doesn't affect containment here
			expect(Box.ContainsApproximately(boxA, boxB, 4.9)).toBe(true)
		})

		it('handles negative coordinates correctly', () => {
			const boxA = new Box(-50, -50, 100, 100) // bounds: (-50,-50) to (50,50)
			const boxB = new Box(-40, -40, 79.999999999, 79.999999999) // bounds: (-40,-40) to (39.999999999, 39.999999999)

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)
		})

		it('handles edge case where boxes are identical', () => {
			const boxA = new Box(10, 20, 100, 200)
			const boxB = new Box(10, 20, 100, 200)

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)
		})

		it('handles edge case where inner box touches outer box edges', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(0, 0, 100, 100) // exactly the same

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)

			// Slightly smaller inner box
			const boxC = new Box(0.000001, 0.000001, 99.999998, 99.999998)
			expect(Box.ContainsApproximately(boxA, boxC)).toBe(true)
		})

		it('handles floating-point precision issues in real-world scenarios', () => {
			// Simulate common floating-point arithmetic issues
			const containerBox = new Box(0, 0, 100, 100)

			// Box that should be contained but has floating-point errors
			const innerBox = new Box(10, 10, 80, 80)
			// Simulate floating-point arithmetic that results in tiny overruns
			innerBox.w = 90.00000000000001 // maxX = 100.00000000000001 (tiny overrun)
			innerBox.h = 90.00000000000001 // maxY = 100.00000000000001 (tiny overrun)

			expect(Box.ContainsApproximately(containerBox, innerBox)).toBe(true)
			expect(Box.Contains(containerBox, innerBox)).toBe(false) // strict contains fails due to precision
		})

		it('fails when any edge exceeds tolerance', () => {
			const boxA = new Box(10, 10, 100, 100) // bounds: (10,10) to (110,110)

			// Test each edge exceeding tolerance
			const testCases = [
				{ name: 'left edge', box: new Box(5, 20, 80, 80) }, // minX too small
				{ name: 'top edge', box: new Box(20, 5, 80, 80) }, // minY too small
				{ name: 'right edge', box: new Box(20, 20, 95, 80) }, // maxX too large (20+95=115 > 110)
				{ name: 'bottom edge', box: new Box(20, 20, 80, 95) }, // maxY too large (20+95=115 > 110)
			]

			testCases.forEach(({ box }) => {
				expect(Box.ContainsApproximately(boxA, box, 1)).toBe(false) // tight precision
			})
		})

		it('works with zero-sized dimensions', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(50, 50, 0, 0) // zero-sized box (point)

			expect(Box.ContainsApproximately(boxA, boxB)).toBe(true)
		})

		it('handles precision parameter edge cases', () => {
			const boxA = new Box(0, 0, 100, 100)
			const boxB = new Box(10, 10, 91, 91) // maxX=101, maxY=101 (clearly outside)

			// Zero precision should work like strict Contains
			expect(Box.ContainsApproximately(boxA, boxB, 0)).toBe(false)

			// Small precision should still fail (101 > 100)
			expect(Box.ContainsApproximately(boxA, boxB, 0.5)).toBe(false)

			// Sufficient precision should succeed (101 <= 100 + 2)
			expect(Box.ContainsApproximately(boxA, boxB, 2)).toBe(true)
		})
	})

	describe('Box.Includes', () => {
		it('returns true when boxes collide or contain', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(25, 25, 50, 50) // colliding
			const boxC = new Box(10, 10, 20, 20) // contained
			expect(Box.Includes(boxA, boxB)).toBe(true)
			expect(Box.Includes(boxA, boxC)).toBe(true)
		})

		it('returns false when boxes do not interact', () => {
			const boxA = new Box(0, 0, 50, 50)
			const boxB = new Box(100, 100, 50, 50)
			expect(Box.Includes(boxA, boxB)).toBe(false)
		})
	})

	describe('Box.ContainsPoint', () => {
		it('returns true when point is inside box', () => {
			const testBox = new Box(0, 0, 100, 100)
			const point = new Vec(50, 50)
			expect(Box.ContainsPoint(testBox, point)).toBe(true)
		})

		it('returns false when point is outside box', () => {
			const testBox = new Box(0, 0, 100, 100)
			const point = new Vec(150, 150)
			expect(Box.ContainsPoint(testBox, point)).toBe(false)
		})

		it('respects margin parameter', () => {
			const testBox = new Box(0, 0, 100, 100)
			const point = new Vec(-5, -5)
			expect(Box.ContainsPoint(testBox, point)).toBe(false)
			expect(Box.ContainsPoint(testBox, point, 10)).toBe(true)
		})
	})

	describe('Box.Common', () => {
		it('creates bounding box of multiple boxes', () => {
			const boxes = [new Box(0, 0, 50, 50), new Box(75, 75, 50, 50), new Box(25, 25, 50, 50)]
			const result = Box.Common(boxes)
			expect(result).toEqual(new Box(0, 0, 125, 125))
		})
	})

	describe('Box.Sides', () => {
		it('returns sides as corner pairs', () => {
			const testBox = new Box(0, 0, 100, 100)
			const sides = Box.Sides(testBox)
			expect(sides).toHaveLength(4)
			expect(sides[0]).toEqual([new Vec(0, 0), new Vec(100, 0)])
		})
	})

	describe('Box.Resize', () => {
		it('resizes box and returns scaling info', () => {
			const testBox = new Box(0, 0, 100, 100)
			const result = Box.Resize(testBox, 'bottom_right', 50, 50)
			expect(result.box).toEqual(new Box(0, 0, 150, 150))
			expect(result.scaleX).toBe(1.5)
			expect(result.scaleY).toBe(1.5)
		})

		it('handles aspect ratio locking', () => {
			const testBox = new Box(0, 0, 100, 100)
			const result = Box.Resize(testBox, 'bottom_right', 50, 25, true)
			expect(result.box.width).toBeCloseTo(result.box.height) // maintains aspect ratio
		})
	})

	describe('Box.Equals', () => {
		it('returns true for equal boxes', () => {
			const boxA = new Box(10, 20, 100, 200)
			const boxB = new Box(10, 20, 100, 200)
			expect(Box.Equals(boxA, boxB)).toBe(true)
		})

		it('returns false for different boxes', () => {
			const boxA = new Box(10, 20, 100, 200)
			const boxB = new Box(10, 20, 100, 201)
			expect(Box.Equals(boxA, boxB)).toBe(false)
		})
	})

	describe('Box.ZeroFix', () => {
		it('creates new box with minimum size of 1', () => {
			const zeroBox = new Box(0, 0, 0, 0)
			const result = Box.ZeroFix(zeroBox)
			expect(result).toEqual(new Box(0, 0, 1, 1))
			expect(result).not.toBe(zeroBox) // different object
		})
	})
})
