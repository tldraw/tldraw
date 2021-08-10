import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class RotateSession implements Session {
    id: string;
    delta: number[];
    origin: number[];
    snapshot: RotateSnapshot;
    prev: number;
    constructor(data: Data, point: number[]);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], isLocked?: boolean) => Data;
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
                    [k: string]: {
                        point: number[];
                        rotation: number | undefined;
                    };
                };
            };
        };
        after: {
            page: {
                shapes: {
                    [k: string]: {
                        point: number[];
                        rotation: number | undefined;
                    };
                };
            };
        };
    };
}
export declare function getRotateSnapshot(data: Data): {
    hasUnlockedShapes: boolean;
    boundsRotation: number;
    commonBoundsCenter: number[];
    initialShapes: {
        id: string;
        shape: import("../../../..").TLDrawShape;
        offset: number[];
        rotationOffset: number[];
        center: number[];
    }[];
};
export declare type RotateSnapshot = ReturnType<typeof getRotateSnapshot>;
