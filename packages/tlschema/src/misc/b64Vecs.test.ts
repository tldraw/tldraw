import { b64Vecs } from './b64Vecs'
import { VecModel } from './geometry-types'

describe('b64Vecs', () => {
    describe('basic encoding/decoding', () => {
        it('encodes and decodes a single point correctly', () => {
            const points: VecModel[] = [{ x: 10, y: 20, z: 0.5 }]
            const encoded = b64Vecs.encodePoints(points)
            const decoded = b64Vecs.decodePoints(encoded)

            expect(decoded.length).toBe(1)
            expect(decoded[0].x).toBeCloseTo(10, 1)
            expect(decoded[0].y).toBeCloseTo(20, 1)
            expect(decoded[0].z).toBeCloseTo(0.5, 1)
        })

        it('encodes and decodes multiple points correctly', () => {
            const points: VecModel[] = [
                { x: 0, y: 0, z: 0.5 },
                { x: 10, y: 20, z: 0.5 },
                { x: 30, y: 40, z: 0.5 },
            ]
            const encoded = b64Vecs.encodePoints(points)
            const decoded = b64Vecs.decodePoints(encoded)

            expect(decoded.length).toBe(3)
            for (let i = 0; i < points.length; i++) {
                expect(decoded[i].x).toBeCloseTo(points[i].x, 1)
                expect(decoded[i].y).toBeCloseTo(points[i].y, 1)
            }
        })

        it('preserves high precision for small coordinates', () => {
            const smallPoints: VecModel[] = [
                { x: 0.1, y: 0.2, z: 0.5 },
                { x: 1.5, y: 2.25, z: 0.5 },
                { x: 10.125, y: 15.5, z: 0.5 },
            ]

            const encoded = b64Vecs.encodePoints(smallPoints)
            const decoded = b64Vecs.decodePoints(encoded)

            for (let i = 0; i < smallPoints.length; i++) {
                const xError = Math.abs(decoded[i].x - smallPoints[i].x)
                const yError = Math.abs(decoded[i].y - smallPoints[i].y)
                expect(xError).toBeLessThan(0.1)
                expect(yError).toBeLessThan(0.1)
            }
        })

        it('decodeFirstPoint returns the first point', () => {
            const points: VecModel[] = [
                { x: 5, y: 10, z: 0.5 },
                { x: 15, y: 25, z: 0.5 },
            ]
            const encoded = b64Vecs.encodePoints(points)
            const first = b64Vecs.decodeFirstPoint(encoded)

            expect(first).not.toBeNull()
            expect(first!.x).toBeCloseTo(5, 1)
            expect(first!.y).toBeCloseTo(10, 1)
        })

        it('decodeLastPoint returns the last point', () => {
            const points: VecModel[] = [
                { x: 5, y: 10, z: 0.5 },
                { x: 15, y: 25, z: 0.5 },
            ]
            const encoded = b64Vecs.encodePoints(points)
            const last = b64Vecs.decodeLastPoint(encoded)

            expect(last).not.toBeNull()
            expect(last!.x).toBeCloseTo(15, 1)
            expect(last!.y).toBeCloseTo(25, 1)
        })
    })
})

describe('b64Vecs delta encoding', () => {
    it('encodes and decodes points using delta encoding', () => {
        const points: VecModel[] = [
            { x: 0, y: 0, z: 0.5 },
            { x: 10, y: 20, z: 0.5 },
            { x: 30, y: 40, z: 0.5 },
        ]
        const encoded = b64Vecs.encodePointsDelta(points)
        const decoded = b64Vecs.decodePointsDelta(encoded)

        expect(decoded.length).toBe(3)
        for (let i = 0; i < points.length; i++) {
            expect(decoded[i].x).toBeCloseTo(points[i].x, 1)
            expect(decoded[i].y).toBeCloseTo(points[i].y, 1)
        }
    })

    it('handles empty points array', () => {
        const encoded = b64Vecs.encodePointsDelta([])
        expect(encoded).toBe('')

        const decoded = b64Vecs.decodePointsDelta('')
        expect(decoded).toEqual([])
    })

    it('handles single point', () => {
        const points: VecModel[] = [{ x: 100, y: 200, z: 0.5 }]
        const encoded = b64Vecs.encodePointsDelta(points)
        const decoded = b64Vecs.decodePointsDelta(encoded)

        expect(decoded.length).toBe(1)
        expect(decoded[0].x).toBeCloseTo(100, 1)
        expect(decoded[0].y).toBeCloseTo(200, 1)
    })

    it('maintains better precision than absolute encoding at large coordinates', () => {
        // Test at coordinates where Float16 absolute precision degrades
        const largeCoordPoints: VecModel[] = [
            { x: 2000, y: 2000, z: 0.5 },
            { x: 2000.5, y: 2000.25, z: 0.5 },
            { x: 2001, y: 2000.5, z: 0.5 },
        ]

        // Delta encoding
        const encodedDelta = b64Vecs.encodePointsDelta(largeCoordPoints)
        const decodedDelta = b64Vecs.decodePointsDelta(encodedDelta)

        // Absolute encoding (for comparison)
        const encodedAbsolute = b64Vecs.encodePoints(largeCoordPoints)
        const decodedAbsolute = b64Vecs.decodePoints(encodedAbsolute)

        // Compare errors - delta should be better
        const deltaError = Math.abs(decodedDelta[1].x - largeCoordPoints[1].x)
        const absoluteError = Math.abs(decodedAbsolute[1].x - largeCoordPoints[1].x)

        // Key assertion: delta encoding has better precision
        expect(deltaError).toBeLessThan(absoluteError)
        expect(deltaError).toBeLessThan(0.1)
    })

    it('decodeFirstPointDelta returns the first point (O(1))', () => {
        const points: VecModel[] = [
            { x: 100, y: 200, z: 0.5 },
            { x: 110, y: 210, z: 0.5 },
        ]
        const encoded = b64Vecs.encodePointsDelta(points)
        const first = b64Vecs.decodeFirstPointDelta(encoded)

        expect(first).not.toBeNull()
        expect(first!.x).toBeCloseTo(100, 1)
        expect(first!.y).toBeCloseTo(200, 1)
    })

    it('decodeLastPointDelta returns the last point correctly', () => {
        const points: VecModel[] = [
            { x: 100, y: 200, z: 0.5 },
            { x: 110, y: 210, z: 0.5 },
            { x: 125, y: 230, z: 0.5 },
        ]
        const encoded = b64Vecs.encodePointsDelta(points)
        const last = b64Vecs.decodeLastPointDelta(encoded)

        expect(last).not.toBeNull()
        expect(last!.x).toBeCloseTo(125, 1)
        expect(last!.y).toBeCloseTo(230, 1)
    })
})
