import * as React from 'react';
import type { TLPage, TLPageState, TLShape } from '../../types';
interface CanvasProps<T extends TLShape> {
    page: TLPage<T>;
    pageState: TLPageState;
    hideBounds?: boolean;
    hideIndicators?: boolean;
}
export declare const Canvas: React.MemoExoticComponent<(<T extends TLShape>({ page, pageState, hideBounds, hideIndicators, }: CanvasProps<T>) => JSX.Element)>;
export {};
