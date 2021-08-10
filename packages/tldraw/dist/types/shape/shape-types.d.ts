import { TLShape, TLShapeUtil, TLHandle } from '@tldraw/core';
export declare enum TLDrawToolType {
    Draw = "draw",
    Bounds = "bounds",
    Point = "point",
    Handle = "handle",
    Points = "points",
    Text = "text"
}
export declare enum TLDrawShapeType {
    Ellipse = "ellipse",
    Rectangle = "rectangle",
    Draw = "draw",
    Arrow = "arrow",
    Text = "text"
}
export declare enum Decoration {
    Arrow = "Arrow"
}
export interface TLDrawBaseShape extends TLShape {
    style: ShapeStyles;
    type: TLDrawShapeType;
}
export interface DrawShape extends TLDrawBaseShape {
    type: TLDrawShapeType.Draw;
    points: number[][];
}
export interface ArrowShape extends TLDrawBaseShape {
    type: TLDrawShapeType.Arrow;
    bend: number;
    handles: {
        start: TLHandle;
        bend: TLHandle;
        end: TLHandle;
    };
    decorations?: {
        start?: Decoration;
        end?: Decoration;
        middle?: Decoration;
    };
}
export interface EllipseShape extends TLDrawBaseShape {
    type: TLDrawShapeType.Ellipse;
    radius: number[];
}
export interface RectangleShape extends TLDrawBaseShape {
    type: TLDrawShapeType.Rectangle;
    size: number[];
}
export interface TextShape extends TLDrawBaseShape {
    type: TLDrawShapeType.Text;
    text: string;
}
export declare type TLDrawShape = RectangleShape | EllipseShape | DrawShape | ArrowShape | TextShape;
export declare abstract class TLDrawShapeUtil<T extends TLDrawShape> extends TLShapeUtil<T> {
    abstract toolType: TLDrawToolType;
}
export declare type TLDrawShapeUtils = Record<TLDrawShapeType, TLDrawShapeUtil<TLDrawShape>>;
export declare enum ColorStyle {
    White = "White",
    LightGray = "LightGray",
    Gray = "Gray",
    Black = "Black",
    Green = "Green",
    Cyan = "Cyan",
    Blue = "Blue",
    Indigo = "Indigo",
    Violet = "Violet",
    Red = "Red",
    Orange = "Orange",
    Yellow = "Yellow"
}
export declare enum SizeStyle {
    Small = "Small",
    Medium = "Medium",
    Large = "Large"
}
export declare enum DashStyle {
    Draw = "Draw",
    Solid = "Solid",
    Dashed = "Dashed",
    Dotted = "Dotted"
}
export declare enum FontSize {
    Small = "Small",
    Medium = "Medium",
    Large = "Large",
    ExtraLarge = "ExtraLarge"
}
export declare type ShapeStyles = {
    color: ColorStyle;
    size: SizeStyle;
    dash: DashStyle;
    isFilled?: boolean;
    scale?: number;
};
export declare type PropsOfType<U> = {
    [K in keyof TLDrawShape]: TLDrawShape[K] extends any ? TLDrawShape[K] extends U ? K : never : never;
}[keyof TLDrawShape];
export declare type Theme = 'dark' | 'light';
export declare type Difference<A, B, C = A> = A extends B ? never : C;
export declare type Intersection<A, B, C = A> = A extends B ? C : never;
export declare type FilteredKeys<T, U> = {
    [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];
export declare type RequiredKeys<T> = {
    [K in keyof T]-?: Difference<Record<string, unknown>, Pick<T, K>, K>;
}[keyof T];
export declare type MembersWithRequiredKey<T, U> = {
    [P in keyof T]: Intersection<U, RequiredKeys<T[P]>, T[P]>;
}[keyof T];
export declare type MappedByType<U extends string, T extends {
    type: U;
}> = {
    [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never;
};
export declare type ShapesWithProp<U> = MembersWithRequiredKey<MappedByType<TLDrawShapeType, TLDrawShape>, U>;
export {};
