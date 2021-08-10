export declare class Vec {
    /**
     * Clamp a value into a range.
     * @param n
     * @param min
     */
    static clamp(n: number, min: number): number;
    static clamp(n: number, min: number, max: number): number;
    /**
     * Negate a vector.
     * @param A
     */
    static neg: (A: number[]) => number[];
    /**
     * Add vectors.
     * @param A
     * @param B
     */
    static add: (A: number[], B: number[]) => number[];
    /**
     * Add scalar to vector.
     * @param A
     * @param B
     */
    static addScalar: (A: number[], n: number) => number[];
    /**
     * Subtract vectors.
     * @param A
     * @param B
     */
    static sub: (A: number[], B: number[]) => number[];
    /**
     * Subtract scalar from vector.
     * @param A
     * @param B
     */
    static subScalar: (A: number[], n: number) => number[];
    /**
     * Get the vector from vectors A to B.
     * @param A
     * @param B
     */
    static vec: (A: number[], B: number[]) => number[];
    /**
     * Vector multiplication by scalar
     * @param A
     * @param n
     */
    static mul: (A: number[], n: number) => number[];
    static mulV: (A: number[], B: number[]) => number[];
    /**
     * Vector division by scalar.
     * @param A
     * @param n
     */
    static div: (A: number[], n: number) => number[];
    /**
     * Vector division by vector.
     * @param A
     * @param n
     */
    static divV: (A: number[], B: number[]) => number[];
    /**
     * Perpendicular rotation of a vector A
     * @param A
     */
    static per: (A: number[]) => number[];
    /**
     * Dot product
     * @param A
     * @param B
     */
    static dpr: (A: number[], B: number[]) => number;
    /**
     * Cross product (outer product) | A X B |
     * @param A
     * @param B
     */
    static cpr: (A: number[], B: number[]) => number;
    /**
     * Length of the vector squared
     * @param A
     */
    static len2: (A: number[]) => number;
    /**
     * Length of the vector
     * @param A
     */
    static len: (A: number[]) => number;
    /**
     * Project A over B
     * @param A
     * @param B
     */
    static pry: (A: number[], B: number[]) => number;
    /**
     * Get normalized / unit vector.
     * @param A
     */
    static uni: (A: number[]) => number[];
    /**
     * Get normalized / unit vector.
     * @param A
     */
    static normalize: (A: number[]) => number[];
    /**
     * Get the tangent between two vectors.
     * @param A
     * @param B
     * @returns
     */
    static tangent: (A: number[], B: number[]) => number[];
    /**
     * Dist length from A to B squared.
     * @param A
     * @param B
     */
    static dist2: (A: number[], B: number[]) => number;
    /**
     * Dist length from A to B
     * @param A
     * @param B
     */
    static dist: (A: number[], B: number[]) => number;
    /**
     * A faster, though less accurate method for testing distances. Maybe faster?
     * @param A
     * @param B
     * @returns
     */
    static fastDist: (A: number[], B: number[]) => number[];
    /**
     * Angle between vector A and vector B in radians
     * @param A
     * @param B
     */
    static ang: (A: number[], B: number[]) => number;
    /**
     * Angle between vector A and vector B in radians
     * @param A
     * @param B
     */
    static angle: (A: number[], B: number[]) => number;
    /**
     * Mean between two vectors or mid vector between two vectors
     * @param A
     * @param B
     */
    static med: (A: number[], B: number[]) => number[];
    /**
     * Vector rotation by r (radians)
     * @param A
     * @param r rotation in radians
     */
    static rot: (A: number[], r: number) => number[];
    /**
     * Rotate a vector around another vector by r (radians)
     * @param A vector
     * @param C center
     * @param r rotation in radians
     */
    static rotWith: (A: number[], C: number[], r: number) => number[];
    /**
     * Check of two vectors are identical.
     * @param A
     * @param B
     */
    static isEqual: (A: number[], B: number[]) => boolean;
    /**
     * Interpolate vector A to B with a scalar t
     * @param A
     * @param B
     * @param t scalar
     */
    static lrp: (A: number[], B: number[], t: number) => number[];
    /**
     * Interpolate from A to B when curVAL goes fromVAL: number[] => to
     * @param A
     * @param B
     * @param from Starting value
     * @param to Ending value
     * @param s Strength
     */
    static int: (A: number[], B: number[], from: number, to: number, s?: number) => number[];
    /**
     * Get the angle between the three vectors A, B, and C.
     * @param p1
     * @param pc
     * @param p2
     */
    static ang3: (p1: number[], pc: number[], p2: number[]) => number;
    /**
     * Absolute value of a vector.
     * @param A
     * @returns
     */
    static abs: (A: number[]) => number[];
    static rescale: (a: number[], n: number) => number[];
    /**
     * Get whether p1 is left of p2, relative to pc.
     * @param p1
     * @param pc
     * @param p2
     */
    static isLeft: (p1: number[], pc: number[], p2: number[]) => number;
    static clockwise: (p1: number[], pc: number[], p2: number[]) => boolean;
    static round: (a: number[], d?: number) => number[];
    /**
     * Get the minimum distance from a point P to a line with a segment AB.
     * @param A The start of the line.
     * @param B The end of the line.
     * @param P A point.
     * @returns
     */
    /**
     * Get the nearest point on a line segment AB.
     * @param A The start of the line.
     * @param B The end of the line.
     * @param P A point.
     * @param clamp Whether to clamp the resulting point to the segment.
     * @returns
     */
    /**
     * Get the nearest point on a line with a known unit vector that passes through point A
     * @param A Any point on the line
     * @param u The unit vector for the line.
     * @param P A point not on the line to test.
     * @returns
     */
    static nearestPointOnLineThroughPoint: (A: number[], u: number[], P: number[]) => number[];
    /**
     * Distance between a point and a line with a known unit vector that passes through a point.
     * @param A Any point on the line
     * @param u The unit vector for the line.
     * @param P A point not on the line to test.
     * @returns
     */
    static distanceToLineThroughPoint: (A: number[], u: number[], P: number[]) => number;
    /**
     * Get the nearest point on a line segment between A and B
     * @param A The start of the line segment
     * @param B The end of the line segment
     * @param P The off-line point
     * @param clamp Whether to clamp the point between A and B.
     * @returns
     */
    static nearestPointOnLineSegment: (A: number[], B: number[], P: number[], clamp?: boolean) => number[];
    /**
     * Distance between a point and the nearest point on a line segment between A and B
     * @param A The start of the line segment
     * @param B The end of the line segment
     * @param P The off-line point
     * @param clamp Whether to clamp the point between A and B.
     * @returns
     */
    static distanceToLineSegment: (A: number[], B: number[], P: number[], clamp?: boolean) => number;
    /**
     * Push a point A towards point B by a given distance.
     * @param A
     * @param B
     * @param d
     * @returns
     */
    static nudge: (A: number[], B: number[], d: number) => number[];
    /**
     * Push a point in a given angle by a given distance.
     * @param A
     * @param B
     * @param d
     */
    static nudgeAtAngle: (A: number[], a: number, d: number) => number[];
    /**
     * Round a vector to a precision length.
     * @param a
     * @param n
     */
    static toPrecision: (a: number[], n?: number) => number[];
    /**
     * Get a number of points between two points.
     * @param a
     * @param b
     * @param steps
     */
    static pointsBetween: (a: number[], b: number[], steps?: number) => number[][];
}
export default Vec;
