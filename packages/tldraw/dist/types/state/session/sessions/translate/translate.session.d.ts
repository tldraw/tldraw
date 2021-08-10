import type { TLDrawShape } from '../../../../shape';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class TranslateSession implements Session {
    id: string;
    delta: number[];
    prev: number[];
    origin: number[];
    snapshot: TranslateSnapshot;
    isCloning: boolean;
    constructor(data: Data, point: number[]);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], isAligned?: boolean, isCloning?: boolean) => {
        page: {
            id: string;
            name?: string | undefined;
            childIndex?: number | undefined;
            shapes: Record<string, TLDrawShape>;
            bindings: Record<string, import("@tldraw/core").TLBinding>;
            backgroundColor?: string | undefined;
        };
        shapes: {
            [x: string]: TLDrawShape;
        };
        pageState: {
            id: string;
            brush?: import("@tldraw/core").TLBounds | undefined;
            pointedId?: string | undefined;
            hoveredId?: string | undefined;
            editingId?: string | undefined;
            editingBindingId?: string | undefined;
            boundsRotation?: number | undefined;
            currentParentId?: string | undefined;
            selectedIds: string[];
            camera: {
                point: number[];
                zoom: number;
            };
        };
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../../shape").ShapeStyles;
            currentStyle: import("../../../../shape").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core").TLPage<TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
    cancel: (data: Data) => Data;
    complete(data: Data): {
        id: string;
        before: {
            page: {
                shapes: {
                    [x: string]: TLDrawShape | {
                        point: number[];
                    } | undefined;
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
                selectedStyle: import("../../../../shape").ShapeStyles;
                currentStyle: import("../../../../shape").ShapeStyles;
                currentPageId: string;
                pages: Pick<import("@tldraw/core").TLPage<TLDrawShape>, "id" | "childIndex" | "name">[];
                hoveredId?: string | undefined;
                activeTool: import("../../../../shape").TLDrawShapeType | "select";
                activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
                isToolLocked: boolean;
                isStyleOpen: boolean;
                isEmptyCanvas: boolean;
            };
        };
        after: {
            page: {
                shapes: {
                    [x: string]: TLDrawShape | {
                        point: number[];
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
                selectedStyle: import("../../../../shape").ShapeStyles;
                currentStyle: import("../../../../shape").ShapeStyles;
                currentPageId: string;
                pages: Pick<import("@tldraw/core").TLPage<TLDrawShape>, "id" | "childIndex" | "name">[];
                hoveredId?: string | undefined;
                activeTool: import("../../../../shape").TLDrawShapeType | "select";
                activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
                isToolLocked: boolean;
                isStyleOpen: boolean;
                isEmptyCanvas: boolean;
            };
        };
    };
}
export declare function getTranslateSnapshot(data: Data): {
    selectedIds: string[];
    hasUnlockedShapes: boolean;
    initialParents: {
        id: string;
        children: string[] | undefined;
    }[];
    initialShapes: {
        id: string;
        point: number[];
        parentId: string;
    }[];
    clones: (import("../../../../shape").DrawShape | import("../../../../shape").ArrowShape | import("../../../../shape").EllipseShape | import("../../../../shape").RectangleShape | import("../../../../shape").TextShape)[];
};
export declare type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>;
