import { Theme, ColorStyle, DashStyle, ShapeStyles, SizeStyle } from './shape-types';
export declare const strokes: Record<Theme, Record<ColorStyle, string>>;
export declare const fills: Record<Theme, Record<ColorStyle, string>>;
export declare function getStrokeWidth(size: SizeStyle): number;
export declare function getFontSize(size: SizeStyle): number;
export declare function getFontStyle(style: ShapeStyles): string;
export declare function getShapeStyle(style: ShapeStyles, isDarkMode?: boolean): {
    stroke: string;
    fill: string;
    strokeWidth: number;
};
export declare const defaultStyle: ShapeStyles;
/**
 * Get balanced dash-strokearray and dash-strokeoffset properties for a path of a given length.
 * @param length The length of the path.
 * @param strokeWidth The shape's stroke-width property.
 * @param style The stroke's style: "dashed" or "dotted" (default "dashed").
 * @param snap An interval for dashes (e.g. 4 will produce arrays with 4, 8, 16, etc dashes).
 */
export declare function getPerfectDashProps(length: number, strokeWidth: number, style: DashStyle, snap?: number): {
    strokeDasharray: string;
    strokeDashoffset: string;
};
