import type { TLPage, TLPageState, TLShape } from '../../types';
export declare function useHandles<T extends TLShape>(page: TLPage<T>, pageState: TLPageState): {
    shapeWithHandles: TLShape | undefined;
};
