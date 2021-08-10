import type { TLDrawShape } from '../../../../shape';
import type { Session } from '../../../state-types';
import type { Data } from '../../../state-types';
export declare class HandleSession implements Session {
    id: string;
    commandId: string;
    delta: number[];
    origin: number[];
    shiftKey: boolean;
    initialShape: TLDrawShape;
    handleId: string;
    constructor(data: Data, handleId: string, point: number[], commandId?: string);
    start: (data: Data) => Data;
    update: (data: Data, point: number[], shiftKey: boolean, altKey: boolean, metaKey: boolean) => Data;
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
    complete(data: Data): {
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
