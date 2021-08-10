import * as React from 'react';
interface HandleProps {
    id: string;
    point: number[];
    zoom: number;
}
export declare const Handle: React.MemoExoticComponent<({ id, point, zoom }: HandleProps) => JSX.Element>;
export {};
