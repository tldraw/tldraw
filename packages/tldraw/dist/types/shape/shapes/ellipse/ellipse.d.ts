/// <reference types="react" />
import { TLTransformInfo, TLBounds, TLRenderInfo } from '@tldraw/core';
import { EllipseShape, TLDrawShapeType, TLDrawShapeUtil, TLDrawToolType } from '../../shape-types';
export declare class Ellipse extends TLDrawShapeUtil<EllipseShape> {
    type: TLDrawShapeType.Ellipse;
    toolType: TLDrawToolType;
    pathCache: WeakMap<EllipseShape, string>;
    defaultProps: {
        id: string;
        type: TLDrawShapeType.Ellipse;
        name: string;
        parentId: string;
        childIndex: number;
        point: number[];
        radius: number[];
        rotation: number;
        style: import("../../shape-types").ShapeStyles;
    };
    shouldRender(prev: EllipseShape, next: EllipseShape): boolean;
    render(shape: EllipseShape, { isDarkMode, isBinding }: TLRenderInfo): JSX.Element;
    renderIndicator(shape: EllipseShape): JSX.Element;
    getBounds(shape: EllipseShape): TLBounds;
    getRotatedBounds(shape: EllipseShape): TLBounds;
    getCenter(shape: EllipseShape): number[];
    hitTest(shape: EllipseShape, point: number[]): boolean;
    hitTestBounds(shape: EllipseShape, bounds: TLBounds): boolean;
    transform(shape: EllipseShape, bounds: TLBounds, { scaleX, scaleY, initialShape }: TLTransformInfo<EllipseShape>): {
        point: number[];
        radius: number[];
        rotation: number;
    };
    transformSingle(shape: EllipseShape, bounds: TLBounds): {
        point: number[];
        radius: number[];
    };
}
