import type { TLPage, TLPageState, TLShape, TLBounds, TLShapeUtils } from '../../types';
export declare function useSelection<T extends TLShape>(page: TLPage<T>, pageState: TLPageState, shapeUtils: TLShapeUtils<T>): {
    bounds: TLBounds | undefined;
    rotation: number;
    isLocked: boolean;
};
