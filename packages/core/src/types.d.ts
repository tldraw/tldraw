import type React from 'react';
export declare type Patch<T> = Partial<{
    [P in keyof T]: T | Partial<T> | Patch<T[P]>;
}>;
declare type ForwardedRef<T> = ((instance: T | null) => void) | React.MutableRefObject<T | null> | null;
export interface TLPage<T extends TLShape, B extends TLBinding> {
    id: string;
    name?: string;
    childIndex?: number;
    shapes: Record<string, T>;
    bindings: Record<string, B>;
}
export interface TLPageState {
    id: string;
    selectedIds: string[];
    camera: {
        point: number[];
        zoom: number;
    };
    brush?: TLBounds | null;
    pointedId?: string | null;
    hoveredId?: string | null;
    editingId?: string | null;
    bindingId?: string | null;
    boundsRotation?: number;
    currentParentId?: string | null;
}
export interface TLUser<T extends TLShape> {
    id: string;
    color: string;
    point: number[];
    selectedIds: string[];
    activeShapes: T[];
}
export declare type TLUsers<T extends TLShape, U extends TLUser<T> = TLUser<T>> = Record<string, U>;
export declare type TLSnapLine = number[][];
export interface TLHandle {
    id: string;
    index: number;
    point: number[];
    canBind?: boolean;
    bindingId?: string;
}
export interface TLShape {
    id: string;
    type: string;
    parentId: string;
    childIndex: number;
    name: string;
    point: number[];
    rotation?: number;
    children?: string[];
    handles?: Record<string, TLHandle>;
    isLocked?: boolean;
    isHidden?: boolean;
    isEditing?: boolean;
    isGenerated?: boolean;
    isAspectRatioLocked?: boolean;
}
export declare type TLShapeUtils<T extends TLShape = any, E extends Element = any, M = any, K = any> = Record<string, TLShapeUtil<T, E, M, K>>;
export interface TLRenderInfo<T extends TLShape, E = any, M = any> {
    shape: T;
    isEditing: boolean;
    isBinding: boolean;
    isHovered: boolean;
    isSelected: boolean;
    isCurrentParent: boolean;
    meta: M extends any ? M : never;
    onShapeChange?: TLCallbacks<T>['onShapeChange'];
    onShapeBlur?: TLCallbacks<T>['onShapeBlur'];
    events: {
        onPointerDown: (e: React.PointerEvent<E>) => void;
        onPointerUp: (e: React.PointerEvent<E>) => void;
        onPointerEnter: (e: React.PointerEvent<E>) => void;
        onPointerMove: (e: React.PointerEvent<E>) => void;
        onPointerLeave: (e: React.PointerEvent<E>) => void;
    };
}
export interface TLShapeProps<T extends TLShape, E = any, M = any> extends TLRenderInfo<T, E, M> {
    ref: ForwardedRef<E>;
    shape: T;
}
export interface TLTool {
    id: string;
    name: string;
}
export interface TLBinding<M = any> {
    id: string;
    type: string;
    toId: string;
    fromId: string;
    meta: M;
}
export interface TLTheme {
    accent?: string;
    brushFill?: string;
    brushStroke?: string;
    selectFill?: string;
    selectStroke?: string;
    background?: string;
    foreground?: string;
}
export declare type TLWheelEventHandler = (info: TLPointerInfo<string>, e: React.WheelEvent<Element> | WheelEvent) => void;
export declare type TLPinchEventHandler = (info: TLPointerInfo<string>, e: React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent | React.PointerEvent<Element> | PointerEventInit) => void;
export declare type TLShapeChangeHandler<T, K = any> = (shape: {
    id: string;
} & Partial<T>, info?: K) => void;
export declare type TLShapeBlurHandler<K = any> = (info?: K) => void;
export declare type TLKeyboardEventHandler = (key: string, info: TLKeyboardInfo, e: KeyboardEvent) => void;
export declare type TLPointerEventHandler = (info: TLPointerInfo<string>, e: React.PointerEvent) => void;
export declare type TLShapeCloneHandler = (info: TLPointerInfo<'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'>, e: React.PointerEvent) => void;
export declare type TLShapeLinkHandler = (info: TLPointerInfo<'link'>, e: React.PointerEvent) => void;
export declare type TLCanvasEventHandler = (info: TLPointerInfo<'canvas'>, e: React.PointerEvent) => void;
export declare type TLBoundsEventHandler = (info: TLPointerInfo<'bounds'>, e: React.PointerEvent) => void;
export declare type TLBoundsHandleEventHandler = (info: TLPointerInfo<TLBoundsCorner | TLBoundsEdge | 'rotate' | 'center' | 'left' | 'right'>, e: React.PointerEvent) => void;
export interface TLCallbacks<T extends TLShape> {
    onPinchStart: TLPinchEventHandler;
    onPinchEnd: TLPinchEventHandler;
    onPinch: TLPinchEventHandler;
    onPan: TLWheelEventHandler;
    onZoom: TLWheelEventHandler;
    onPointerMove: TLPointerEventHandler;
    onPointerUp: TLPointerEventHandler;
    onPointerDown: TLPointerEventHandler;
    onPointCanvas: TLCanvasEventHandler;
    onDoubleClickCanvas: TLCanvasEventHandler;
    onRightPointCanvas: TLCanvasEventHandler;
    onDragCanvas: TLCanvasEventHandler;
    onReleaseCanvas: TLCanvasEventHandler;
    onPointShape: TLPointerEventHandler;
    onDoubleClickShape: TLPointerEventHandler;
    onRightPointShape: TLPointerEventHandler;
    onDragShape: TLPointerEventHandler;
    onHoverShape: TLPointerEventHandler;
    onUnhoverShape: TLPointerEventHandler;
    onReleaseShape: TLPointerEventHandler;
    onPointBounds: TLBoundsEventHandler;
    onDoubleClickBounds: TLBoundsEventHandler;
    onRightPointBounds: TLBoundsEventHandler;
    onDragBounds: TLBoundsEventHandler;
    onHoverBounds: TLBoundsEventHandler;
    onUnhoverBounds: TLBoundsEventHandler;
    onReleaseBounds: TLBoundsEventHandler;
    onPointBoundsHandle: TLBoundsHandleEventHandler;
    onDoubleClickBoundsHandle: TLBoundsHandleEventHandler;
    onRightPointBoundsHandle: TLBoundsHandleEventHandler;
    onDragBoundsHandle: TLBoundsHandleEventHandler;
    onHoverBoundsHandle: TLBoundsHandleEventHandler;
    onUnhoverBoundsHandle: TLBoundsHandleEventHandler;
    onReleaseBoundsHandle: TLBoundsHandleEventHandler;
    onPointHandle: TLPointerEventHandler;
    onDoubleClickHandle: TLPointerEventHandler;
    onRightPointHandle: TLPointerEventHandler;
    onDragHandle: TLPointerEventHandler;
    onHoverHandle: TLPointerEventHandler;
    onUnhoverHandle: TLPointerEventHandler;
    onReleaseHandle: TLPointerEventHandler;
    onShapeChange: TLShapeChangeHandler<T, any>;
    onShapeBlur: TLShapeBlurHandler<any>;
    onShapeClone: TLShapeCloneHandler;
    onRenderCountChange: (ids: string[]) => void;
    onError: (error: Error) => void;
    onBoundsChange: (bounds: TLBounds) => void;
    onKeyDown: TLKeyboardEventHandler;
    onKeyUp: TLKeyboardEventHandler;
}
export interface TLBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    rotation?: number;
}
export interface TLBoundsWithCenter extends TLBounds {
    midX: number;
    midY: number;
}
export declare type TLIntersection = {
    didIntersect: boolean;
    message: string;
    points: number[][];
};
export declare enum TLBoundsEdge {
    Top = "top_edge",
    Right = "right_edge",
    Bottom = "bottom_edge",
    Left = "left_edge"
}
export declare enum TLBoundsCorner {
    TopLeft = "top_left_corner",
    TopRight = "top_right_corner",
    BottomRight = "bottom_right_corner",
    BottomLeft = "bottom_left_corner"
}
export interface TLPointerInfo<T extends string = string> {
    target: T;
    pointerId: number;
    origin: number[];
    point: number[];
    delta: number[];
    pressure: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    spaceKey: boolean;
}
export interface TLKeyboardInfo {
    origin: number[];
    point: number[];
    key: string;
    keys: string[];
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
}
export interface TLTransformInfo<T extends TLShape> {
    type: TLBoundsEdge | TLBoundsCorner;
    initialShape: T;
    scaleX: number;
    scaleY: number;
    transformOrigin: number[];
}
export interface TLBezierCurveSegment {
    start: number[];
    tangentStart: number[];
    normalStart: number[];
    pressureStart: number;
    end: number[];
    tangentEnd: number[];
    normalEnd: number[];
    pressureEnd: number;
}
export declare enum SnapPoints {
    minX = "minX",
    midX = "midX",
    maxX = "maxX",
    minY = "minY",
    midY = "midY",
    maxY = "maxY"
}
export declare type Snap = {
    id: SnapPoints;
    isSnapped: false;
} | {
    id: SnapPoints;
    isSnapped: true;
    to: number;
    B: TLBoundsWithCenter;
    distance: number;
};
export declare type TLShapeUtil<T extends TLShape, E extends Element, M = any, K = {
    [key: string]: any;
}> = K & {
    type: T['type'];
    defaultProps: T;
    Component(this: TLShapeUtil<T, E, M>, props: TLRenderInfo<T, E, M>, ref: ForwardedRef<E>): React.ReactElement<TLRenderInfo<T, E, M>, E['tagName']>;
    Indicator(this: TLShapeUtil<T, E, M>, props: {
        shape: T;
        meta: M;
        isHovered: boolean;
        isSelected: boolean;
    }): React.ReactElement | null;
    getBounds(this: TLShapeUtil<T, E, M>, shape: T): TLBounds;
    refMap: Map<string, React.RefObject<E>>;
    boundsCache: WeakMap<TLShape, TLBounds>;
    isAspectRatioLocked: boolean;
    canEdit: boolean;
    canClone: boolean;
    canBind: boolean;
    isStateful: boolean;
    showBounds: boolean;
    getRotatedBounds(this: TLShapeUtil<T, E, M>, shape: T): TLBounds;
    hitTest(this: TLShapeUtil<T, E, M>, shape: T, point: number[]): boolean;
    hitTestBounds(this: TLShapeUtil<T, E, M>, shape: T, bounds: TLBounds): boolean;
    shouldRender(this: TLShapeUtil<T, E, M>, prev: T, next: T): boolean;
    getCenter(this: TLShapeUtil<T, E, M>, shape: T): number[];
    getRef(this: TLShapeUtil<T, E, M>, shape: T): React.RefObject<E>;
    getBindingPoint<K extends TLShape>(this: TLShapeUtil<T, E, M>, shape: T, fromShape: K, point: number[], origin: number[], direction: number[], padding: number, bindAnywhere: boolean): {
        point: number[];
        distance: number;
    } | undefined;
    create: (this: TLShapeUtil<T, E, M>, props: {
        id: string;
    } & Partial<T>) => T;
    mutate: (this: TLShapeUtil<T, E, M>, shape: T, props: Partial<T>) => Partial<T>;
    transform: (this: TLShapeUtil<T, E, M>, shape: T, bounds: TLBounds, info: TLTransformInfo<T>) => Partial<T> | void;
    transformSingle: (this: TLShapeUtil<T, E, M>, shape: T, bounds: TLBounds, info: TLTransformInfo<T>) => Partial<T> | void;
    updateChildren: <K extends TLShape>(this: TLShapeUtil<T, E, M>, shape: T, children: K[]) => Partial<K>[] | void;
    onChildrenChange: (this: TLShapeUtil<T, E, M>, shape: T, children: TLShape[]) => Partial<T> | void;
    onBindingChange: (this: TLShapeUtil<T, E, M>, shape: T, binding: TLBinding, target: TLShape, targetBounds: TLBounds, center: number[]) => Partial<T> | void;
    onHandleChange: (this: TLShapeUtil<T, E, M>, shape: T, handle: Partial<T['handles']>, info: Partial<TLPointerInfo>) => Partial<T> | void;
    onRightPointHandle: (this: TLShapeUtil<T, E, M>, shape: T, handle: Partial<T['handles']>, info: Partial<TLPointerInfo>) => Partial<T> | void;
    onDoubleClickHandle: (this: TLShapeUtil<T, E, M>, shape: T, handle: Partial<T['handles']>, info: Partial<TLPointerInfo>) => Partial<T> | void;
    onDoubleClickBoundsHandle: (this: TLShapeUtil<T, E, M>, shape: T) => Partial<T> | void;
    onSessionComplete: (this: TLShapeUtil<T, E, M>, shape: T) => Partial<T> | void;
    onStyleChange: (this: TLShapeUtil<T, E, M>, shape: T) => Partial<T> | void;
    _Component: React.ForwardRefExoticComponent<any>;
};
export interface IShapeTreeNode<T extends TLShape, M = any> {
    shape: T;
    children?: IShapeTreeNode<TLShape, M>[];
    isEditing: boolean;
    isBinding: boolean;
    isHovered: boolean;
    isSelected: boolean;
    isCurrentParent: boolean;
    meta?: M extends any ? M : never;
}
export declare type MappedByType<K extends string, T extends {
    type: K;
}> = {
    [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never;
};
export declare type RequiredKeys<T> = {
    [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K;
}[keyof T];
export {};
//# sourceMappingURL=types.d.ts.map