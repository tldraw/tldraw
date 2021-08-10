/// <reference types="react" />
import type { TLPage, TLPageState, TLShape } from '../../types';
interface PageProps<T extends TLShape> {
    page: TLPage<T>;
    pageState: TLPageState;
    hideBounds: boolean;
    hideIndicators: boolean;
}
export declare function Page<T extends TLShape>({ page, pageState, hideBounds, hideIndicators, }: PageProps<T>): JSX.Element;
export {};
