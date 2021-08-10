import type { TextShape } from '../../../../shape';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class TextSession implements Session {
    id: string;
    initialShape: TextShape;
    constructor(data: Data, id?: string);
    start: (data: Data) => {
        pageState: {
            editingId: string;
            id: string;
            brush?: import("@tldraw/core/dist/types").TLBounds | undefined;
            pointedId?: string | undefined;
            hoveredId?: string | undefined;
            editingBindingId?: string | undefined;
            boundsRotation?: number | undefined;
            currentParentId?: string | undefined;
            selectedIds: string[];
            camera: {
                point: number[];
                zoom: number;
            };
        };
        page: import("@tldraw/core/dist/types").TLPage<import("../../../../shape").TLDrawShape>;
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../../shape").ShapeStyles;
            currentStyle: import("../../../../shape").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core/dist/types").TLPage<import("../../../../shape").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
    update: (data: Data, text: string) => Data;
    cancel: (data: Data) => {
        page: {
            shapes: {
                [x: string]: import("../../../../shape").TLDrawShape;
            };
            id: string;
            name?: string | undefined;
            childIndex?: number | undefined;
            bindings: Record<string, import("@tldraw/core/dist/types").TLBinding>;
            backgroundColor?: string | undefined;
        };
        pageState: {
            editingId: undefined;
            id: string;
            brush?: import("@tldraw/core/dist/types").TLBounds | undefined;
            pointedId?: string | undefined;
            hoveredId?: string | undefined;
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
            pages: Pick<import("@tldraw/core/dist/types").TLPage<import("../../../../shape").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../../shape").TLDrawShapeType | "select";
            activeToolType?: import("../../../../shape").TLDrawToolType | "select" | undefined;
            isToolLocked: boolean;
            isStyleOpen: boolean;
            isEmptyCanvas: boolean;
        };
    };
    complete(data: Data): Data | {
        id: string;
        before: {
            page: {
                shapes: {
                    [x: string]: TextShape;
                };
            };
            pageState: {
                editingId: undefined;
            };
        };
        after: {
            page: {
                shapes: {
                    [x: string]: import("../../../../shape").TLDrawShape;
                };
            };
            pageState: {
                editingId: undefined;
            };
        };
    };
}
