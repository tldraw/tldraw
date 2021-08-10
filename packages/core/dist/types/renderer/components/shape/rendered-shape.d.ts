import * as React from 'react';
import type { TLShapeUtil, TLRenderInfo, TLShape } from '../../../types';
interface RenderedShapeProps<T extends TLShape> extends TLRenderInfo {
    shape: T;
    utils: TLShapeUtil<T>;
}
export declare const RenderedShape: React.NamedExoticComponent<RenderedShapeProps<TLShape>>;
export {};
