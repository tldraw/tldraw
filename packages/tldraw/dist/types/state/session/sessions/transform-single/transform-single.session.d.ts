import { TLBoundsCorner, TLBoundsEdge } from '@tldraw/core';
import type { TLDrawShape } from '../../../../shape';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class TransformSingleSession implements Session {
    id: string;
    commandId: string;
    transformType: TLBoundsEdge | TLBoundsCorner;
    origin: number[];
    scaleX: number;
    scaleY: number;
    snapshot: TransformSingleSnapshot;
    constructor(data: Data, point: number[], transformType?: TLBoundsEdge | TLBoundsCorner, commandId?: string);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], isAspectRatioLocked?: boolean) => Data;
    cancel: (data: Data) => {
        page: {
            shapes: {
                [x: string]: TLDrawShape;
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
    complete(data: Data): Data | {
        id: string;
        before: {
            page: {
                shapes: {
                    [x: string]: TLDrawShape;
                };
            };
        };
        after: {
            page: {
                shapes: {
                    [x: string]: TLDrawShape;
                };
            };
        };
    };
}
export declare function getTransformSingleSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner): {
    id: string;
    hasUnlockedShape: boolean;
    type: TLBoundsEdge | TLBoundsCorner;
    initialShape: TLDrawShape;
    initialShapeBounds: import("@tldraw/core").TLBounds;
};
export declare type TransformSingleSnapshot = ReturnType<typeof getTransformSingleSnapshot>;
