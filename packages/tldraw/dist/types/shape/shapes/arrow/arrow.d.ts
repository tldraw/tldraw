/// <reference types="react" />
import { TLBounds, TLTransformInfo, TLRenderInfo, TLHandle, TLPointerInfo } from '@tldraw/core';
import { ArrowShape, Decoration, TLDrawShapeUtil, TLDrawShapeType, TLDrawToolType, DashStyle } from '../../shape-types';
export declare class Arrow extends TLDrawShapeUtil<ArrowShape> {
    type: TLDrawShapeType.Arrow;
    toolType: TLDrawToolType;
    canStyleFill: boolean;
    simplePathCache: WeakMap<ArrowShape, string>;
    pathCache: WeakMap<ArrowShape, string>;
    defaultProps: {
        id: string;
        type: TLDrawShapeType.Arrow;
        name: string;
        parentId: string;
        childIndex: number;
        point: number[];
        rotation: number;
        bend: number;
        handles: {
            start: {
                id: string;
                index: number;
                point: number[];
                canBind: boolean;
            };
            end: {
                id: string;
                index: number;
                point: number[];
                canBind: boolean;
            };
            bend: {
                id: string;
                index: number;
                point: number[];
            };
        };
        decorations: {
            end: Decoration;
        };
        style: {
            isFilled: boolean;
            color: import("../../shape-types").ColorStyle;
            size: import("../../shape-types").SizeStyle;
            dash: DashStyle;
            scale?: number | undefined;
        };
    };
    shouldRender: (prev: ArrowShape, next: ArrowShape) => boolean;
    render: (shape: ArrowShape, { isDarkMode }: TLRenderInfo) => JSX.Element;
    renderIndicator(shape: ArrowShape): JSX.Element;
    getBounds: (shape: ArrowShape) => TLBounds;
    getRotatedBounds: (shape: ArrowShape) => TLBounds;
    getCenter: (shape: ArrowShape) => number[];
    hitTest: () => boolean;
    hitTestBounds: (shape: ArrowShape, brushBounds: TLBounds) => boolean;
    transform: (_shape: ArrowShape, bounds: TLBounds, { initialShape, scaleX, scaleY }: TLTransformInfo<ArrowShape>) => Partial<ArrowShape>;
    onDoubleClickHandle: (shape: ArrowShape, handle: Partial<ArrowShape['handles']>) => this | {
        bend: number;
        handles: {
            bend: {
                point: number[];
                id: string;
                index: number;
            };
            start: TLHandle;
            end: TLHandle;
        };
        decorations?: undefined;
    } | {
        decorations: {
            start: Decoration | undefined;
            end?: Decoration | undefined;
            middle?: Decoration | undefined;
        };
        bend?: undefined;
        handles?: undefined;
    } | {
        decorations: {
            end: Decoration | undefined;
            start?: Decoration | undefined;
            middle?: Decoration | undefined;
        };
        bend?: undefined;
        handles?: undefined;
    };
    onHandleChange: (shape: ArrowShape, handles: ArrowShape['handles'], { shiftKey }: Partial<TLPointerInfo>) => {
        bend: number;
        handles: {
            bend: {
                point: number[];
                id: string;
                index: number;
            };
            start: TLHandle;
            end: TLHandle;
        };
    };
    onSessionComplete: (shape: ArrowShape) => {
        point: number[];
        handles: {
            start: {
                point: number[];
                id: string;
                index: number;
            };
            end: {
                point: number[];
                id: string;
                index: number;
            };
            bend: {
                point: number[];
                id: string;
                index: number;
            };
        };
    };
}
