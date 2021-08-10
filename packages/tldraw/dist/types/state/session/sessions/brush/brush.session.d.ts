import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class BrushSession implements Session {
    id: string;
    origin: number[];
    snapshot: BrushSnapshot;
    constructor(data: Data, point: number[]);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], containMode?: boolean) => Data;
    cancel(data: Data): {
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
        page: import("@tldraw/core").TLPage<import("../../../../shape").TLDrawShape>;
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../../shape").ShapeStyles;
            currentStyle: import("../../../../shape").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core").TLPage<import("../../../../shape").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
    complete(data: Data): {
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
        page: import("@tldraw/core").TLPage<import("../../../../shape").TLDrawShape>;
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../../shape").ShapeStyles;
            currentStyle: import("../../../../shape").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core").TLPage<import("../../../../shape").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
}
/**
 * Get a snapshot of the current selected ids, for each shape that is
 * not already selected, the shape's id and a test to see whether the
 * brush will intersect that shape. For tests, start broad -> fine.
 */
export declare function getBrushSnapshot(data: Data): {
    selectedIds: string[];
    shapesToTest: {
        id: string;
        util: import("../../../../shape").TLDrawShapeUtil<import("../../../../shape").TLDrawShape>;
        bounds: import("@tldraw/core").TLBounds;
        selectId: string;
    }[];
};
export declare type BrushSnapshot = ReturnType<typeof getBrushSnapshot>;
