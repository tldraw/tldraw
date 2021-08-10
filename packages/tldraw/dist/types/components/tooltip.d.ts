import * as React from 'react';
interface TooltipProps {
    children: React.ReactNode;
    label: string;
    kbd?: string;
    side?: 'bottom' | 'left' | 'right' | 'top';
}
export declare function Tooltip({ children, label, kbd, side, }: TooltipProps): JSX.Element;
export {};
