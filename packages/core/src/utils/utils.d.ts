import type React from 'react';
import { TLBezierCurveSegment, TLBounds, TLBoundsCorner, TLBoundsEdge } from '../types';
import './polyfills';
import type { TLBoundsWithCenter } from '+index';
export declare class Utils {
    static filterObject<T extends object>(obj: T, fn: (entry: Entry<T>, i?: number, arr?: Entry<T>[]) => boolean): Partial<T>;
    static deepMerge: <T>(target: T, patch: any) => T;
    /**
     * Linear interpolation betwen two numbers.
     * @param y1
     * @param y2
     * @param mu
     */
    static lerp(y1: number, y2: number, mu: number): number;
    /**
     * Linear interpolation between two colors.
     *
     * ### Example
     *
     *```ts
     * lerpColor("#000000", "#0099FF", .25)
     *```
     */
    static lerpColor(color1: string, color2: string, factor?: number): string;
    /**
     * Modulate a value between two ranges.
     * @param value
     * @param rangeA from [low, high]
     * @param rangeB to [low, high]
     * @param clamp
     */
    static modulate(value: number, rangeA: number[], rangeB: number[], clamp?: boolean): number;
    /**
     * Clamp a value into a range.
     * @param n
     * @param min
     */
    static clamp(n: number, min: number): number;
    static clamp(n: number, min: number, max: number): number;
    static compress(s: string): string;
    static decompress(s: string): string;
    /**
     * Recursively clone an object or array.
     * @param obj
     */
    static deepClone<T extends unknown>(obj: T): T;
    /**
     * Seeded random number generator, using [xorshift](https://en.wikipedia.org/wiki/Xorshift).
     * The result will always be betweeen -1 and 1.
     *
     * Adapted from [seedrandom](https://github.com/davidbau/seedrandom).
     */
    static rng(seed?: string): () => number;
    static getRectangleSides(point: number[], size: number[], rotation?: number): [string, number[][]][];
    static getBoundsSides(bounds: TLBounds): [string, number[][]][];
    static shallowEqual<T extends Record<string, unknown>>(objA: T, objB: T): boolean;
    /**
     * Get the outer of between a circle and a point.
     * @param C The circle's center.
     * @param r The circle's radius.
     * @param P The point.
     * @param side
     */
    static getCircleTangentToPoint(C: number[], r: number, P: number[], side: number): number[] | null;
    /**
     * Get outer tangents of two circles.
     * @param x0
     * @param y0
     * @param r0
     * @param x1
     * @param y1
     * @param r1
     * @returns [lx0, ly0, lx1, ly1, rx0, ry0, rx1, ry1]
     */
    static getOuterTangentsOfCircles(C0: number[], r0: number, C1: number[], r1: number): number[][] | null;
    /**
     * Get the closest point on the perimeter of a circle to a given point.
     * @param C The circle's center.
     * @param r The circle's radius.
     * @param P The point.
     */
    static getClosestPointOnCircle(C: number[], r: number, P: number[]): number[];
    /**
     * Get a circle from three points.
     * @param A
     * @param B
     * @param C
     * @returns [x, y, r]
     */
    static circleFromThreePoints(A: number[], B: number[], C: number[]): number[];
    /**
     * Find the approximate perimeter of an ellipse.
     * @param rx
     * @param ry
     */
    static perimeterOfEllipse(rx: number, ry: number): number;
    /**
     * Get the short angle distance between two angles.
     * @param a0
     * @param a1
     */
    static shortAngleDist(a0: number, a1: number): number;
    /**
     * Get the long angle distance between two angles.
     * @param a0
     * @param a1
     */
    static longAngleDist(a0: number, a1: number): number;
    /**
     * Interpolate an angle between two angles.
     * @param a0
     * @param a1
     * @param t
     */
    static lerpAngles(a0: number, a1: number, t: number): number;
    /**
     * Get the short distance between two angles.
     * @param a0
     * @param a1
     */
    static angleDelta(a0: number, a1: number): number;
    /**
     * Get the "sweep" or short distance between two points on a circle's perimeter.
     * @param C
     * @param A
     * @param B
     */
    static getSweep(C: number[], A: number[], B: number[]): number;
    /**
     * Rotate a point around a center.
     * @param x The x-axis coordinate of the point.
     * @param y The y-axis coordinate of the point.
     * @param cx The x-axis coordinate of the point to rotate round.
     * @param cy The y-axis coordinate of the point to rotate round.
     * @param angle The distance (in radians) to rotate.
     */
    static rotatePoint(A: number[], B: number[], angle: number): number[];
    /**
     * Clamp radians within 0 and 2PI
     * @param r
     */
    static clampRadians(r: number): number;
    /**
     * Clamp rotation to even segments.
     * @param r
     * @param segments
     */
    static snapAngleToSegments(r: number, segments: number): number;
    /**
     * Is angle c between angles a and b?
     * @param a
     * @param b
     * @param c
     */
    static isAngleBetween(a: number, b: number, c: number): boolean;
    /**
     * Convert degrees to radians.
     * @param d
     */
    static degreesToRadians(d: number): number;
    /**
     * Convert radians to degrees.
     * @param r
     */
    static radiansToDegrees(r: number): number;
    /**
     * Get the length of an arc between two points on a circle's perimeter.
     * @param C
     * @param r
     * @param A
     * @param B
     */
    static getArcLength(C: number[], r: number, A: number[], B: number[]): number;
    /**
     * Get a dash offset for an arc, based on its length.
     * @param C
     * @param r
     * @param A
     * @param B
     * @param step
     */
    static getArcDashOffset(C: number[], r: number, A: number[], B: number[], step: number): number;
    /**
     * Get a dash offset for an ellipse, based on its length.
     * @param A
     * @param step
     */
    static getEllipseDashOffset(A: number[], step: number): number;
    /**
     * Get bezier curve segments that pass through an array of points.
     * @param points
     * @param tension
     */
    static getTLBezierCurveSegments(points: number[][], tension?: number): TLBezierCurveSegment[];
    /**
     * Find a point along a curve segment, via pomax.
     * @param t
     * @param points [cpx1, cpy1, cpx2, cpy2, px, py][]
     */
    static computePointOnCurve(t: number, points: number[][]): number[];
    /**
     * Evaluate a 2d cubic bezier at a point t on the x axis.
     * @param tx
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     */
    static cubicBezier(tx: number, x1: number, y1: number, x2: number, y2: number): number;
    /**
     * Get a bezier curve data for a spline that fits an array of points.
     * @param points An array of points formatted as [x, y]
     * @param k Tension
     */
    static getSpline(pts: number[][], k?: number): {
        cp1x: number;
        cp1y: number;
        cp2x: number;
        cp2y: number;
        px: number;
        py: number;
    }[];
    /**
     * Get a bezier curve data for a spline that fits an array of points.
     * @param pts
     * @param tension
     * @param isClosed
     * @param numOfSegments
     */
    static getCurvePoints(pts: number[][], tension?: number, isClosed?: boolean, numOfSegments?: number): number[][];
    /**
     * Simplify a line (using Ramer-Douglas-Peucker algorithm).
     * @param points An array of points as [x, y, ...][]
     * @param tolerance The minimum line distance (also called epsilon).
     * @returns Simplified array as [x, y, ...][]
     */
    static simplify(points: number[][], tolerance?: number): number[][];
    /**
     * Get whether a point is inside of a circle.
     * @param A
     * @param b
     * @returns
     */
    static pointInCircle(A: number[], C: number[], r: number): boolean;
    /**
     * Get whether a point is inside of an ellipse.
     * @param point
     * @param center
     * @param rx
     * @param ry
     * @param rotation
     * @returns
     */
    static pointInEllipse(A: number[], C: number[], rx: number, ry: number, rotation?: number): boolean;
    /**
     * Get whether a point is inside of a rectangle.
     * @param point
     * @param size
     */
    static pointInRect(point: number[], size: number[]): boolean;
    static pointInPolygon(p: number[], points: number[][]): boolean;
    /**
     * Expand a bounding box by a delta.
     *
     * ### Example
     *
     *```ts
     * expandBounds(myBounds, [100, 100])
     *```
     */
    static expandBounds(bounds: TLBounds, delta: number): TLBounds;
    /**
     * Get whether a point is inside of a bounds.
     * @param A
     * @param b
     * @returns
     */
    static pointInBounds(A: number[], b: TLBounds): boolean;
    /**
     * Get whether two bounds collide.
     * @param a Bounds
     * @param b Bounds
     * @returns
     */
    static boundsCollide(a: TLBounds, b: TLBounds): boolean;
    /**
     * Get whether the bounds of A contain the bounds of B. A perfect match will return true.
     * @param a Bounds
     * @param b Bounds
     * @returns
     */
    static boundsContain(a: TLBounds, b: TLBounds): boolean;
    /**
     * Get whether the bounds of A are contained by the bounds of B.
     * @param a Bounds
     * @param b Bounds
     * @returns
     */
    static boundsContained(a: TLBounds, b: TLBounds): boolean;
    /**
     * Get whether two bounds are identical.
     * @param a Bounds
     * @param b Bounds
     * @returns
     */
    static boundsAreEqual(a: TLBounds, b: TLBounds): boolean;
    /**
     * Find a bounding box from an array of points.
     * @param points
     * @param rotation (optional) The bounding box's rotation.
     */
    static getBoundsFromPoints(points: number[][], rotation?: number): TLBounds;
    /**
     * Center a bounding box around a given point.
     * @param bounds
     * @param center
     */
    static centerBounds(bounds: TLBounds, point: number[]): TLBounds;
    /**
     * Move a bounding box without recalculating it.
     * @param bounds
     * @param delta
     * @returns
     */
    static translateBounds(bounds: TLBounds, delta: number[]): TLBounds;
    /**
     * Rotate a bounding box.
     * @param bounds
     * @param center
     * @param rotation
     */
    static rotateBounds(bounds: TLBounds, center: number[], rotation: number): TLBounds;
    /**
     * Get the rotated bounds of an ellipse.
     * @param x
     * @param y
     * @param rx
     * @param ry
     * @param rotation
     */
    static getRotatedEllipseBounds(x: number, y: number, rx: number, ry: number, rotation?: number): TLBounds;
    /**
     * Get a bounding box that includes two bounding boxes.
     * @param a Bounding box
     * @param b Bounding box
     * @returns
     */
    static getExpandedBounds(a: TLBounds, b: TLBounds): TLBounds;
    /**
     * Get the common bounds of a group of bounds.
     * @returns
     */
    static getCommonBounds(bounds: TLBounds[]): TLBounds;
    static getRotatedCorners(b: TLBounds, rotation?: number): number[][];
    static getTransformedBoundingBox(bounds: TLBounds, handle: TLBoundsCorner | TLBoundsEdge | 'center', delta: number[], rotation?: number, isAspectRatioLocked?: boolean): TLBounds & {
        scaleX: number;
        scaleY: number;
    };
    static getTransformAnchor(type: TLBoundsEdge | TLBoundsCorner, isFlippedX: boolean, isFlippedY: boolean): TLBoundsCorner | TLBoundsEdge;
    /**
     * Get the relative bounds (usually a child) within a transformed bounding box.
     * @param bounds
     * @param initialBounds
     * @param initialShapeBounds
     * @param isFlippedX
     * @param isFlippedY
     */
    static getRelativeTransformedBoundingBox(bounds: TLBounds, initialBounds: TLBounds, initialShapeBounds: TLBounds, isFlippedX: boolean, isFlippedY: boolean): TLBounds;
    /**
     * Get the size of a rotated box.
     * @param size : ;
     * @param rotation
     */
    static getRotatedSize(size: number[], rotation: number): number[];
    /**
     * Get the center of a bounding box.
     * @param bounds
     */
    static getBoundsCenter(bounds: TLBounds): number[];
    /**
     * Get a bounding box with a midX and midY.
     * @param bounds
     */
    static getBoundsWithCenter(bounds: TLBounds): TLBounds & {
        midX: number;
        midY: number;
    };
    static getSnapPoints: (bounds: any, others: TLBoundsWithCenter[], snapDistance: number) => {
        offset: number[];
        snapLines: number[][][];
    };
    /**
     *
     *
     * ### Example
     *
     *```ts
     * example
     *```
     */
    static removeDuplicatePoints(points: number[][]): number[][];
    /**
    // points =
  
  
  /**
   * Get a value from a cache (a WeakMap), filling the value if it is not present.
   *
   * ### Example
   *
   *```ts
   * getFromCache(boundsCache, shape, (cache) => cache.set(shape, "value"))
   *```
   */
    static getFromCache<V, I extends object>(cache: WeakMap<I, V>, item: I, getNext: () => V): V;
    /**
     * Get a unique string id.
     */
    static uniqueId(a?: string): string;
    /**
     * Shuffle the contents of an array.
     * @param arr
     * @param offset
     */
    static rotateArray<T>(arr: T[], offset: number): T[];
    /**
     * Deep compare two arrays.
     * @param a
     * @param b
     */
    static deepCompareArrays<T>(a: T[], b: T[]): boolean;
    /**
     * Deep compare any values.
     * @param a
     * @param b
     */
    static deepCompare<T>(a: T, b: T): boolean;
    /**
     * Find whether two arrays intersect.
     * @param a
     * @param b
     * @param fn An optional function to apply to the items of a; will check if b includes the result.
     */
    static arrsIntersect<T, K>(a: T[], b: K[], fn?: (item: K) => T): boolean;
    static arrsIntersect<T>(a: T[], b: T[]): boolean;
    /**
     * Get the unique values from an array of strings or numbers.
     * @param items
     */
    static uniqueArray<T extends string | number>(...items: T[]): T[];
    /**
     * Convert a set to an array.
     * @param set
     */
    static setToArray<T>(set: Set<T>): T[];
    /**
     * Debounce a function.
     */
    static debounce<T extends (...args: any[]) => void>(fn: T, ms?: number): (...args: Parameters<T>) => void;
    static TRIM_NUMBERS: RegExp;
    /**
     * Turn an array of points into a path of quadradic curves.
     * @param stroke ;
     */
    static getSvgPathFromStroke(points: number[][], closed?: boolean): string;
    /**
     * Get balanced dash-strokearray and dash-strokeoffset properties for a path of a given length.
     * @param length The length of the path.
     * @param strokeWidth The shape's stroke-width property.
     * @param style The stroke's style: "dashed" or "dotted" (default "dashed").
     * @param snap An interval for dashes (e.g. 4 will produce arrays with 4, 8, 16, etc dashes).
     */
    static getPerfectDashProps(length: number, strokeWidth: number, style: 'dashed' | 'dotted' | string, snap?: number, outset?: boolean): {
        strokeDasharray: string;
        strokeDashoffset: string;
    };
    static isMobileSize(): boolean;
    static isMobileSafari(): boolean;
    static throttle<T extends (...args: any) => any>(func: T, limit: number): (...args: Parameters<T>) => ReturnType<T>;
    /**
     * Find whether the current display is a touch display.
     */
    /**
     * Find whether the current device is a Mac / iOS / iPadOS.
     */
    static isDarwin(): boolean;
    /**
     * Get whether an event is command (mac) or control (pc).
     * @param e
     */
    static metaKey(e: KeyboardEvent | React.KeyboardEvent): boolean;
}
export default Utils;
declare type Entry<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T];
//# sourceMappingURL=utils.d.ts.map