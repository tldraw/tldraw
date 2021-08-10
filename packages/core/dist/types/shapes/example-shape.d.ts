/// <reference types="react" />
import { TLShapeUtil, TLShape, TLBounds, TLRenderInfo, TLTransformInfo } from '../types';
export declare class ExampleShape extends TLShapeUtil<TLShape> {
    type: string;
    defaultProps: {
        id: string;
        type: string;
        parentId: string;
        childIndex: number;
        name: string;
        point: number[];
        rotation: number;
    };
    create(props: Partial<TLShape>): {
        id: string;
        type: string;
        parentId: string;
        childIndex: number;
        name: string;
        point: number[];
        rotation: number;
        children?: string[] | undefined;
        handles?: Record<string, import("../types").TLHandle> | undefined;
        isLocked?: boolean | undefined;
        isHidden?: boolean | undefined;
        isEditing?: boolean | undefined;
        isGenerated?: boolean | undefined;
        isAspectRatioLocked?: boolean | undefined;
    };
    render(shape: TLShape, info: TLRenderInfo): JSX.Element;
    renderIndicator(shape: TLShape): JSX.Element;
    shouldRender(prev: TLShape, next: TLShape): boolean;
    getBounds(shape: TLShape): TLBounds;
    getRotatedBounds(shape: TLShape): TLBounds;
    getCenter(shape: TLShape): number[];
    hitTest(shape: TLShape, point: number[]): boolean;
    hitTestBounds(shape: TLShape, bounds: TLBounds): boolean;
    transform(shape: TLShape, bounds: TLBounds, _info: TLTransformInfo<TLShape>): TLShape;
    transformSingle(shape: TLShape, bounds: TLBounds, info: TLTransformInfo<TLShape>): TLShape;
}
