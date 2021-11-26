export declare type TLIntersection = {
    didIntersect: boolean;
    message: string;
    points: number[][];
};
export interface TLBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    rotation?: number;
}
/**
 * Find the intersection between a ray and a ray.
 * @param p0 The first ray's point
 * @param n0 The first ray's direction vector.
 * @param p1 The second ray's point.
 * @param n1 The second ray's direction vector.
 */
export declare function intersectRayRay(p0: number[], n0: number[], p1: number[], n1: number[]): TLIntersection;
/**
 * Find the intersections between a ray and a line segment.
 * @param origin
 * @param direction
 * @param a1
 * @param a2
 */
export declare function intersectRayLineSegment(origin: number[], direction: number[], a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between a ray and a rectangle.
 * @param origin
 * @param direction
 * @param point
 * @param size
 * @param rotation
 */
export declare function intersectRayRectangle(origin: number[], direction: number[], point: number[], size: number[], rotation?: number): TLIntersection[];
/**
 * Find the intersections between a ray and an ellipse.
 * @param origin
 * @param direction
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 */
export declare function intersectRayEllipse(origin: number[], direction: number[], center: number[], rx: number, ry: number, rotation: number): TLIntersection;
/**
 * Find the intersections between a ray and a bounding box.
 * @param origin
 * @param direction
 * @param bounds
 * @param rotation
 */
export declare function intersectRayBounds(origin: number[], direction: number[], bounds: TLBounds, rotation?: number): TLIntersection[];
/**
 * Find the intersection between a line segment and a ray.
 * @param a1
 * @param a2
 * @param origin
 * @param direction
 */
export declare function intersectLineSegmentRay(a1: number[], a2: number[], origin: number[], direction: number[]): TLIntersection;
/**
 * Find the intersection between a line segment and a line segment.
 * @param a1
 * @param a2
 * @param b1
 * @param b2
 */
export declare function intersectLineSegmentLineSegment(a1: number[], a2: number[], b1: number[], b2: number[]): TLIntersection;
/**
 * Find the intersections between a line segment and a rectangle.
 * @param a1
 * @param a2
 * @param point
 * @param size
 */
export declare function intersectLineSegmentRectangle(a1: number[], a2: number[], point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a line segment and an arc.
 * @param a1
 * @param a2
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export declare function intersectLineSegmentArc(a1: number[], a2: number[], center: number[], radius: number, start: number[], end: number[]): TLIntersection;
/**
 * Find the intersections between a line segment and a circle.
 * @param a1
 * @param a2
 * @param c
 * @param r
 */
export declare function intersectLineSegmentCircle(a1: number[], a2: number[], c: number[], r: number): TLIntersection;
/**
 * Find the intersections between a line segment and an ellipse.
 * @param a1
 * @param a2
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 */
export declare function intersectLineSegmentEllipse(a1: number[], a2: number[], center: number[], rx: number, ry: number, rotation?: number): TLIntersection;
/**
 * Find the intersections between a line segment and a bounding box.
 * @param a1
 * @param a2
 * @param bounds
 */
export declare function intersectLineSegmentBounds(a1: number[], a2: number[], bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between a line segment and a polyline.
 * @param a1
 * @param a2
 * @param points
 */
export declare function intersectLineSegmentPolyline(a1: number[], a2: number[], points: number[][]): TLIntersection;
/**
 * Find the intersections between a line segment and a closed polygon.
 * @param a1
 * @param a2
 * @param points
 */
export declare function intersectLineSegmentPolygon(a1: number[], a2: number[], points: number[][]): TLIntersection;
/**
 * Find the intersections between a rectangle and a ray.
 * @param point
 * @param size
 * @param rotation
 * @param origin
 * @param direction
 */
export declare function intersectRectangleRay(point: number[], size: number[], rotation: number, origin: number[], direction: number[]): TLIntersection[];
/**
 * Find the intersections between a rectangle and a line segment.
 * @param point
 * @param size
 * @param a1
 * @param a2
 */
export declare function intersectRectangleLineSegment(point: number[], size: number[], a1: number[], a2: number[]): TLIntersection[];
/**
 * Find the intersections between a rectangle and a rectangle.
 * @param point1
 * @param size1
 * @param point2
 * @param size2
 */
export declare function intersectRectangleRectangle(point1: number[], size1: number[], point2: number[], size2: number[]): TLIntersection[];
/**
 * Find the intersections between a rectangle and an arc.
 * @param point
 * @param size
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export declare function intersectRectangleArc(point: number[], size: number[], center: number[], radius: number, start: number[], end: number[]): TLIntersection[];
/**
 * Find the intersections between a rectangle and a circle.
 * @param point
 * @param size
 * @param c
 * @param r
 */
export declare function intersectRectangleCircle(point: number[], size: number[], c: number[], r: number): TLIntersection[];
/**
 * Find the intersections between a rectangle and an ellipse.
 * @param point
 * @param size
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 */
export declare function intersectRectangleEllipse(point: number[], size: number[], c: number[], rx: number, ry: number, rotation?: number): TLIntersection[];
/**
 * Find the intersections between a rectangle and a bounding box.
 * @param point
 * @param size
 * @param bounds
 */
export declare function intersectRectangleBounds(point: number[], size: number[], bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between a rectangle and a polyline.
 * @param point
 * @param size
 * @param points
 */
export declare function intersectRectanglePolyline(point: number[], size: number[], points: number[][]): TLIntersection[];
/**
 * Find the intersections between a rectangle and a polygon.
 * @param point
 * @param size
 * @param points
 */
export declare function intersectRectanglePolygon(point: number[], size: number[], points: number[][]): TLIntersection[];
/**
 * Find the intersections between a arc and a line segment.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param a1
 * @param a2
 */
export declare function intersectArcLineSegment(center: number[], radius: number, start: number[], end: number[], a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between a arc and a rectangle.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param point
 * @param size
 */
export declare function intersectArcRectangle(center: number[], radius: number, start: number[], end: number[], point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a arc and a bounding box.
 * @param center
 * @param radius
 * @param start
 * @param end
 * @param bounds
 */
export declare function intersectArcBounds(center: number[], radius: number, start: number[], end: number[], bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between a circle and a line segment.
 * @param c
 * @param r
 * @param a1
 * @param a2
 */
export declare function intersectCircleLineSegment(c: number[], r: number, a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between a circle and a circle.
 * @param c1
 * @param r1
 * @param c2
 * @param r2
 */
export declare function intersectCircleCircle(c1: number[], r1: number, c2: number[], r2: number): TLIntersection;
/**
 * Find the intersections between a circle and a rectangle.
 * @param c
 * @param r
 * @param point
 * @param size
 */
export declare function intersectCircleRectangle(c: number[], r: number, point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a circle and a bounding box.
 * @param c
 * @param r
 * @param bounds
 */
export declare function intersectCircleBounds(c: number[], r: number, bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between an ellipse and a ray.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param point
 * @param direction
 */
export declare function intersectEllipseRay(center: number[], rx: number, ry: number, rotation: number, point: number[], direction: number[]): TLIntersection;
/**
 * Find the intersections between an ellipse and a line segment.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param a1
 * @param a2
 */
export declare function intersectEllipseLineSegment(center: number[], rx: number, ry: number, rotation: number | undefined, a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between an ellipse and a rectangle.
 * @param center
 * @param rx
 * @param ry
 * @param rotation
 * @param point
 * @param size
 */
export declare function intersectEllipseRectangle(center: number[], rx: number, ry: number, rotation: number | undefined, point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between an ellipse and an ellipse.
 * Adapted from https://gist.github.com/drawable/92792f59b6ff8869d8b1
 * @param _c1
 * @param _rx1
 * @param _ry1
 * @param _r1
 * @param _c2
 * @param _rx2
 * @param _ry2
 * @param _r2
 */
export declare function intersectEllipseEllipse(_c1: number[], _rx1: number, _ry1: number, _r1: number, _c2: number[], _rx2: number, _ry2: number, _r2: number): TLIntersection;
/**
 * Find the intersections between an ellipse and a circle.
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 * @param c2
 * @param r2
 */
export declare function intersectEllipseCircle(c: number[], rx: number, ry: number, rotation: number, c2: number[], r2: number): TLIntersection;
/**
 * Find the intersections between an ellipse and a bounding box.
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 * @param bounds
 */
export declare function intersectEllipseBounds(c: number[], rx: number, ry: number, rotation: number, bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between a bounding box and a ray.
 * @param bounds
 * @param origin
 * @param direction
 */
export declare function intersectBoundsRay(bounds: TLBounds, origin: number[], direction: number[]): TLIntersection[];
/**
 * Find the intersections between a bounding box and a line segment.
 * @param bounds
 * @param a1
 * @param a2
 */
export declare function intersectBoundsLineSegment(bounds: TLBounds, a1: number[], a2: number[]): TLIntersection[];
/**
 * Find the intersections between a bounding box and a rectangle.
 * @param bounds
 * @param point
 * @param size
 */
export declare function intersectBoundsRectangle(bounds: TLBounds, point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a bounding box and a bounding box.
 * @param bounds1
 * @param bounds2
 */
export declare function intersectBoundsBounds(bounds1: TLBounds, bounds2: TLBounds): TLIntersection[];
/**
 * Find the intersections between a bounding box and an arc.
 * @param bounds
 * @param center
 * @param radius
 * @param start
 * @param end
 */
export declare function intersectBoundsArc(bounds: TLBounds, center: number[], radius: number, start: number[], end: number[]): TLIntersection[];
/**
 * Find the intersections between a bounding box and a circle.
 * @param bounds
 * @param c
 * @param r
 */
export declare function intersectBoundsCircle(bounds: TLBounds, c: number[], r: number): TLIntersection[];
/**
 * Find the intersections between a bounding box and an ellipse.
 * @param bounds
 * @param c
 * @param rx
 * @param ry
 * @param rotation
 */
export declare function intersectBoundsEllipse(bounds: TLBounds, c: number[], rx: number, ry: number, rotation?: number): TLIntersection[];
/**
 * Find the intersections between a bounding box and a polyline.
 * @param bounds
 * @param points
 */
export declare function intersectBoundsPolyline(bounds: TLBounds, points: number[][]): TLIntersection[];
/**
 * Find the intersections between a bounding box and a polygon.
 * @param bounds
 * @param points
 */
export declare function intersectBoundsPolygon(bounds: TLBounds, points: number[][]): TLIntersection[];
/**
 * Find the intersections between a polyline and a line segment.
 * @param points
 * @param a1
 * @param a2
 */
export declare function intersectPolylineLineSegment(points: number[][], a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between a polyline and a rectangle.
 * @param points
 * @param point
 * @param size
 */
export declare function intersectPolylineRectangle(points: number[][], point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a polyline and a bounding box.
 * @param points
 * @param bounds
 */
export declare function intersectPolylineBounds(points: number[][], bounds: TLBounds): TLIntersection[];
/**
 * Find the intersections between a polygon nd a line segment.
 * @param points
 * @param a1
 * @param a2
 */
export declare function intersectPolygonLineSegment(points: number[][], a1: number[], a2: number[]): TLIntersection;
/**
 * Find the intersections between a polygon and a rectangle.
 * @param points
 * @param point
 * @param size
 */
export declare function intersectPolygonRectangle(points: number[][], point: number[], size: number[]): TLIntersection[];
/**
 * Find the intersections between a polygon and a bounding box.
 * @param points
 * @param bounds
 */
export declare function intersectPolygonBounds(points: number[][], bounds: TLBounds): TLIntersection[];
