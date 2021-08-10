import * as React from 'react';
export declare function useShapeEvents(id: string, disable?: boolean): {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
};
