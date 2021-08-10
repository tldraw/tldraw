/// <reference types="react" />
import { TLBounds } from '../../../types';
interface BoundsProps {
    zoom: number;
    bounds: TLBounds;
    rotation: number;
    isLocked: boolean;
}
export declare function Bounds({ zoom, bounds, rotation, isLocked }: BoundsProps): JSX.Element;
export {};
