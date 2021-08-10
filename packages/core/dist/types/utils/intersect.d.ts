import type { TLBounds, TLIntersection } from '../types';
export declare class Intersect {
    static ray: {
        ray(p0: number[], n0: number[], p1: number[], n1: number[]): TLIntersection;
        lineSegment(origin: number[], direction: number[], a1: number[], a2: number[]): TLIntersection;
        rectangle(origin: number[], direction: number[], point: number[], size: number[]): TLIntersection[];
        ellipse(origin: number[], direction: number[], center: number[], rx: number, ry: number, rotation: number): TLIntersection;
        bounds(origin: number[], direction: number[], bounds: TLBounds): TLIntersection[];
    };
    static lineSegment: {
        ray(a1: number[], a2: number[], origin: number[], direction: number[]): TLIntersection;
        lineSegment(a1: number[], a2: number[], b1: number[], b2: number[]): TLIntersection;
        rectangle(a1: number[], a2: number[], point: number[], size: number[]): TLIntersection[];
        arc(a1: number[], a2: number[], center: number[], radius: number, start: number[], end: number[]): TLIntersection;
        circle(a1: number[], a2: number[], c: number[], r: number): TLIntersection;
        ellipse(a1: number[], a2: number[], center: number[], rx: number, ry: number, rotation?: number): TLIntersection;
        bounds(a1: number[], a2: number[], bounds: TLBounds): TLIntersection[];
        polyline(a1: number[], a2: number[], points: number[][]): TLIntersection[];
    };
    static rectangle: {
        ray(point: number[], size: number[], origin: number[], direction: number[]): TLIntersection[];
        lineSegment(point: number[], size: number[], a1: number[], a2: number[]): TLIntersection[];
        rectangle(point1: number[], size1: number[], point2: number[], size2: number[]): TLIntersection[];
        arc(point: number[], size: number[], center: number[], radius: number, start: number[], end: number[]): TLIntersection[];
        circle(point: number[], size: number[], c: number[], r: number): TLIntersection[];
        ellipse(point: number[], size: number[], c: number[], rx: number, ry: number, rotation?: number): TLIntersection[];
        bounds(point: number[], size: number[], bounds: TLBounds): TLIntersection[];
        polyline(point: number[], size: number[], points: number[][]): TLIntersection[];
    };
    static arc: {
        lineSegment(center: number[], radius: number, start: number[], end: number[], a1: number[], a2: number[]): TLIntersection;
        rectangle(center: number[], radius: number, start: number[], end: number[], point: number[], size: number[]): TLIntersection[];
        bounds(center: number[], radius: number, start: number[], end: number[], bounds: TLBounds): TLIntersection[];
    };
    static circle: {
        lineSegment(c: number[], r: number, a1: number[], a2: number[]): TLIntersection;
        circle(c1: number[], r1: number, c2: number[], r2: number): TLIntersection;
        rectangle(c: number[], r: number, point: number[], size: number[]): TLIntersection[];
        bounds(c: number[], r: number, bounds: TLBounds): TLIntersection[];
    };
    static ellipse: {
        ray(center: number[], rx: number, ry: number, rotation: number, point: number[], direction: number[]): TLIntersection;
        lineSegment(center: number[], rx: number, ry: number, rotation: number | undefined, a1: number[], a2: number[]): TLIntersection;
        rectangle(center: number[], rx: number, ry: number, rotation: number | undefined, point: number[], size: number[]): TLIntersection[];
        ellipse(_c1: number[], _rx1: number, _ry1: number, _r1: number, _c2: number[], _rx2: number, _ry2: number, _r2: number): TLIntersection;
        circle(c: number[], rx: number, ry: number, rotation: number, c2: number[], r2: number): TLIntersection;
        bounds(c: number[], rx: number, ry: number, rotation: number, bounds: TLBounds): TLIntersection[];
    };
    static bounds: {
        ray(bounds: TLBounds, origin: number[], direction: number[]): TLIntersection[];
        lineSegment(bounds: TLBounds, a1: number[], a2: number[]): TLIntersection[];
        rectangle(bounds: TLBounds, point: number[], size: number[]): TLIntersection[];
        bounds(bounds1: TLBounds, bounds2: TLBounds): TLIntersection[];
        arc(bounds: TLBounds, center: number[], radius: number, start: number[], end: number[]): TLIntersection[];
        circle(bounds: TLBounds, c: number[], r: number): TLIntersection[];
        ellipse(bounds: TLBounds, c: number[], rx: number, ry: number, rotation?: number): TLIntersection[];
        polyline(bounds: TLBounds, points: number[][]): TLIntersection[];
    };
    static polyline: {
        lineSegment(points: number[][], a1: number[], a2: number[]): TLIntersection[];
        rectangle(points: number[][], point: number[], size: number[]): TLIntersection[];
        bounds(points: number[][], bounds: TLBounds): TLIntersection[];
    };
}
export default Intersect;
