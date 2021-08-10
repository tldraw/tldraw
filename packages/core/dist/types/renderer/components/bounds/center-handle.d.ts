import * as React from 'react';
import type { TLBounds } from '../../../types';
export interface CenterHandleProps {
    bounds: TLBounds;
    isLocked: boolean;
}
export declare const CenterHandle: React.MemoExoticComponent<({ bounds, isLocked }: CenterHandleProps) => JSX.Element>;
