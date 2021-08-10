/// <reference types="react" />
import type { TLShape, TLPage, TLPageState, TLSettings, TLCallbacks, TLShapeUtils, TLTheme } from '../types';
export interface RendererProps<T extends TLShape> extends Partial<TLSettings>, Partial<TLCallbacks> {
    shapeUtils: TLShapeUtils<T>;
    page: TLPage<T>;
    pageState: TLPageState;
    theme?: Partial<TLTheme>;
    hideBounds?: boolean;
    hideIndicators?: boolean;
}
export declare function Renderer<T extends TLShape>({ shapeUtils, page, pageState, theme, hideIndicators, hideBounds, isDarkMode, isDebugMode, isPenMode, ...rest }: RendererProps<T>): JSX.Element;
