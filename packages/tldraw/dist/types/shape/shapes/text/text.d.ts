/// <reference types="react" />
import { TLBounds, TLTransformInfo, TLRenderInfo } from '@tldraw/core';
import { TextShape, TLDrawShapeUtil, TLDrawShapeType, TLDrawToolType } from '../../shape-types';
export declare class Text extends TLDrawShapeUtil<TextShape> {
    type: TLDrawShapeType.Text;
    toolType: TLDrawToolType;
    canChangeAspectRatio: boolean;
    canBind: boolean;
    isEditableText: boolean;
    pathCache: WeakMap<number[], string>;
    defaultProps: {
        id: string;
        type: TLDrawShapeType.Text;
        name: string;
        parentId: string;
        childIndex: number;
        point: number[];
        rotation: number;
        text: string;
        style: import("../../shape-types").ShapeStyles;
    };
    shouldRender(prev: TextShape, next: TextShape): boolean;
    render(shape: TextShape, { ref, isBinding, isEditing, isDarkMode, onTextBlur, onTextChange, onTextFocus, onTextKeyDown, onTextKeyUp, }: TLRenderInfo): JSX.Element;
    renderIndicator(shape: TextShape): null;
    getBounds(shape: TextShape): TLBounds;
    getRotatedBounds(shape: TextShape): TLBounds;
    getCenter(shape: TextShape): number[];
    hitTest(shape: TextShape, point: number[]): boolean;
    hitTestBounds(shape: TextShape, bounds: TLBounds): boolean;
    transform(_shape: TextShape, bounds: TLBounds, { initialShape, scaleX, scaleY }: TLTransformInfo<TextShape>): {
        point: number[];
        style: {
            scale: number;
            color: import("../../shape-types").ColorStyle;
            size: import("../../shape-types").SizeStyle;
            dash: import("../../shape-types").DashStyle;
            isFilled?: boolean | undefined;
        };
        rotation?: undefined;
    } | {
        point: number[];
        rotation: number;
        style: {
            scale: number;
            color: import("../../shape-types").ColorStyle;
            size: import("../../shape-types").SizeStyle;
            dash: import("../../shape-types").DashStyle;
            isFilled?: boolean | undefined;
        };
    };
    transformSingle(_shape: TextShape, bounds: TLBounds, { initialShape, scaleX }: TLTransformInfo<TextShape>): {
        point: number[];
        style: {
            scale: number;
            color: import("../../shape-types").ColorStyle;
            size: import("../../shape-types").SizeStyle;
            dash: import("../../shape-types").DashStyle;
            isFilled?: boolean | undefined;
        };
    };
    onBoundsReset(shape: TextShape): {
        style: {
            scale: number;
            color: import("../../shape-types").ColorStyle;
            size: import("../../shape-types").SizeStyle;
            dash: import("../../shape-types").DashStyle;
            isFilled?: boolean | undefined;
        };
        point: number[];
    };
    onStyleChange(shape: TextShape): {
        point: number[];
    };
    shouldDelete(shape: TextShape): boolean;
}
