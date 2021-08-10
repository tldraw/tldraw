import type { TLPage, TLPageState } from '@tldraw/core';
import type { ShapeStyles, TLDrawShape, TLDrawShapeType, TLDrawToolType } from '../shape';
import type { TLDrawSettings } from '../types';
import type { StoreApi } from 'zustand';
export declare type TLStore = StoreApi<Data>;
export declare type TLChange = Data;
export interface Data {
    page: TLPage<TLDrawShape>;
    pageState: TLPageState;
    settings: TLDrawSettings;
    appState: {
        selectedStyle: ShapeStyles;
        currentStyle: ShapeStyles;
        currentPageId: string;
        pages: Pick<TLPage<TLDrawShape>, 'id' | 'name' | 'childIndex'>[];
        hoveredId?: string;
        activeTool: TLDrawShapeType | 'select';
        activeToolType?: TLDrawToolType | 'select';
        isToolLocked: boolean;
        isStyleOpen: boolean;
        isEmptyCanvas: boolean;
    };
}
export declare type DeepPartial<T> = T extends Function ? T : T extends object ? T extends unknown[] ? DeepPartial<T[number]>[] : {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export interface Command {
    id: string;
    before: DeepPartial<Data>;
    after: DeepPartial<Data>;
}
export interface History {
    pointer: number;
    stack: Command[];
}
export interface Session {
    id: string;
    start: (data: Readonly<Data>, ...args: any[]) => Data;
    update: (data: Readonly<Data>, ...args: any[]) => Data;
    complete: (data: Readonly<Data>, ...args: any[]) => Data | Command;
    cancel: (data: Readonly<Data>, ...args: any[]) => Data;
}
export declare type TLDrawStatus = 'idle' | 'pointingHandle' | 'pointingBounds' | 'pointingBoundsHandle' | 'translatingHandle' | 'translating' | 'transforming' | 'rotating' | 'pinching' | 'brushing' | 'creating' | 'editing-text';
export declare type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never;
export {};
