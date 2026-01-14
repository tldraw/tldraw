/**
 * Comprehensive metrics-based regression tests for Float16 precision fix.
 * 
 * Tests prove the fix by measuring:
 * 1. Error vs distance from origin (must stay constant)
 * 2. No duplicate consecutive points (truncation detection)
 * 3. Curve smoothness (no angle quantization)
 * 4. Performance benchmarks
 */

import { b64Vecs } from './b64Vecs'
import { VecModel } from './geometry-types'

/**
 * Generate a deterministic stroke path for reproducible tests
 */
function generateStroke(offsetX: number, offsetY: number, numPoints: number = 100): VecModel[] {
    const points: VecModel[] = []
    for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints
        points.push({
            x: offsetX + Math.sin(t * Math.PI * 2) * 100 + t * 200,
            y: offsetY + Math.cos(t * Math.PI * 3) * 80 + t * 150,
            z: 0.4 + t * 0.2,
        })
    }
    return points
}

function distance(a: VecModel, b: VecModel): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function calculateErrors(original: VecModel[], decoded: VecModel[]): {
    maxError: number
    meanError: number
} {
    const errors: number[] = []
    for (let i = 0; i < original.length; i++) {
        errors.push(distance(original[i], decoded[i]))
    }
    return {
        maxError: Math.max(...errors),
        meanError: errors.reduce((a, b) => a + b, 0) / errors.length,
    }
}

function calculateAngle(p1: VecModel, p2: VecModel): number {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
    return angle < 0 ? angle + Math.PI * 2 : angle
}

/**
 * Detect angle quantization (stair-stepping).
 * Stepping artifacts manifest as sudden direction changes (high variance).
 */
function detectAngleQuantization(points: VecModel[]): { angleDeltaVariance: number } {
    const angleDeltas: number[] = []
    for (let i = 2; i < points.length; i++) {
        const angle1 = calculateAngle(points[i - 2], points[i - 1])
        const angle2 = calculateAngle(points[i - 1], points[i])
        let delta = Math.abs(angle2 - angle1)
        if (delta > Math.PI) delta = 2 * Math.PI - delta
        angleDeltas.push(delta)
    }
    const mean = angleDeltas.reduce((a, b) => a + b, 0) / angleDeltas.length
    const variance = angleDeltas.reduce((a, b) => a + (b - mean) ** 2, 0) / angleDeltas.length
    return { angleDeltaVariance: variance }
}

function countConsecutiveDuplicates(points: VecModel[]): number {
    let count = 0
    for (let i = 1; i < points.length; i++) {
        if (points[i].x === points[i - 1].x && points[i].y === points[i - 1].y) {
            count++
        }
    }
    return count
}

describe('Float16 Precision Fix - Regression Tests', () => {
    describe('Error scaling', () => {
        it('delta encoding error does not scale with coordinate magnitude', () => {
            const offsets = [
                { x: 0, y: 0 },
                { x: 500, y: 500 },
                { x: 2000, y: 2000 },
                { x: 5000, y: 5000 },
                { x: 10000, y: 10000 },
            ]

            const deltaErrors: number[] = []
            const absoluteErrors: number[] = []

            for (const offset of offsets) {
                const stroke = generateStroke(offset.x, offset.y, 50)

                const encodedDelta = b64Vecs.encodePointsDelta(stroke)
                const decodedDelta = b64Vecs.decodePointsDelta(encodedDelta)
                deltaErrors.push(calculateErrors(stroke, decodedDelta).maxError)

                const encodedAbs = b64Vecs.encodePoints(stroke)
                const decodedAbs = b64Vecs.decodePoints(encodedAbs)
                absoluteErrors.push(calculateErrors(stroke, decodedAbs).maxError)
            }

            const deltaRatio = Math.max(...deltaErrors) / (Math.min(...deltaErrors) || 0.001)
            const absRatio = Math.max(...absoluteErrors) / (Math.min(...absoluteErrors) || 0.001)

            // Delta ratio should be much smaller (error stays constant)
            expect(deltaRatio).toBeLessThan(absRatio)
            // Delta should have lower error at large coordinates
            expect(deltaErrors[4]).toBeLessThan(absoluteErrors[4])
        })

        it('max error at 3000px offset is sub-pixel', () => {
            const stroke = generateStroke(3000, 3000, 100)
            const encoded = b64Vecs.encodePointsDelta(stroke)
            const decoded = b64Vecs.decodePointsDelta(encoded)
            const { maxError } = calculateErrors(stroke, decoded)

            expect(maxError).toBeLessThan(0.5) // Sub-pixel threshold
        })
    })

    describe('Duplicate point elimination', () => {
        it('delta encoding eliminates duplicate points caused by truncation', () => {
            const points: VecModel[] = []
            for (let i = 0; i < 100; i++) {
                points.push({
                    x: 5000 + i * 0.5,
                    y: 5000 + i * 0.25,
                    z: 0.5,
                })
            }

            const encodedDelta = b64Vecs.encodePointsDelta(points)
            const decodedDelta = b64Vecs.decodePointsDelta(encodedDelta)
            const deltaDuplicates = countConsecutiveDuplicates(decodedDelta)

            const encodedAbs = b64Vecs.encodePoints(points)
            const decodedAbs = b64Vecs.decodePoints(encodedAbs)
            const absDuplicates = countConsecutiveDuplicates(decodedAbs)

            expect(deltaDuplicates).toBeLessThan(absDuplicates)
            expect(deltaDuplicates).toBeLessThan(5)
        })
    })

    describe('Curve smoothness', () => {
        it('delta encoding produces smoother curves (lower angle variance)', () => {
            const points: VecModel[] = []
            for (let i = 0; i < 100; i++) {
                const t = i / 100
                points.push({
                    x: 3000 + Math.sin(t * Math.PI * 2) * 200 + t * 100,
                    y: 3000 + Math.cos(t * Math.PI * 2) * 200 + t * 80,
                    z: 0.5,
                })
            }

            const encodedDelta = b64Vecs.encodePointsDelta(points)
            const decodedDelta = b64Vecs.decodePointsDelta(encodedDelta)
            const deltaSmooth = detectAngleQuantization(decodedDelta)

            const encodedAbs = b64Vecs.encodePoints(points)
            const decodedAbs = b64Vecs.decodePoints(encodedAbs)
            const absSmooth = detectAngleQuantization(decodedAbs)

            // Lower variance = smoother curve
            expect(deltaSmooth.angleDeltaVariance).toBeLessThanOrEqual(absSmooth.angleDeltaVariance * 1.1)
        })
    })

    describe('Performance', () => {
        it('delta encoding has no size overhead', () => {
            const stroke = generateStroke(5000, 5000, 200)
            const encodedDelta = b64Vecs.encodePointsDelta(stroke)
            const encodedAbs = b64Vecs.encodePoints(stroke)

            expect(encodedDelta.length).toBe(encodedAbs.length)
        })

        it('encode/decode completes in reasonable time', () => {
            const stroke = generateStroke(5000, 5000, 200)

            const start = performance.now()
            const encoded = b64Vecs.encodePointsDelta(stroke)
            b64Vecs.decodePointsDelta(encoded)
            const elapsed = performance.now() - start

            expect(elapsed).toBeLessThan(50)
        })
    })

    describe('Path length preservation', () => {
        it('preserves path length with < 0.1% error', () => {
            const points: VecModel[] = []
            for (let i = 0; i < 150; i++) {
                const t = i / 150
                points.push({
                    x: 4000 + t * 3000 + Math.sin(t * 20) * 50,
                    y: 4000 + t * 2000 + Math.cos(t * 15) * 40,
                    z: 0.4 + t * 0.2,
                })
            }

            let originalLength = 0
            for (let i = 1; i < points.length; i++) {
                originalLength += distance(points[i - 1], points[i])
            }

            const encoded = b64Vecs.encodePointsDelta(points)
            const decoded = b64Vecs.decodePointsDelta(encoded)

            let decodedLength = 0
            for (let i = 1; i < decoded.length; i++) {
                decodedLength += distance(decoded[i - 1], decoded[i])
            }

            const lengthError = Math.abs(decodedLength - originalLength) / originalLength * 100
            expect(lengthError).toBeLessThan(0.1)
        })
    })
})
