export declare class Svg {
    static ellipse: (A: number[], r: number) => string;
    static moveTo: (v: number[]) => string;
    static lineTo: (v: number[]) => string;
    static line: (a: number[], ...pts: number[][]) => string;
    static hLineTo: (v: number[]) => string;
    static vLineTo: (v: number[]) => string;
    static bezierTo: (A: number[], B: number[], C: number[]) => string;
    static arcTo: (C: number[], r: number, A: number[], B: number[]) => string;
    static closePath: () => string;
    static rectTo: (A: number[]) => string;
    static getPointAtLength: (path: SVGPathElement, length: number) => number[];
}
export default Svg;
