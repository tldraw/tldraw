/// <reference types="react" />
import { TLBounds, TLTransformInfo, TLRenderInfo } from '@tldraw/core';
import { RectangleShape, TLDrawShapeUtil, TLDrawShapeType, TLDrawToolType } from '../../shape-types';
export declare class Rectangle extends TLDrawShapeUtil<RectangleShape> {
    type: TLDrawShapeType.Rectangle;
    toolType: TLDrawToolType;
    pathCache: WeakMap<number[], string>;
    defaultProps: RectangleShape;
    shouldRender(prev: RectangleShape, next: RectangleShape): boolean;
    render(shape: RectangleShape, { isBinding, isDarkMode }: TLRenderInfo): JSX.Element;
    renderIndicator(shape: RectangleShape): JSX.Element;
    getBounds(shape: RectangleShape): TLBounds;
    getRotatedBounds(shape: RectangleShape): TLBounds;
    getCenter(shape: RectangleShape): number[];
    hitTest(shape: RectangleShape, point: number[]): boolean;
    hitTestBounds(shape: RectangleShape, bounds: TLBounds): boolean;
    transform(shape: RectangleShape, bounds: TLBounds, { initialShape, transformOrigin, scaleX, scaleY, }: TLTransformInfo<RectangleShape>): {
        point: number[];
        size: number[];
        rotation?: undefined;
    } | {
        size: number[];
        point: number[];
        rotation: number | undefined;
    };
    transformSingle(shape: RectangleShape, bounds: TLBounds, info: TLTransformInfo<RectangleShape>): {
        size: number[];
        point: number[];
    };
}
