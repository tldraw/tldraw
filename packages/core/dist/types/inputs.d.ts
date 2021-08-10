import type React from 'react';
import type { TLKeyboardInfo, TLPointerInfo } from './types';
declare class Inputs {
    pointer?: TLPointerInfo<string>;
    keyboard?: TLKeyboardInfo;
    keys: Record<string, boolean>;
    pointerUpTime: number;
    touchStart<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T>;
    touchMove<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T>;
    pointerDown<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T>;
    pointerEnter<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T>;
    pointerMove<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T>;
    pointerUp<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T>;
    panStart: (e: WheelEvent) => TLPointerInfo<'wheel'>;
    pan: (delta: number[], e: WheelEvent) => TLPointerInfo<'wheel'>;
    canAccept: (_pointerId: PointerEvent['pointerId']) => boolean;
    isDoubleClick(): boolean;
    clear(): void;
    resetDoubleClick(): void;
    keydown: (e: KeyboardEvent | React.KeyboardEvent) => TLKeyboardInfo;
    keyup: (e: KeyboardEvent | React.KeyboardEvent) => TLKeyboardInfo;
    pinch(point: number[], origin: number[]): TLPointerInfo<"pinch">;
    reset(): void;
    static getPoint(e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent): number[];
    static getPressure(e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent): number;
    static commandKey(): string;
}
export declare const inputs: Inputs;
export {};
