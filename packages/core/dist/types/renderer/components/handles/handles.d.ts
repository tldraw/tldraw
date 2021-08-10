import * as React from 'react';
import type { TLShape } from '../../../types';
interface HandlesProps {
    shape: TLShape;
    zoom: number;
}
export declare const Handles: React.MemoExoticComponent<({ shape, zoom }: HandlesProps) => JSX.Element | null>;
export {};
