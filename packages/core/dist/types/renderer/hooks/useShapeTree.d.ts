import type { IShapeTreeNode, TLPage, TLPageState, TLShape, TLShapeUtils, TLCallbacks } from '../../types';
export declare function useShapeTree<T extends TLShape>(page: TLPage<T>, pageState: TLPageState, shapeUtils: TLShapeUtils<T>, onChange?: TLCallbacks['onChange']): IShapeTreeNode[];
