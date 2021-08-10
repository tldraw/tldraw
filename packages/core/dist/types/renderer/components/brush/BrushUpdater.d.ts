import * as React from 'react';
import type { TLBounds } from '../../../types';
export declare class BrushUpdater {
    ref: React.RefObject<SVGRectElement>;
    isControlled: boolean;
    set(bounds?: TLBounds): void;
    clear(): void;
}
