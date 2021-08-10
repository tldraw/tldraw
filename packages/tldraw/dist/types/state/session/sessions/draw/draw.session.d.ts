import type { DrawShape } from '../../../../shape/shape-types';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class DrawSession implements Session {
    id: string;
    origin: number[];
    previous: number[];
    last: number[];
    points: number[][];
    snapshot: DrawSnapshot;
    isLocked?: boolean;
    lockedDirection?: 'horizontal' | 'vertical';
    constructor(data: Data, id: string, point: number[]);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], pressure: number, isLocked?: boolean) => {
        page: {
            shapes: {
                [x: string]: DrawShape | import("../../../../shape/shape-types").ArrowShape | import("../../../../shape/shape-types").EllipseShape | import("../../../../shape/shape-types").RectangleShape | import("../../../../shape/shape-types").TextShape | {
                    points: number[][];
                    type: import("../../../../shape/shape-types").TLDrawShapeType.Draw;
                    style: import("../../../../shape/shape-types").ShapeStyles;
                    id: string;
                    parentId: string;
                    childIndex: number;
                    name: string;
                    point: number[];
                    rotation?: number | undefined;
                    children?: string[] | undefined;
                    handles?: Record<string, import("@tldraw/core").TLHandle> | undefined;
                    isLocked?: boolean | undefined;
                    isHidden?: boolean | undefined;
                    isEditing?: boolean | undefined;
                    isGenerated?: boolean | undefined;
                    isAspectRatioLocked?: boolean | undefined;
                } | {
                    points: number[][];
                    type: import("../../../../shape/shape-types").TLDrawShapeType.Arrow;
                    bend: number;
                    handles: {
                        start: import("@tldraw/core").TLHandle;
                        bend: import("@tldraw/core").TLHandle;
                        end: import("@tldraw/core").TLHandle;
                    };
                    decorations?: {
                        start?: import("../../../../shape/shape-types").Decoration | undefined;
                        end?: import("../../../../shape/shape-types").Decoration | undefined;
                        middle?: import("../../../../shape/shape-types").Decoration | undefined;
                    } | undefined;
                    style: import("../../../../shape/shape-types").ShapeStyles;
                    id: string;
                    parentId: string;
                    childIndex: number;
                    name: string;
                    point: number[];
                    rotation?: number | undefined;
                    children?: string[] | undefined;
                    isLocked?: boolean | undefined;
                    isHidden?: boolean | undefined;
                    isEditing?: boolean | undefined;
                    isGenerated?: boolean | undefined;
                    isAspectRatioLocked?: boolean | undefined;
                } | {
                    points: number[][];
                    type: import("../../../../shape/shape-types").TLDrawShapeType.Ellipse;
                    radius: number[];
                    style: import("../../../../shape/shape-types").ShapeStyles;
                    id: string;
                    parentId: string;
                    childIndex: number;
                    name: string;
                    point: number[];
                    rotation?: number | undefined;
                    children?: string[] | undefined;
                    handles?: Record<string, import("@tldraw/core").TLHandle> | undefined;
                    isLocked?: boolean | undefined;
                    isHidden?: boolean | undefined;
                    isEditing?: boolean | undefined;
                    isGenerated?: boolean | undefined;
                    isAspectRatioLocked?: boolean | undefined;
                } | {
                    points: number[][];
                    type: import("../../../../shape/shape-types").TLDrawShapeType.Rectangle;
                    size: number[];
                    style: import("../../../../shape/shape-types").ShapeStyles;
                    id: string;
                    parentId: string;
                    childIndex: number;
                    name: string;
                    point: number[];
                    rotation?: number | undefined;
                    children?: string[] | undefined;
                    handles?: Record<string, import("@tldraw/core").TLHandle> | undefined;
                    isLocked?: boolean | undefined;
                    isHidden?: boolean | undefined;
                    isEditing?: boolean | undefined;
                    isGenerated?: boolean | undefined;
                    isAspectRatioLocked?: boolean | undefined;
                } | {
                    points: number[][];
                    type: import("../../../../shape/shape-types").TLDrawShapeType.Text;
                    text: string;
                    style: import("../../../../shape/shape-types").ShapeStyles;
                    id: string;
                    parentId: string;
                    childIndex: number;
                    name: string;
                    point: number[];
                    rotation?: number | undefined;
                    children?: string[] | undefined;
                    handles?: Record<string, import("@tldraw/core").TLHandle> | undefined;
                    isLocked?: boolean | undefined;
                    isHidden?: boolean | undefined;
                    isEditing?: boolean | undefined;
                    isGenerated?: boolean | undefined;
                    isAspectRatioLocked?: boolean | undefined;
                };
            };
            id: string;
            name?: string | undefined;
            childIndex?: number | undefined;
            bindings: Record<string, import("@tldraw/core").TLBinding>;
            backgroundColor?: string | undefined;
        };
        pageState: {
            selectedIds: string[];
            id: string;
            brush?: import("@tldraw/core").TLBounds | undefined;
            pointedId?: string | undefined;
            hoveredId?: string | undefined;
            editingId?: string | undefined;
            editingBindingId?: string | undefined;
            boundsRotation?: number | undefined;
            currentParentId?: string | undefined;
            camera: {
                point: number[];
                zoom: number;
            };
        };
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../../shape/shape-types").ShapeStyles;
            currentStyle: import("../../../../shape/shape-types").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core").TLPage<import("../../../../shape/shape-types").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape/shape-types").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape/shape-types").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
    cancel: (data: Data) => Data;
    complete: (data: Data) => {
        id: string;
        before: {
            page: {
                shapes: {
                    [x: string]: undefined;
                };
            };
            pageState: {
                selectedIds: never[];
            };
        };
        after: {
            page: {
                shapes: {
                    [x: string]: import("../../../../shape/shape-types").TLDrawShape;
                };
            };
            pageState: {
                selectedIds: never[];
            };
        };
    };
}
export declare function getDrawSnapshot(data: Data, shapeId: string): {
    id: string;
    point: number[];
    points: number[][];
};
export declare type DrawSnapshot = ReturnType<typeof getDrawSnapshot>;
