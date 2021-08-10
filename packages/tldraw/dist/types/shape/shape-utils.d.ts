import { TLDrawShapeType, TLDrawShape, TLDrawShapeUtil, TLDrawShapeUtils } from './shape-types';
export declare const tldrawShapeUtils: TLDrawShapeUtils;
export declare type ShapeByType<T extends keyof TLDrawShapeUtils> = TLDrawShapeUtils[T];
export declare function getShapeUtilsByType<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T>;
export declare function getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T>;
export declare function createShape<TLDrawShape>(type: TLDrawShapeType, props: Partial<TLDrawShape>): import("./shape-types").TLDrawShape;
