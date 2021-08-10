/// <reference types="react" />
import { TLBounds, TLTransformInfo, TLRenderInfo } from '@tldraw/core';
import { DrawShape, TLDrawShapeUtil, TLDrawShapeType, TLDrawToolType } from '../../shape-types';
export declare class Draw extends TLDrawShapeUtil<DrawShape> {
    type: TLDrawShapeType.Draw;
    toolType: TLDrawToolType;
    pointsBoundsCache: WeakMap<number[][], TLBounds>;
    rotatedCache: WeakMap<DrawShape, number[][]>;
    drawPathCache: WeakMap<number[][], string>;
    simplePathCache: WeakMap<number[][], string>;
    polygonCache: WeakMap<number[][], string>;
    defaultProps: DrawShape;
    shouldRender(prev: DrawShape, next: DrawShape): boolean;
    render(shape: DrawShape, { isDarkMode }: TLRenderInfo): JSX.Element;
    renderIndicator(shape: DrawShape): JSX.Element;
    getBounds(shape: DrawShape): TLBounds;
    getRotatedBounds(shape: DrawShape): TLBounds;
    getCenter(shape: DrawShape): number[];
    hitTest(): boolean;
    hitTestBounds(shape: DrawShape, brushBounds: TLBounds): boolean;
    transform(shape: DrawShape, bounds: TLBounds, { initialShape, scaleX, scaleY }: TLTransformInfo<DrawShape>): Partial<DrawShape>;
    transformSingle(shape: DrawShape, bounds: TLBounds, info: TLTransformInfo<DrawShape>): Partial<DrawShape>;
    onSessionComplete(shape: DrawShape): Partial<DrawShape>;
}
