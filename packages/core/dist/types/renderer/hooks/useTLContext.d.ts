import * as React from 'react';
import type { TLCallbacks, TLShape, TLBounds, TLPageState, TLShapeUtils } from '../../types';
export interface TLContextType {
    callbacks: Partial<TLCallbacks>;
    shapeUtils: TLShapeUtils<TLShape>;
    rPageState: React.MutableRefObject<TLPageState>;
    rScreenBounds: React.MutableRefObject<TLBounds | null>;
}
export declare const TLContext: React.Context<TLContextType>;
export declare function useTLContext(): TLContextType;
