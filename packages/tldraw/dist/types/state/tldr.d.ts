import { TLBinding, TLBounds, TLTransformInfo } from '@tldraw/core';
import { ShapeStyles, ShapesWithProp, TLDrawShape, TLDrawShapeUtil } from '../shape';
import type { Data } from './state-types';
export declare class TLDR {
    static getShapeUtils<T extends TLDrawShape>(shape: T | T['type']): TLDrawShapeUtil<T>;
    static getSelectedShapes(data: Data): TLDrawShape[];
    static screenToWorld(data: Data, point: number[]): number[];
    static getViewport(data: Data): TLBounds;
    static getCameraZoom(zoom: number): number;
    static getCurrentCamera(data: Data): {
        point: number[];
        zoom: number;
    };
    static getPage(data: Data): import("@tldraw/core").TLPage<TLDrawShape>;
    static getPageState(data: Data): import("@tldraw/core").TLPageState;
    static getSelectedIds(data: Data): string[];
    static getShapes(data: Data): TLDrawShape[];
    static getCamera(data: Data): {
        point: number[];
        zoom: number;
    };
    static getShape<T extends TLDrawShape = TLDrawShape>(data: Data, shapeId: string): T;
    static getBounds<T extends TLDrawShape>(shape: T): TLBounds;
    static getRotatedBounds<T extends TLDrawShape>(shape: T): TLBounds;
    static getSelectedBounds(data: Data): TLBounds;
    static getParentId(data: Data, id: string): string;
    static getPointedId(data: Data, id: string): string;
    static getDrilledPointedId(data: Data, id: string): string;
    static getTopParentId(data: Data, id: string): string;
    static getDocumentBranch(data: Data, id: string): string[];
    static getSelectedBranchSnapshot<K>(data: Data, fn: (shape: TLDrawShape) => K): ({
        id: string;
    } & K)[];
    static getSelectedBranchSnapshot(data: Data): TLDrawShape[];
    static getSelectedShapeSnapshot(data: Data): TLDrawShape[];
    static getSelectedShapeSnapshot<K>(data: Data, fn?: (shape: TLDrawShape) => K): ({
        id: string;
    } & K)[];
    static getAllEffectedShapeIds(data: Data, ids: string[]): string[];
    static recursivelyUpdateChildren<T extends TLDrawShape>(data: Data, id: string, beforeShapes?: Record<string, Partial<TLDrawShape>>, afterShapes?: Record<string, Partial<TLDrawShape>>): Data;
    static recursivelyUpdateParents<T extends TLDrawShape>(data: Data, id: string, beforeShapes?: Record<string, Partial<TLDrawShape>>, afterShapes?: Record<string, Partial<TLDrawShape>>): Data;
    static updateBindings(data: Data, id: string, beforeShapes?: Record<string, Partial<TLDrawShape>>, afterShapes?: Record<string, Partial<TLDrawShape>>): Data;
    static getChildIndexAbove(data: Data, id: string): number;
    static setSelectedIds(data: Data, ids: string[]): void;
    static deselectAll(data: Data): void;
    static mutateShapes(data: Data, ids: string[], fn: (shape: TLDrawShape, i: number) => Partial<TLDrawShape>): {
        before: Record<string, Partial<TLDrawShape>>;
        after: Record<string, Partial<TLDrawShape>>;
        data: Data;
    };
    static createShapes(data: Data, shapes: TLDrawShape[]): void;
    static onSessionComplete<T extends TLDrawShape>(data: Data, shape: T): T;
    static onChildrenChange<T extends TLDrawShape>(data: Data, shape: T): T;
    static onBindingChange<T extends TLDrawShape>(data: Data, shape: T, binding: TLBinding, otherShape: TLDrawShape): T;
    static transform<T extends TLDrawShape>(data: Data, shape: T, bounds: TLBounds, info: TLTransformInfo<T>): T;
    static transformSingle<T extends TLDrawShape>(data: Data, shape: T, bounds: TLBounds, info: TLTransformInfo<T>): T;
    static mutate<T extends TLDrawShape>(data: Data, shape: T, props: Partial<T>): T;
    static updateParents(data: Data, changedShapeIds: string[]): void;
    static getSelectedStyle(data: Data): ShapeStyles | false;
    static getBinding(data: Data, id: string): TLBinding;
    static getBindings(data: Data): TLBinding[];
    static getBindingsWithShapeIds(data: Data, ids: string[]): TLBinding[];
    static createBindings(data: Data, bindings: TLBinding[]): void;
    static deleteBindings(data: Data, ids: string[]): void;
    static assertShapeHasProperty<P extends keyof TLDrawShape>(shape: TLDrawShape, prop: P): asserts shape is ShapesWithProp<P>;
}
