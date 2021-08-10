import { TLBoundsCorner, TLBoundsEdge } from '@tldraw/core';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class TransformSession implements Session {
    id: string;
    scaleX: number;
    scaleY: number;
    transformType: TLBoundsEdge | TLBoundsCorner;
    origin: number[];
    snapshot: TransformSnapshot;
    constructor(data: Data, point: number[], transformType?: TLBoundsEdge | TLBoundsCorner);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], isAspectRatioLocked?: boolean, _altKey?: boolean) => Data;
    cancel: (data: Data) => {
        page: {
            shapes: {
                [x: string]: import("../../../..").TLDrawShape;
            };
            id: string;
            name?: string | undefined;
            childIndex?: number | undefined;
            bindings: Record<string, import("@tldraw/core").TLBinding>;
            backgroundColor?: string | undefined;
        };
        pageState: import("@tldraw/core").TLPageState;
        settings: import("../../../..").TLDrawSettings;
        appState: {
            selectedStyle: import("../../../..").ShapeStyles;
            currentStyle: import("../../../..").ShapeStyles;
            currentPageId: string;
            pages: Pick<import("@tldraw/core").TLPage<import("../../../..").TLDrawShape>, "id" | "childIndex" | "name">[];
            hoveredId?: string | undefined;
            activeTool: import("../../../..").TLDrawShapeType | "select";
            activeToolType?: import("../../../..").TLDrawToolType | "select" | undefined;
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
                    [k: string]: import("../../../..").TLDrawShape;
                };
            };
        };
        after: {
            page: {
                shapes: {
                    [k: string]: import("../../../..").TLDrawShape;
                };
            };
        };
    };
}
export declare function getTransformSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner): {
    type: TLBoundsEdge | TLBoundsCorner;
    hasUnlockedShapes: boolean;
    isAllAspectRatioLocked: boolean;
    initialShapes: import("../../../..").TLDrawShape[];
    initialBounds: import("@tldraw/core").TLBounds;
    shapeBounds: {
        [k: string]: {
            initialShape: import("../../../..").TLDrawShape;
            initialShapeBounds: import("@tldraw/core").TLBounds;
            transformOrigin: number[];
        };
    };
};
export declare type TransformSnapshot = ReturnType<typeof getTransformSnapshot>;
