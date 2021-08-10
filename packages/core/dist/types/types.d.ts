/// <reference types="react" />
export interface TLPage<T extends TLShape> {
    id: string;
    name?: string;
    childIndex?: number;
    shapes: Record<string, T>;
    bindings: Record<string, TLBinding>;
    backgroundColor?: string;
}
export interface TLPageState {
    id: string;
    brush?: TLBounds;
    pointedId?: string;
    hoveredId?: string;
    editingId?: string;
    editingBindingId?: string;
    boundsRotation?: number;
    currentParentId?: string;
    selectedIds: string[];
    camera: {
        point: number[];
        zoom: number;
    };
}
export interface TLHandle {
    id: string;
    index: number;
    point: number[];
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
export declare type TLShapeUtils<T extends TLShape> = Record<string, TLShapeUtil<T>>;
export interface TLRenderInfo<T extends SVGElement | HTMLElement = any> {
    isEditing: boolean;
    isBinding: boolean;
    isDarkMode: boolean;
    isCurrentParent: boolean;
    ref?: React.RefObject<T>;
    onTextChange?: TLCallbacks["onTextChange"];
    onTextBlur?: TLCallbacks["onTextBlur"];
    onTextFocus?: TLCallbacks["onTextFocus"];
    onTextKeyDown?: TLCallbacks["onTextKeyDown"];
    onTextKeyUp?: TLCallbacks["onTextKeyUp"];
}
export interface TLTool {
    id: string;
    name: string;
}
export interface TLBinding {
    id: string;
    type: string;
    toId: string;
    fromId: string;
}
export interface TLSettings {
    isDebugMode: boolean;
    isDarkMode: boolean;
    isPenMode: boolean;
}
export interface TLTheme {
    brushFill?: string;
    brushStroke?: string;
    selectFill?: string;
    selectStroke?: string;
    background?: string;
    foreground?: string;
}
export declare type TLWheelEventHandler = (info: TLPointerInfo<string>, e: React.WheelEvent<Element> | WheelEvent) => void;
export declare type TLPinchEventHandler = (info: TLPointerInfo<string>, e: React.WheelEvent<Element> | WheelEvent | React.TouchEvent<Element> | TouchEvent) => void;
export declare type TLPointerEventHandler = (info: TLPointerInfo<string>, e: React.PointerEvent) => void;
export declare type TLCanvasEventHandler = (info: TLPointerInfo<"canvas">, e: React.PointerEvent) => void;
export declare type TLBoundsEventHandler = (info: TLPointerInfo<"bounds">, e: React.PointerEvent) => void;
export declare type TLBoundsHandleEventHandler = (info: TLPointerInfo<TLBoundsCorner | TLBoundsEdge | "rotate">, e: React.PointerEvent) => void;
export interface TLCallbacks {
    onChange: (ids: string[]) => void;
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
    onTextChange: (id: string, text: string) => void;
    onTextBlur: (id: string) => void;
    onTextFocus: (id: string) => void;
    onTextKeyDown: (id: string, key: string) => void;
    onTextKeyUp: (id: string, key: string) => void;
    onBlurEditingShape: () => void;
    onError: (error: Error) => void;
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
export declare abstract class TLShapeUtil<T extends TLShape> {
    boundsCache: WeakMap<TLShape, TLBounds>;
    isEditableText: boolean;
    isAspectRatioLocked: boolean;
    canEdit: boolean;
    abstract type: T["type"];
    abstract defaultProps: T;
    abstract render(shape: T, info: TLRenderInfo): JSX.Element;
    abstract renderIndicator(shape: T): JSX.Element | null;
    abstract getBounds(shape: T): TLBounds;
    abstract getRotatedBounds(shape: T): TLBounds;
    abstract hitTest(shape: T, point: number[]): boolean;
    abstract hitTestBounds(shape: T, bounds: TLBounds): boolean;
    abstract transform(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): Partial<T>;
    transformSingle(shape: T, bounds: TLBounds, info: TLTransformInfo<T>): Partial<T>;
    shouldRender(_prev: T, _next: T): boolean;
    shouldDelete(_shape: T): boolean;
    getCenter(shape: T): number[];
    create(props: Partial<T>): T;
    mutate(shape: T, props: Partial<T>): T;
    updateChildren<K extends TLShape>(_shape: T, _children: K[]): Partial<K>[] | void;
    onChildrenChange(_shape: T, _children: TLShape[]): Partial<T> | void;
    onBindingChange(_shape: T, _binding: TLBinding, _target: TLShape, _targetBounds: TLBounds): Partial<T> | void;
    onHandleChange(_shape: T, _handle: Partial<T["handles"]>, _info: Partial<TLPointerInfo>): Partial<T> | void;
    onRightPointHandle(_shape: T, _handle: Partial<T["handles"]>, _info: Partial<TLPointerInfo>): Partial<T> | void;
    onDoubleClickHandle(_shape: T, _handle: Partial<T["handles"]>, _info: Partial<TLPointerInfo>): Partial<T> | void;
    onSessionComplete(_shape: T): Partial<T> | void;
    onBoundsReset(_shape: T): Partial<T> | void;
    onStyleChange(_shape: T): Partial<T> | void;
}
export interface IShapeTreeNode {
    shape: TLShape;
    children?: IShapeTreeNode[];
    isEditing: boolean;
    isBinding: boolean;
    isDarkMode: boolean;
    isCurrentParent: boolean;
}
export declare type MappedByType<T extends {
    type: string;
}> = {
    [P in T["type"]]: T extends any ? (P extends T["type"] ? T : never) : never;
};
export declare type RequiredKeys<T> = {
    [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K;
}[keyof T];
export {};
