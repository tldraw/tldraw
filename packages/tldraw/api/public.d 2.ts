/// <reference types="react" />

import { Atom } from '@tldraw/editor';
import { BaseBoxShapeTool } from '@tldraw/editor';
import { BaseBoxShapeUtil } from '@tldraw/editor';
import { BindingOnChangeOptions } from '@tldraw/editor';
import { BindingOnCreateOptions } from '@tldraw/editor';
import { BindingOnShapeChangeOptions } from '@tldraw/editor';
import { BindingOnShapeIsolateOptions } from '@tldraw/editor';
import { BindingUtil } from '@tldraw/editor';
import { Box } from '@tldraw/editor';
import { Circle2d } from '@tldraw/editor';
import { ComponentType } from 'react';
import { CubicSpline2d } from '@tldraw/editor';
import { Editor } from '@tldraw/editor';
import { Geometry2d } from '@tldraw/editor';
import { Group2d } from '@tldraw/editor';
import { HandleSnapGeometry } from '@tldraw/editor';
import { IndexKey } from '@tldraw/editor';
import { JsonObject } from '@tldraw/editor';
import { JSX as JSX_2 } from 'react/jsx-runtime';
import { LANGUAGES } from '@tldraw/editor';
import { MigrationFailureReason } from '@tldraw/editor';
import { MigrationSequence } from '@tldraw/editor';
import { NamedExoticComponent } from 'react';
import { Polygon2d } from '@tldraw/editor';
import { Polyline2d } from '@tldraw/editor';
import * as React_2 from 'react';
import { default as React_3 } from 'react';
import { ReactElement } from 'react';
import { ReactNode } from 'react';
import { ReadonlySharedStyleMap } from '@tldraw/editor';
import { RecordProps } from '@tldraw/editor';
import { Rectangle2d } from '@tldraw/editor';
import { RecursivePartial } from '@tldraw/editor';
import { Result } from '@tldraw/editor';
import { SerializedSchema } from '@tldraw/editor';
import { ShapeUtil } from '@tldraw/editor';
import { SharedStyle } from '@tldraw/editor';
import { StateNode } from '@tldraw/editor';
import { StyleProp } from '@tldraw/editor';
import { SvgExportContext } from '@tldraw/editor';
import { TLAnyBindingUtilConstructor } from '@tldraw/editor';
import { TLAnyShapeUtilConstructor } from '@tldraw/editor';
import { TLArrowBinding } from '@tldraw/editor';
import { TLArrowBindingProps } from '@tldraw/editor';
import { TLArrowShape } from '@tldraw/editor';
import { TLArrowShapeArrowheadStyle } from '@tldraw/editor';
import { TLArrowShapeProps } from '@tldraw/editor';
import { TLAsset } from '@tldraw/editor';
import { TLAssetId } from '@tldraw/editor';
import { TLBookmarkShape } from '@tldraw/editor';
import { TLBookmarkShapeProps } from '@tldraw/editor';
import { TLClickEventInfo } from '@tldraw/editor';
import { TLDefaultColorTheme } from '@tldraw/editor';
import { TLDefaultColorThemeColor } from '@tldraw/editor';
import { TLDefaultFillStyle } from '@tldraw/editor';
import { TLDefaultFontStyle } from '@tldraw/editor';
import { TLDefaultHorizontalAlignStyle } from '@tldraw/editor';
import { TLDefaultSizeStyle } from '@tldraw/editor';
import { TLDefaultVerticalAlignStyle } from '@tldraw/editor';
import { TldrawEditorBaseProps } from '@tldraw/editor';
import { TldrawEditorStoreProps } from '@tldraw/editor';
import { TLDrawShape } from '@tldraw/editor';
import { TLDrawShapeProps } from '@tldraw/editor';
import { TLDrawShapeSegment } from '@tldraw/editor';
import { TLEditorComponents } from '@tldraw/editor';
import { TLEditorSnapshot } from '@tldraw/editor';
import { TLEmbedShape } from '@tldraw/editor';
import { TLEmbedShapeProps } from '@tldraw/editor';
import { TLFrameShape } from '@tldraw/editor';
import { TLFrameShapeProps } from '@tldraw/editor';
import { TLGeoShape } from '@tldraw/editor';
import { TLGeoShapeProps } from '@tldraw/editor';
import { TLHandle } from '@tldraw/editor';
import { TLHandleDragInfo } from '@tldraw/editor';
import { TLHandlesProps } from '@tldraw/editor';
import { TLHighlightShape } from '@tldraw/editor';
import { TLHighlightShapeProps } from '@tldraw/editor';
import { TLImageAsset } from '@tldraw/editor';
import { TLImageExportOptions } from '@tldraw/editor';
import { TLImageShape } from '@tldraw/editor';
import { TLImageShapeProps } from '@tldraw/editor';
import { TLKeyboardEventInfo } from '@tldraw/editor';
import { TLLineShape } from '@tldraw/editor';
import { TLLineShapePoint } from '@tldraw/editor';
import { TLNoteShape } from '@tldraw/editor';
import { TLNoteShapeProps } from '@tldraw/editor';
import { TLPageId } from '@tldraw/editor';
import { TLParentId } from '@tldraw/editor';
import { TLPointerEventInfo } from '@tldraw/editor';
import { TLPropsMigrations } from '@tldraw/editor';
import { TLResizeInfo } from '@tldraw/editor';
import { TLSchema } from '@tldraw/editor';
import { TLScribbleProps } from '@tldraw/editor';
import { TLSelectionBackgroundProps } from '@tldraw/editor';
import { TLSelectionForegroundProps } from '@tldraw/editor';
import { TLShape } from '@tldraw/editor';
import { TLShapeId } from '@tldraw/editor';
import { TLShapePartial } from '@tldraw/editor';
import { TLShapeUtilCanBindOpts } from '@tldraw/editor';
import { TLShapeUtilCanvasSvgDef } from '@tldraw/editor';
import { TLStateNodeConstructor } from '@tldraw/editor';
import { TLStore } from '@tldraw/editor';
import { TLStoreSnapshot } from '@tldraw/editor';
import { TLTextShape } from '@tldraw/editor';
import { TLVideoAsset } from '@tldraw/editor';
import { TLVideoShape } from '@tldraw/editor';
import { UnknownRecord } from '@tldraw/editor';
import { Vec } from '@tldraw/editor';
import { VecLike } from '@tldraw/editor';
import { VecModel } from '@tldraw/editor';

/** @public */
export declare interface ActionsProviderProps {
    overrides?(editor: Editor, actions: TLUiActionsContextType, helpers: undefined): TLUiActionsContextType;
    children: React_2.ReactNode;
}

/** @public */
export declare type AlertSeverity = 'error' | 'info' | 'success' | 'warning';

/** @public @react */
export declare function AlignMenuItems(): JSX_2.Element;

/** @public @react */
export declare function ArrangeMenuSubmenu(): JSX_2.Element | null;

/** @public */
export declare const ARROW_LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number>;

/**
 * @public
 */
export declare class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
    static type: string;
    static props: RecordProps<TLArrowBinding>;
    static migrations: TLPropsMigrations;
    getDefaultProps(): Partial<TLArrowBindingProps>;
    onAfterCreate({ binding }: BindingOnCreateOptions<TLArrowBinding>): void;
    onAfterChange({ bindingAfter }: BindingOnChangeOptions<TLArrowBinding>): void;
    onAfterChangeFromShape({ shapeAfter, }: BindingOnShapeChangeOptions<TLArrowBinding>): void;
    onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<TLArrowBinding>): void;
    onBeforeIsolateFromShape({ binding, }: BindingOnShapeIsolateOptions<TLArrowBinding>): void;
}

/** @public @react */
export declare function ArrowDownToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function ArrowheadStylePickerSet({ styles }: StylePickerSetProps): JSX_2.Element | null;

/** @public @react */
export declare function ArrowLeftToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function ArrowRightToolbarItem(): JSX_2.Element;

/** @public */
export declare class ArrowShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
}

/** @public */
export declare class ArrowShapeUtil extends ShapeUtil<TLArrowShape> {
    static type: "arrow";
    static props: RecordProps<TLArrowShape>;
    static migrations: MigrationSequence;
    canEdit(): boolean;
    canBind({ toShapeType }: TLShapeUtilCanBindOpts<TLArrowShape>): boolean;
    canSnap(): boolean;
    hideResizeHandles(): boolean;
    hideRotateHandle(): boolean;
    hideSelectionBoundsBg(): boolean;
    hideSelectionBoundsFg(): boolean;
    canBeLaidOut(shape: TLArrowShape): boolean;
    getDefaultProps(): TLArrowShape['props'];
    getGeometry(shape: TLArrowShape): Group2d;
    getHandles(shape: TLArrowShape): TLHandle[];
    getText(shape: TLArrowShape): string;
    onHandleDrag(shape: TLArrowShape, { handle, isPrecise }: TLHandleDragInfo<TLArrowShape>): {
        id: TLShapeId;
        meta?: Partial<JsonObject> | undefined;
        props?: Partial<TLArrowShapeProps> | undefined;
        type: "arrow";
    } & Partial<Omit<TLArrowShape, "id" | "meta" | "props" | "type">>;
    onTranslateStart(shape: TLArrowShape): void;
    onTranslate(initialShape: TLArrowShape, shape: TLArrowShape): void;
    private readonly _resizeInitialBindings;
    onResize(shape: TLArrowShape, info: TLResizeInfo<TLArrowShape>): {
        props: {
            bend: number;
            end: VecModel;
            start: VecModel;
        };
    };
    onDoubleClickHandle(shape: TLArrowShape, handle: TLHandle): TLShapePartial<TLArrowShape> | void;
    component(shape: TLArrowShape): JSX_2.Element | null;
    indicator(shape: TLArrowShape): JSX_2.Element | null;
    onEditEnd(shape: TLArrowShape): void;
    toSvg(shape: TLArrowShape, ctx: SvgExportContext): JSX_2.Element;
    getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[];
    getInterpolatedProps(startShape: TLArrowShape, endShape: TLArrowShape, progress: number): TLArrowShapeProps;
}

/** @public @react */
export declare function ArrowToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function ArrowUpToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function AssetToolbarItem(): JSX_2.Element;

/* Excluded from this release type: AssetUrlsProvider */

/** @public */
export declare class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
    static type: "bookmark";
    static props: RecordProps<TLBookmarkShape>;
    static migrations: TLPropsMigrations;
    canResize(): boolean;
    hideSelectionBoundsFg(): boolean;
    getText(shape: TLBookmarkShape): string;
    getDefaultProps(): TLBookmarkShape['props'];
    component(shape: TLBookmarkShape): JSX_2.Element;
    indicator(shape: TLBookmarkShape): JSX_2.Element;
    onBeforeCreate(next: TLBookmarkShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            assetId: null | TLAssetId;
            h: number;
            url: string;
            w: number;
        };
        rotation: number;
        type: "bookmark";
        typeName: "shape";
        x: number;
        y: number;
    };
    onBeforeUpdate(prev: TLBookmarkShape, shape: TLBookmarkShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            assetId: null | TLAssetId;
            h: number;
            url: string;
            w: number;
        };
        rotation: number;
        type: "bookmark";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    getInterpolatedProps(startShape: TLBookmarkShape, endShape: TLBookmarkShape, t: number): TLBookmarkShapeProps;
}

/** @public */
export declare interface BoxWidthHeight {
    w: number;
    h: number;
}

/** @public @react */
export declare function BreakPointProvider({ forceMobile, children }: BreakPointProviderProps): JSX_2.Element;

/** @public */
export declare interface BreakPointProviderProps {
    forceMobile?: boolean;
    children: ReactNode;
}

/* Excluded from this release type: buildFromV1Document */

/** @public @react */
export declare function CenteredTopPanelContainer({ maxWidth, ignoreRightWidth, stylePanelWidth, marginBetweenZones, squeezeAmount, children, }: CenteredTopPanelContainerProps): JSX_2.Element;

/** @public */
export declare interface CenteredTopPanelContainerProps {
    children: ReactNode;
    maxWidth?: number;
    ignoreRightWidth?: number;
    stylePanelWidth?: number;
    marginBetweenZones?: number;
    squeezeAmount?: number;
}

/**
 * Repositions selected shapes do that the center of the group is
 * at the provided position
 *
 * @param editor - The editor instance
 *
 * @param position - the point to center the shapes around
 *
 * @public
 */
export declare function centerSelectionAroundPoint(editor: Editor, position: VecLike): void;

/** @public @react */
export declare function CheckBoxToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function ClipboardMenuGroup(): JSX_2.Element;

/** @public @react */
export declare function CloudToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function CommonStylePickerSet({ styles, theme }: ThemeStylePickerSetProps): JSX_2.Element;

/**
 * Contains the size within the given box size
 *
 * @param originalSize - The size of the asset
 * @param containBoxSize - The container size
 * @returns Adjusted size
 * @public
 */
export declare function containBoxSize(originalSize: BoxWidthHeight, containBoxSize: BoxWidthHeight): BoxWidthHeight;

/** @public @react */
export declare function ConversionsMenuGroup(): JSX_2.Element | null;

/** @public @react */
export declare function ConvertToBookmarkMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function ConvertToEmbedMenuItem(): JSX_2.Element | null;

/**
 * Copy the given shapes to the clipboard.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to copy.
 * @param format - The format to copy as.
 * @param opts - Options for the copy.
 *
 * @public
 */
export declare function copyAs(editor: Editor, ids: TLShapeId[], format?: TLCopyType, opts?: TLImageExportOptions): Promise<void>;

/** @public @react */
export declare function CopyAsMenuGroup(): JSX_2.Element;

/** @public @react */
export declare function CopyMenuItem(): JSX_2.Element;

/** @public */
export declare function createMediaAssetInfoSkeleton(file: File, assetId: TLAssetId, isImageType: boolean, isVideoType: boolean): Promise<TLImageAsset | TLVideoAsset>;

/**
 * A helper function for an external content handler. It creates bookmarks,
 * images or video shapes corresponding to the type of assets provided.
 *
 * @param editor - The editor instance
 *
 * @param assets - An array of asset Ids
 *
 * @param position - the position at which to create the shapes
 *
 * @public
 */
export declare function createShapesForAssets(editor: Editor, assets: TLAsset[], position: VecLike): Promise<TLShapeId[]>;

/** @public @react */
export declare function CursorChatItem(): JSX_2.Element | null;

/** @public */
export declare interface CustomEmbedDefinition extends EmbedDefinition {
    readonly icon: string;
}

/** @public @react */
export declare function CutMenuItem(): JSX_2.Element;

/** @public @react */
export declare function DebugFlags(): JSX_2.Element | null;

/** @public */
export declare const DEFAULT_EMBED_DEFINITIONS: readonly [{
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["beta.tldraw.com", "tldraw.com", "localhost:3000"];
    readonly minHeight: 300;
    readonly minWidth: 300;
    readonly overridePermissions: {
        readonly 'allow-top-navigation': true;
    };
    readonly title: "tldraw";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "tldraw";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["figma.com"];
    readonly title: "Figma";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "figma";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["google.*"];
    readonly overridePermissions: {
        readonly 'allow-presentation': true;
    };
    readonly title: "Google Maps";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "google_maps";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["val.town"];
    readonly minHeight: 100;
    readonly minWidth: 260;
    readonly title: "Val Town";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "val_town";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["codesandbox.io"];
    readonly minHeight: 300;
    readonly minWidth: 300;
    readonly title: "CodeSandbox";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "codesandbox";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 400;
    readonly hostnames: readonly ["codepen.io"];
    readonly minHeight: 300;
    readonly minWidth: 300;
    readonly title: "Codepen";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "codepen";
    readonly width: 520;
}, {
    readonly doesResize: false;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 400;
    readonly hostnames: readonly ["scratch.mit.edu"];
    readonly title: "Scratch";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "scratch";
    readonly width: 520;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 450;
    readonly hostnames: readonly ["*.youtube.com", "youtube.com", "youtu.be"];
    readonly isAspectRatioLocked: true;
    readonly overridePermissions: {
        readonly 'allow-popups-to-escape-sandbox': true;
        readonly 'allow-presentation': true;
    };
    readonly title: "YouTube";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "youtube";
    readonly width: 800;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["calendar.google.*"];
    readonly instructionLink: "https://support.google.com/calendar/answer/41207?hl=en";
    readonly minHeight: 360;
    readonly minWidth: 460;
    readonly overridePermissions: {
        readonly 'allow-popups-to-escape-sandbox': true;
    };
    readonly title: "Google Calendar";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "google_calendar";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["docs.google.*"];
    readonly minHeight: 360;
    readonly minWidth: 460;
    readonly overridePermissions: {
        readonly 'allow-popups-to-escape-sandbox': true;
    };
    readonly title: "Google Slides";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "google_slides";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["gist.github.com"];
    readonly title: "GitHub Gist";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "github_gist";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["replit.com"];
    readonly title: "Replit";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "replit";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["felt.com"];
    readonly title: "Felt";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "felt";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["open.spotify.com"];
    readonly minHeight: 500;
    readonly overrideOutlineRadius: 12;
    readonly title: "Spotify";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "spotify";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 360;
    readonly hostnames: readonly ["vimeo.com", "player.vimeo.com"];
    readonly isAspectRatioLocked: true;
    readonly title: "Vimeo";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "vimeo";
    readonly width: 640;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["excalidraw.com"];
    readonly isAspectRatioLocked: true;
    readonly title: "Excalidraw";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "excalidraw";
    readonly width: 720;
}, {
    readonly backgroundColor: "#fff";
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 500;
    readonly hostnames: readonly ["observablehq.com"];
    readonly isAspectRatioLocked: false;
    readonly title: "Observable";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "observable";
    readonly width: 720;
}, {
    readonly doesResize: true;
    readonly fromEmbedUrl: (url: string) => string | undefined;
    readonly height: 450;
    readonly hostnames: readonly ["desmos.com"];
    readonly title: "Desmos";
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly type: "desmos";
    readonly width: 700;
}];

/** @public @react */
export declare const DefaultActionsMenu: NamedExoticComponent<TLUiActionsMenuProps>;

/** @public @react */
export declare function DefaultActionsMenuContent(): JSX_2.Element;

/** @public */
export declare const defaultBindingUtils: readonly [typeof ArrowBindingUtil];

/** @public @react */
declare const DefaultContextMenu: NamedExoticComponent<TLUiContextMenuProps>;
export { DefaultContextMenu as ContextMenu }
export { DefaultContextMenu }

/** @public @react */
export declare function DefaultContextMenuContent(): JSX_2.Element | null;

/** @public @react */
export declare function DefaultDebugMenu({ children }: TLUiDebugMenuProps): JSX_2.Element;

/** @public @react */
export declare function DefaultDebugMenuContent(): JSX_2.Element;

/** @public */
export declare let defaultEditorAssetUrls: TLEditorAssetUrls;

/** @public */
export declare type DefaultEmbedDefinitionType = (typeof DEFAULT_EMBED_DEFINITIONS)[number]['type'];

/** @public @react */
export declare function DefaultHelperButtons({ children }: TLUiHelperButtonsProps): JSX_2.Element;

/** @public @react */
export declare function DefaultHelperButtonsContent(): JSX_2.Element;

/** @public @react */
export declare const DefaultHelpMenu: NamedExoticComponent<TLUiHelpMenuProps>;

/** @public @react */
export declare function DefaultHelpMenuContent(): JSX_2.Element;

/** @public @react */
export declare const DefaultKeyboardShortcutsDialog: NamedExoticComponent<TLUiKeyboardShortcutsDialogProps>;

/** @public @react */
export declare function DefaultKeyboardShortcutsDialogContent(): JSX_2.Element;

/** @public @react */
export declare const DefaultMainMenu: NamedExoticComponent<TLUiMainMenuProps>;

/** @public @react */
export declare function DefaultMainMenuContent(): JSX_2.Element;

/** @public @react */
export declare const DefaultMenuPanel: NamedExoticComponent<object>;

/** @public @react */
export declare function DefaultMinimap(): JSX_2.Element;

/** @public @react */
export declare const DefaultNavigationPanel: NamedExoticComponent<object>;

/** @public @react */
export declare const DefaultPageMenu: NamedExoticComponent<object>;

/** @public @react */
export declare const DefaultQuickActions: NamedExoticComponent<TLUiQuickActionsProps>;

/** @public @react */
export declare function DefaultQuickActionsContent(): JSX_2.Element | undefined;

/** @public */
export declare const defaultShapeTools: readonly [typeof TextShapeTool, typeof DrawShapeTool, typeof GeoShapeTool, typeof NoteShapeTool, typeof LineShapeTool, typeof FrameShapeTool, typeof ArrowShapeTool, typeof HighlightShapeTool];

/** @public */
export declare const defaultShapeUtils: readonly [typeof TextShapeUtil, typeof BookmarkShapeUtil, typeof DrawShapeUtil, typeof GeoShapeUtil, typeof NoteShapeUtil, typeof LineShapeUtil, typeof FrameShapeUtil, typeof ArrowShapeUtil, typeof HighlightShapeUtil, typeof EmbedShapeUtil, typeof ImageShapeUtil, typeof VideoShapeUtil];

/** @public @react */
export declare function DefaultSharePanel(): JSX_2.Element;

/** @public @react */
export declare const DefaultStylePanel: NamedExoticComponent<TLUiStylePanelProps>;

/** @public @react */
export declare function DefaultStylePanelContent({ styles }: TLUiStylePanelContentProps): JSX_2.Element | null;

/**
 * The default toolbar for the editor. `children` defaults to the `DefaultToolbarContent` component.
 * Depending on the screen size, the children will overflow into a drop-down menu, with the most
 * recently active item from the overflow being shown in the main toolbar.
 *
 * @public
 * @react
 */
export declare const DefaultToolbar: NamedExoticComponent<DefaultToolbarProps>;

/** @public @react */
export declare function DefaultToolbarContent(): JSX_2.Element;

/** @public */
export declare interface DefaultToolbarProps {
    children?: ReactNode;
}

/** @public */
export declare const defaultTools: readonly [typeof EraserTool, typeof HandTool, typeof LaserTool, typeof ZoomTool, typeof SelectTool];

/** @public @react */
export declare function DefaultTopPanel(): JSX_2.Element;

/** @public @react */
export declare const DefaultZoomMenu: NamedExoticComponent<TLUiZoomMenuProps>;

/** @public @react */
export declare function DefaultZoomMenuContent(): JSX_2.Element;

/** @public @react */
export declare function DeleteMenuItem(): JSX_2.Element;

/** @public @react */
export declare function DiamondToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function DistributeMenuItems(): JSX_2.Element;

/**
 * Resize an image Blob to be smaller than it is currently.
 *
 * @example
 * ```ts
 * const image = await (await fetch('/image.jpg')).blob()
 * const size = await getImageSize(image)
 * const resizedImage = await downsizeImage(image, size.w / 2, size.h / 2, { type: "image/jpeg", quality: 0.85 })
 * ```
 *
 * @param image - The image Blob.
 * @param width - The desired width.
 * @param height - The desired height.
 * @param opts - Options for the image.
 * @public
 */
export declare function downsizeImage(blob: Blob, width: number, height: number, opts?: {
    quality?: number | undefined;
    type?: string | undefined;
}): Promise<Blob>;

/** @public */
export declare class DrawShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static isLockable: boolean;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
    onExit(): void;
}

/** @public */
export declare class DrawShapeUtil extends ShapeUtil<TLDrawShape> {
    static type: "draw";
    static props: RecordProps<TLDrawShape>;
    static migrations: TLPropsMigrations;
    hideResizeHandles(shape: TLDrawShape): boolean;
    hideRotateHandle(shape: TLDrawShape): boolean;
    hideSelectionBoundsFg(shape: TLDrawShape): boolean;
    getDefaultProps(): TLDrawShape['props'];
    getGeometry(shape: TLDrawShape): Circle2d | Polyline2d;
    component(shape: TLDrawShape): JSX_2.Element;
    indicator(shape: TLDrawShape): JSX_2.Element;
    toSvg(shape: TLDrawShape, ctx: SvgExportContext): JSX_2.Element;
    getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[];
    onResize(shape: TLDrawShape, info: TLResizeInfo<TLDrawShape>): {
        props: {
            segments: TLDrawShapeSegment[];
        };
    };
    expandSelectionOutlinePx(shape: TLDrawShape): number;
    getInterpolatedProps(startShape: TLDrawShape, endShape: TLDrawShape, t: number): TLDrawShapeProps;
}

/** @public @react */
export declare function DrawToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function DuplicateMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function EditLinkMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function EditMenuSubmenu(): JSX_2.Element | null;

/** @public @react */
export declare function EditSubmenu(): JSX_2.Element;

/** @public @react */
export declare function EllipseToolbarItem(): JSX_2.Element;

/** @public */
export declare interface EmbedDefinition {
    readonly type: string;
    readonly title: string;
    readonly hostnames: readonly string[];
    readonly minWidth?: number;
    readonly minHeight?: number;
    readonly width: number;
    readonly height: number;
    readonly doesResize: boolean;
    readonly isAspectRatioLocked?: boolean;
    readonly overridePermissions?: TLEmbedShapePermissions;
    readonly instructionLink?: string;
    readonly backgroundColor?: string;
    readonly overrideOutlineRadius?: number;
    readonly toEmbedUrl: (url: string) => string | undefined;
    readonly fromEmbedUrl: (url: string) => string | undefined;
}

/**
 * Permissions with note inline from
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
 *
 * @public
 */
export declare const embedShapePermissionDefaults: {
    readonly 'allow-downloads-without-user-activation': false;
    readonly 'allow-downloads': false;
    readonly 'allow-forms': true;
    readonly 'allow-modals': false;
    readonly 'allow-orientation-lock': false;
    readonly 'allow-pointer-lock': false;
    readonly 'allow-popups-to-escape-sandbox': false;
    readonly 'allow-popups': true;
    readonly 'allow-presentation': false;
    readonly 'allow-same-origin': true;
    readonly 'allow-scripts': true;
    readonly 'allow-storage-access-by-user-activation': false;
    readonly 'allow-top-navigation-by-user-activation': false;
    readonly 'allow-top-navigation': false;
};

/** @public */
export declare class EmbedShapeUtil extends BaseBoxShapeUtil<TLEmbedShape> {
    static type: "embed";
    static props: RecordProps<TLEmbedShape>;
    static migrations: TLPropsMigrations;
    private embedDefinitions;
    setEmbedDefinitions(definitions: TLEmbedDefinition[]): void;
    getEmbedDefinitions(): readonly TLEmbedDefinition[];
    getEmbedDefinition(url: string): TLEmbedResult;
    getText(shape: TLEmbedShape): string;
    hideSelectionBoundsFg(shape: TLEmbedShape): boolean;
    canEdit(): boolean;
    canResize(shape: TLEmbedShape): boolean;
    canEditInReadOnly(): boolean;
    getDefaultProps(): TLEmbedShape['props'];
    isAspectRatioLocked(shape: TLEmbedShape): boolean;
    onResize(shape: TLEmbedShape, info: TLResizeInfo<TLEmbedShape>): TLEmbedShape;
    component(shape: TLEmbedShape): JSX_2.Element | null;
    indicator(shape: TLEmbedShape): JSX_2.Element;
    getInterpolatedProps(startShape: TLEmbedShape, endShape: TLEmbedShape, t: number): TLEmbedShapeProps;
}

/** @public */
export declare class EraserTool extends StateNode {
    static id: string;
    static initial: string;
    static isLockable: boolean;
    static children(): TLStateNodeConstructor[];
    onEnter(): void;
}

/** @public @react */
export declare function EraserToolbarItem(): JSX_2.Element;

/** @public */
export declare interface EventsProviderProps {
    onEvent?: TLUiEventHandler;
    children: React_2.ReactNode;
}

/** @public @react */
export declare function ExampleDialog({ title, body, cancel, confirm, displayDontShowAgain, onCancel, onContinue, }: ExampleDialogProps): JSX_2.Element;

/** @public */
export declare interface ExampleDialogProps {
    title?: string;
    body?: string;
    cancel?: string;
    confirm?: string;
    displayDontShowAgain?: boolean;
    onCancel(): void;
    onContinue(): void;
}

/**
 * Export the given shapes as files.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param name - Name of the exported file. If undefined a predefined name, based on the selection, will be used.
 * @param opts - Options for the export.
 *
 * @public
 */
export declare function exportAs(editor: Editor, ids: TLShapeId[], format: TLExportType | undefined, name: string | undefined, opts?: TLImageExportOptions): Promise<void>;

/** @public @react */
export declare function ExportFileContentSubMenu(): JSX_2.Element;

/**
 * Export the given shapes as a blob.
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param opts - Rendering options.
 * @returns A promise that resolves to a blob.
 * @public
 */
export declare function exportToBlob({ editor, ids, format, opts, }: {
    editor: Editor;
    format: TLExportType;
    ids: TLShapeId[];
    opts?: TLImageExportOptions;
}): Promise<Blob>;

/** @public @react */
export declare function ExtrasGroup(): JSX_2.Element;

/** @public @react */
export declare function FeatureFlags(): JSX_2.Element | null;

/**
 * Fit a frame to its content.
 *
 * @param id - Id of the frame you wish to fit to content.
 * @param editor - tlraw editor instance.
 * @param opts - Options for fitting the frame.
 *
 * @public
 */
export declare function fitFrameToContent(editor: Editor, id: TLShapeId, opts?: {
    padding: number;
}): void;

/** @public @react */
export declare function FitFrameToContentMenuItem(): JSX_2.Element | null;

/** @public */
export declare const FONT_FAMILIES: Record<TLDefaultFontStyle, string>;

/** @public */
export declare const FONT_SIZES: Record<TLDefaultSizeStyle, number>;

/** @public */
export declare class FrameShapeTool extends BaseBoxShapeTool {
    static id: string;
    static initial: string;
    shapeType: string;
    onCreate(shape: null | TLShape): void;
}

/** @public */
export declare class FrameShapeUtil extends BaseBoxShapeUtil<TLFrameShape> {
    static type: "frame";
    static props: RecordProps<TLFrameShape>;
    static migrations: TLPropsMigrations;
    canEdit(): boolean;
    getDefaultProps(): TLFrameShape['props'];
    getGeometry(shape: TLFrameShape): Geometry2d;
    getText(shape: TLFrameShape): string | undefined;
    component(shape: TLFrameShape): JSX_2.Element;
    toSvg(shape: TLFrameShape, ctx: SvgExportContext): JSX_2.Element;
    indicator(shape: TLFrameShape): JSX_2.Element;
    canReceiveNewChildrenOfType(shape: TLShape, _type: TLShape['type']): boolean;
    providesBackgroundForChildren(): boolean;
    canDropShapes(shape: TLFrameShape, _shapes: TLShape[]): boolean;
    onDragShapesOver(frame: TLFrameShape, shapes: TLShape[]): void;
    onDragShapesOut(_shape: TLFrameShape, shapes: TLShape[]): void;
    onResize(shape: any, info: TLResizeInfo<any>): any;
    getInterpolatedProps(startShape: TLFrameShape, endShape: TLFrameShape, t: number): TLFrameShapeProps;
}

/** @public @react */
export declare function FrameToolbarItem(): JSX_2.Element;

/** @public */
export declare class GeoShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
}

/** @public */
export declare class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
    static type: "geo";
    static props: RecordProps<TLGeoShape>;
    static migrations: TLPropsMigrations;
    canEdit(): boolean;
    getDefaultProps(): TLGeoShape['props'];
    getGeometry(shape: TLGeoShape): Group2d;
    getHandleSnapGeometry(shape: TLGeoShape): HandleSnapGeometry;
    getText(shape: TLGeoShape): string;
    onEditEnd(shape: TLGeoShape): void;
    component(shape: TLGeoShape): JSX_2.Element;
    indicator(shape: TLGeoShape): JSX_2.Element;
    toSvg(shape: TLGeoShape, ctx: SvgExportContext): JSX_2.Element;
    getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[];
    onResize(shape: TLGeoShape, { handle, newPoint, scaleX, scaleY, initialShape }: TLResizeInfo<TLGeoShape>): {
        props: {
            growY: number;
            h: number;
            w: number;
        };
        x: number;
        y: number;
    };
    onBeforeCreate(shape: TLGeoShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            align: "end-legacy" | "end" | "middle-legacy" | "middle" | "start-legacy" | "start";
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            dash: "dashed" | "dotted" | "draw" | "solid";
            fill: "fill" | "none" | "pattern" | "semi" | "solid";
            font: "draw" | "mono" | "sans" | "serif";
            geo: "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "check-box" | "cloud" | "diamond" | "ellipse" | "heart" | "hexagon" | "octagon" | "oval" | "pentagon" | "rectangle" | "rhombus-2" | "rhombus" | "star" | "trapezoid" | "triangle" | "x-box";
            growY: number;
            h: number;
            labelColor: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            scale: number;
            size: "l" | "m" | "s" | "xl";
            text: string;
            url: string;
            verticalAlign: "end" | "middle" | "start";
            w: number;
        };
        rotation: number;
        type: "geo";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    onBeforeUpdate(prev: TLGeoShape, next: TLGeoShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            align: "end-legacy" | "end" | "middle-legacy" | "middle" | "start-legacy" | "start";
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            dash: "dashed" | "dotted" | "draw" | "solid";
            fill: "fill" | "none" | "pattern" | "semi" | "solid";
            font: "draw" | "mono" | "sans" | "serif";
            geo: "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "check-box" | "cloud" | "diamond" | "ellipse" | "heart" | "hexagon" | "octagon" | "oval" | "pentagon" | "rectangle" | "rhombus-2" | "rhombus" | "star" | "trapezoid" | "triangle" | "x-box";
            growY: number;
            h: number;
            labelColor: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            scale: number;
            size: "l" | "m" | "s" | "xl";
            text: string;
            url: string;
            verticalAlign: "end" | "middle" | "start";
            w: number;
        };
        rotation: number;
        type: "geo";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    onDoubleClick(shape: TLGeoShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            geo: "check-box";
        };
        rotation: number;
        type: "geo";
        typeName: "shape";
        x: number;
        y: number;
    } | {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            geo: "rectangle";
        };
        rotation: number;
        type: "geo";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    getInterpolatedProps(startShape: TLGeoShape, endShape: TLGeoShape, t: number): TLGeoShapeProps;
}

/** @public @react */
export declare function GeoStylePickerSet({ styles }: StylePickerSetProps): JSX_2.Element | null;

/** @public */
export declare function getArrowBindings(editor: Editor, shape: TLArrowShape): TLArrowBindings;

/** @public */
export declare function getArrowTerminalsInArrowSpace(editor: Editor, shape: TLArrowShape, bindings: TLArrowBindings): {
    end: Vec;
    start: Vec;
};

/**
 * Tests whether an URL supports embedding and returns the result. If we encounter an error, we
 * return undefined.
 *
 * @param inputUrl - The URL to match
 * @public
 */
export declare function getEmbedInfo(definitions: readonly TLEmbedDefinition[], inputUrl: string): TLEmbedResult;

/** @public */
export declare function getOccludedChildren(editor: Editor, parent: TLShape): TLShapeId[];

/** @public */
export declare function getSvgAsImage(editor: Editor, svgString: string, options: {
    height: number;
    pixelRatio?: number;
    quality?: number;
    type: 'jpeg' | 'png' | 'webp';
    width: number;
}): Promise<Blob | null>;

/** @public @react */
export declare function GroupMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function GroupOrUngroupMenuItem(): JSX_2.Element;

/** @public */
export declare class HandTool extends StateNode {
    static id: string;
    static initial: string;
    static isLockable: boolean;
    static children(): TLStateNodeConstructor[];
    onDoubleClick(info: TLClickEventInfo): void;
    onTripleClick(info: TLClickEventInfo): void;
    onQuadrupleClick(info: TLClickEventInfo): void;
}

/** @public @react */
export declare function HandToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function HexagonToolbarItem(): JSX_2.Element;

/** @public */
export declare class HighlightShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    static isLockable: boolean;
    shapeType: string;
    onExit(): void;
}

/** @public */
export declare class HighlightShapeUtil extends ShapeUtil<TLHighlightShape> {
    static type: "highlight";
    static props: RecordProps<TLHighlightShape>;
    static migrations: TLPropsMigrations;
    hideResizeHandles(shape: TLHighlightShape): boolean;
    hideRotateHandle(shape: TLHighlightShape): boolean;
    hideSelectionBoundsFg(shape: TLHighlightShape): boolean;
    getDefaultProps(): TLHighlightShape['props'];
    getGeometry(shape: TLHighlightShape): Circle2d | Polygon2d;
    component(shape: TLHighlightShape): JSX_2.Element;
    backgroundComponent(shape: TLHighlightShape): JSX_2.Element;
    indicator(shape: TLHighlightShape): JSX_2.Element;
    toSvg(shape: TLHighlightShape): JSX_2.Element;
    toBackgroundSvg(shape: TLHighlightShape): JSX_2.Element;
    onResize(shape: TLHighlightShape, info: TLResizeInfo<TLHighlightShape>): {
        props: {
            segments: TLDrawShapeSegment[];
        };
    };
    getInterpolatedProps(startShape: TLHighlightShape, endShape: TLHighlightShape, t: number): TLHighlightShapeProps;
}

/** @public @react */
export declare function HighlightToolbarItem(): JSX_2.Element;

/** @public */
export declare class ImageShapeUtil extends BaseBoxShapeUtil<TLImageShape> {
    static type: "image";
    static props: RecordProps<TLImageShape>;
    static migrations: TLPropsMigrations;
    isAspectRatioLocked(): boolean;
    canCrop(): boolean;
    getDefaultProps(): TLImageShape['props'];
    onResize(shape: TLImageShape, info: TLResizeInfo<TLImageShape>): TLImageShape;
    component(shape: TLImageShape): JSX_2.Element;
    indicator(shape: TLImageShape): JSX_2.Element | null;
    toSvg(shape: TLImageShape): Promise<JSX_2.Element | null>;
    onDoubleClickEdge(shape: TLImageShape): void;
    getInterpolatedProps(startShape: TLImageShape, endShape: TLImageShape, t: number): TLImageShapeProps;
}

/** @public @react */
export declare function KeyboardShortcutsMenuItem(): JSX_2.Element | null;

/* Excluded from this release type: kickoutOccludedShapes */

/** @public */
export declare const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number>;

/** @public @react */
export declare function LanguageMenu(): JSX_2.Element;

/** @public */
export declare class LaserTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    static isLockable: boolean;
    onEnter(): void;
}

/** @public @react */
export declare function LaserToolbarItem(): JSX_2.Element;

/** @public */
export declare class LineShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
}

/** @public */
export declare class LineShapeUtil extends ShapeUtil<TLLineShape> {
    static type: "line";
    static props: RecordProps<TLLineShape>;
    static migrations: TLPropsMigrations;
    hideResizeHandles(): boolean;
    hideRotateHandle(): boolean;
    hideSelectionBoundsFg(): boolean;
    hideSelectionBoundsBg(): boolean;
    getDefaultProps(): TLLineShape['props'];
    getGeometry(shape: TLLineShape): CubicSpline2d | Polyline2d;
    getHandles(shape: TLLineShape): TLHandle[];
    onResize(shape: TLLineShape, info: TLResizeInfo<TLLineShape>): {
        props: {
            points: {
                [x: string]: {
                    id: string;
                    index: IndexKey;
                    x: number;
                    y: number;
                };
            };
        };
    };
    onBeforeCreate(next: TLLineShape): TLLineShape | void;
    onHandleDrag(shape: TLLineShape, { handle }: TLHandleDragInfo<TLLineShape>): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            dash: "dashed" | "dotted" | "draw" | "solid";
            points: {
                [x: string]: {
                    id: string;
                    index: IndexKey;
                    x: number;
                    y: number;
                } | TLLineShapePoint;
            };
            scale: number;
            size: "l" | "m" | "s" | "xl";
            spline: "cubic" | "line";
        };
        rotation: number;
        type: "line";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    component(shape: TLLineShape): JSX_2.Element;
    indicator(shape: TLLineShape): JSX_2.Element;
    toSvg(shape: TLLineShape): JSX_2.Element;
    getHandleSnapGeometry(shape: TLLineShape): HandleSnapGeometry;
    getInterpolatedProps(startShape: TLLineShape, endShape: TLLineShape, t: number): TLLineShape['props'];
}

/** @public @react */
export declare function LineToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function MiscMenuGroup(): JSX_2.Element;

/** @public @react */
export declare function MobileStylePanel(): JSX_2.Element | null;

/** @public @react */
export declare function MoveToPageMenu(): JSX_2.Element | null;

/** @public */
export declare class NoteShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
}

/** @public */
export declare class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
    static type: "note";
    static props: RecordProps<TLNoteShape>;
    static migrations: TLPropsMigrations;
    canEdit(): boolean;
    hideResizeHandles(): boolean;
    hideSelectionBoundsFg(): boolean;
    getDefaultProps(): TLNoteShape['props'];
    getGeometry(shape: TLNoteShape): Group2d;
    getHandles(shape: TLNoteShape): TLHandle[];
    getText(shape: TLNoteShape): string;
    component(shape: TLNoteShape): JSX_2.Element;
    indicator(shape: TLNoteShape): JSX_2.Element;
    toSvg(shape: TLNoteShape, ctx: SvgExportContext): JSX_2.Element;
    onBeforeCreate(next: TLNoteShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            align: "end-legacy" | "end" | "middle-legacy" | "middle" | "start-legacy" | "start";
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            font: "draw" | "mono" | "sans" | "serif";
            fontSizeAdjustment: number;
            growY: number;
            labelColor: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            scale: number;
            size: "l" | "m" | "s" | "xl";
            text: string;
            url: string;
            verticalAlign: "end" | "middle" | "start";
        };
        rotation: number;
        type: "note";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    onBeforeUpdate(prev: TLNoteShape, next: TLNoteShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            align: "end-legacy" | "end" | "middle-legacy" | "middle" | "start-legacy" | "start";
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            font: "draw" | "mono" | "sans" | "serif";
            fontSizeAdjustment: number;
            growY: number;
            labelColor: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            scale: number;
            size: "l" | "m" | "s" | "xl";
            text: string;
            url: string;
            verticalAlign: "end" | "middle" | "start";
        };
        rotation: number;
        type: "note";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
    onEditEnd(shape: TLNoteShape): void;
    getInterpolatedProps(startShape: TLNoteShape, endShape: TLNoteShape, t: number): TLNoteShapeProps;
}

/** @public @react */
export declare function NoteToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function OfflineIndicator(): JSX_2.Element;

/** @public @react */
export declare function OpacitySlider(): JSX_2.Element | null;

/** @public @react */
export declare function OvalToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function OverflowingToolbar({ children }: OverflowingToolbarProps): JSX_2.Element;

/** @public */
export declare interface OverflowingToolbarProps {
    children: React.ReactNode;
}

/** @public @react */
export declare const PageItemInput: ({ name, id, isCurrentPage, onCancel, }: PageItemInputProps) => JSX_2.Element;

/** @public */
export declare interface PageItemInputProps {
    name: string;
    id: TLPageId;
    isCurrentPage: boolean;
    onCancel(): void;
}

/** @public */
export declare const PageItemSubmenu: NamedExoticComponent<PageItemSubmenuProps>;

/** @public */
export declare interface PageItemSubmenuProps {
    index: number;
    item: {
        id: string;
        name: string;
    };
    listSize: number;
    onRename?(): void;
}

/* Excluded from this release type: parseAndLoadDocument */

/** @public */
export declare function parseTldrawJsonFile({ json, schema, }: {
    json: string;
    schema: TLSchema;
}): Result<TLStore, TldrawFileParseError>;

/** @public @react */
export declare function PasteMenuItem(): JSX_2.Element;

/** @public @react */
export declare const PeopleMenu: NamedExoticComponent<PeopleMenuProps>;

/** @public */
export declare interface PeopleMenuProps {
    children?: ReactNode;
}

/** @public */
export declare enum PORTRAIT_BREAKPOINT {
    ZERO = 0,
    MOBILE_XXS = 1,
    MOBILE_XS = 2,
    MOBILE_SM = 3,
    MOBILE = 4,
    TABLET_SM = 5,
    TABLET = 6,
    DESKTOP = 7
}

/** @public @react */
export declare function PreferencesGroup(): JSX_2.Element;

/** @public */
export declare function preloadFont(id: string, font: TLTypeFace): Promise<FontFace>;

/** @public @react */
export declare function PrintItem(): JSX_2.Element;

/** @public @react */
export declare function RectangleToolbarItem(): JSX_2.Element;

/** @public */
export declare function registerDefaultExternalContentHandlers(editor: Editor, { maxImageDimension, maxAssetSize, acceptedImageMimeTypes, acceptedVideoMimeTypes, }: Required<TLExternalContentProps>, { toasts, msg }: {
    msg: ReturnType<typeof useTranslation>;
    toasts: TLUiToastsContextType;
}): void;

/** @public */
export declare function registerDefaultSideEffects(editor: Editor): () => void;

/**
 * Remove a frame.
 *
 * @param editor - tldraw editor instance.
 * @param ids - Ids of the frames you wish to remove.
 *
 * @public
 */
export declare function removeFrame(editor: Editor, ids: TLShapeId[]): void;

/** @public @react */
export declare function RemoveFrameMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function ReorderMenuItems(): JSX_2.Element;

/** @public @react */
export declare function ReorderMenuSubmenu(): JSX_2.Element | null;

/** @public @react */
export declare function RhombusToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function RotateCWMenuItem(): JSX_2.Element;

/** @public @react */
export declare function SelectAllMenuItem(): JSX_2.Element;

/** @public */
export declare class SelectTool extends StateNode {
    static id: string;
    static initial: string;
    static isLockable: boolean;
    reactor: (() => void) | undefined;
    static children(): TLStateNodeConstructor[];
    cleanUpDuplicateProps(): void;
    onEnter(): void;
    onExit(): void;
}

/** @public @react */
export declare function SelectToolbarItem(): JSX_2.Element;

/** @public */
export declare function serializeTldrawJson(editor: Editor): Promise<string>;

/** @public */
export declare function serializeTldrawJsonBlob(editor: Editor): Promise<Blob>;

/* Excluded from this release type: setDefaultEditorAssetUrls */

/* Excluded from this release type: setDefaultUiAssetUrls */

/* Excluded from this release type: Spinner */

/** @public @react */
export declare function SplineStylePickerSet({ styles }: StylePickerSetProps): JSX_2.Element | null;

/** @public @react */
export declare function StackMenuItems(): JSX_2.Element;

/** @public @react */
export declare function StarToolbarItem(): JSX_2.Element;

/** @public */
export declare const STROKE_SIZES: Record<TLDefaultSizeStyle, number>;

/** @public */
export declare interface StylePickerSetProps {
    styles: ReadonlySharedStyleMap;
}

/** @public */
export declare type StyleValuesForUi<T> = readonly {
    readonly icon: string;
    readonly value: T;
}[];

/** @public */
export declare const TEXT_PROPS: {
    fontStyle: string;
    fontVariant: string;
    fontWeight: string;
    lineHeight: number;
    padding: string;
};

/** @public @react */
export declare const TextLabel: React_3.NamedExoticComponent<TextLabelProps>;

/** @public */
export declare interface TextLabelProps {
    shapeId: TLShapeId;
    type: string;
    font: TLDefaultFontStyle;
    fontSize: number;
    lineHeight: number;
    fill?: TLDefaultFillStyle;
    align: TLDefaultHorizontalAlignStyle;
    verticalAlign: TLDefaultVerticalAlignStyle;
    wrap?: boolean;
    text: string;
    labelColor: string;
    bounds?: Box;
    isNote?: boolean;
    isSelected: boolean;
    onKeyDown?(e: React_3.KeyboardEvent<HTMLTextAreaElement>): void;
    classNamePrefix?: string;
    style?: React_3.CSSProperties;
    textWidth?: number;
    textHeight?: number;
    padding?: number;
}

/** @public */
export declare class TextShapeTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    shapeType: string;
}

/** @public */
export declare class TextShapeUtil extends ShapeUtil<TLTextShape> {
    static type: "text";
    static props: RecordProps<TLTextShape>;
    static migrations: TLPropsMigrations;
    getDefaultProps(): TLTextShape['props'];
    getMinDimensions(shape: TLTextShape): {
        height: number;
        width: number;
    };
    getGeometry(shape: TLTextShape): Rectangle2d;
    getText(shape: TLTextShape): string;
    canEdit(): boolean;
    isAspectRatioLocked(): boolean;
    component(shape: TLTextShape): JSX_2.Element;
    indicator(shape: TLTextShape): JSX_2.Element | null;
    toSvg(shape: TLTextShape, ctx: SvgExportContext): JSX_2.Element;
    onResize(shape: TLTextShape, info: TLResizeInfo<TLTextShape>): {
        id: TLShapeId;
        props: {
            autoSize: boolean;
            w: number;
        };
        type: "text";
        x: number;
        y: number;
    } | {
        id: TLShapeId;
        props: {
            scale: number;
        };
        type: "text";
        x: number;
        y: number;
    };
    onEditEnd(shape: TLTextShape): void;
    onBeforeUpdate(prev: TLTextShape, next: TLTextShape): {
        id: TLShapeId;
        index: IndexKey;
        isLocked: boolean;
        meta: JsonObject;
        opacity: number;
        parentId: TLParentId;
        props: {
            autoSize: boolean;
            color: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow";
            font: "draw" | "mono" | "sans" | "serif";
            scale: number;
            size: "l" | "m" | "s" | "xl";
            text: string;
            textAlign: "end" | "middle" | "start";
            w: number;
        };
        rotation: number;
        type: "text";
        typeName: "shape";
        x: number;
        y: number;
    } | undefined;
}

/** @public @react */
export declare function TextStylePickerSet({ theme, styles }: ThemeStylePickerSetProps): JSX_2.Element | null;

/** @public @react */
export declare function TextToolbarItem(): JSX_2.Element;

/** @public */
export declare interface ThemeStylePickerSetProps {
    styles: ReadonlySharedStyleMap;
    theme: TLDefaultColorTheme;
}

/** @public */
export declare interface TLArcInfo {
    center: VecLike;
    radius: number;
    size: number;
    length: number;
    largeArcFlag: number;
    sweepFlag: number;
}

/** @public */
export declare interface TLArrowBindings {
    start: TLArrowBinding | undefined;
    end: TLArrowBinding | undefined;
}

/** @public */
export declare type TLArrowInfo = {
    bindings: TLArrowBindings;
    bodyArc: TLArcInfo;
    end: TLArrowPoint;
    handleArc: TLArcInfo;
    isStraight: false;
    isValid: boolean;
    middle: VecLike;
    start: TLArrowPoint;
} | {
    bindings: TLArrowBindings;
    end: TLArrowPoint;
    isStraight: true;
    isValid: boolean;
    length: number;
    middle: VecLike;
    start: TLArrowPoint;
};

/** @public */
export declare interface TLArrowPoint {
    handle: VecLike;
    point: VecLike;
    arrowhead: TLArrowShapeArrowheadStyle;
}

/**
 * Override the default react components used by the editor and UI. Set components to null to
 * disable them entirely.
 *
 * @example
 * ```tsx
 * import {Tldraw, TLComponents} from 'tldraw'
 *
 * const components: TLComponents = {
 *    Scribble: MyCustomScribble,
 * }
 *
 * export function MyApp() {
 *   return <Tldraw components={components} />
 * }
 * ```
 *
 *
 * @public
 */
export declare interface TLComponents extends TLEditorComponents, TLUiComponents {
}

/** @public */
export declare type TLCopyType = 'jpeg' | 'json' | 'png' | 'svg';

/** @public @react */
export declare function Tldraw(props: TldrawProps): JSX_2.Element;

/** @public */
export declare const TLDRAW_FILE_EXTENSION: ".tldr";

/** @public */
export declare interface TldrawBaseProps extends TldrawUiProps, TldrawEditorBaseProps, TLExternalContentProps {
    components?: TLComponents;
    embeds?: TLEmbedDefinition[];
}

/** @public */
export declare interface TldrawFile {
    tldrawFileFormatVersion: number;
    schema: SerializedSchema;
    records: UnknownRecord[];
}

/** @public */
export declare type TldrawFileParseError = {
    cause: unknown;
    type: 'invalidRecords';
} | {
    cause: unknown;
    type: 'notATldrawFile';
} | {
    data: any;
    type: 'v1File';
} | {
    reason: MigrationFailureReason;
    type: 'migrationFailed';
} | {
    type: 'fileFormatVersionTooNew';
    version: number;
};

/** @public @react */
export declare function TldrawHandles({ children }: TLHandlesProps): JSX_2.Element | null;

/**
 * A renderered SVG image of a Tldraw snapshot.
 *
 * @example
 * ```tsx
 * <TldrawImage
 * 	snapshot={snapshot}
 * 	pageId={pageId}
 * 	background={false}
 *  darkMode={true}
 *  bounds={new Box(0,0,600,400)}
 *  scale={1}
 * />
 * ```
 *
 * @public
 * @react
 */
export declare const TldrawImage: NamedExoticComponent<TldrawImageProps>;

/** @public */
export declare interface TldrawImageProps extends TLImageExportOptions {
    /**
     * The snapshot to display.
     */
    snapshot: Partial<TLEditorSnapshot> | TLStoreSnapshot;
    /**
     * The image format to use. Defaults to 'svg'.
     */
    format?: 'png' | 'svg';
    /**
     * The page to display. Defaults to the first page.
     */
    pageId?: TLPageId;
    /**
     * Additional shape utils to use.
     */
    shapeUtils?: readonly TLAnyShapeUtilConstructor[];
    /**
     * Additional binding utils to use.
     */
    bindingUtils?: readonly TLAnyBindingUtilConstructor[];
    /**
     * The license key.
     */
    licenseKey?: string;
    /**
     * Asset URL overrides.
     */
    assetUrls?: TLUiAssetUrlOverrides;
}

/** @public */
export declare type TldrawProps = TldrawBaseProps & TldrawEditorStoreProps;

/** @public @react */
export declare function TldrawScribble({ scribble, zoom, color, opacity, className }: TLScribbleProps): JSX_2.Element | null;

/** @public @react */
export declare const TldrawSelectionBackground: ({ bounds, rotation }: TLSelectionBackgroundProps) => JSX_2.Element | null;

/** @public */
export declare const TldrawSelectionForeground: NamedExoticComponent<TLSelectionForegroundProps>;

/** @public @react */
export declare function TldrawShapeIndicators(): JSX_2.Element | null;

/**
 * @public
 * @react
 */
export declare const TldrawUi: React_3.NamedExoticComponent<TldrawUiProps>;

/** @public @react */
export declare const TldrawUiButton: React_2.ForwardRefExoticComponent<TLUiButtonProps & React_2.RefAttributes<HTMLButtonElement>>;

/** @public @react */
export declare function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiButtonIcon({ icon, small, invertIcon }: TLUiButtonIconProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiButtonLabel({ children }: TLUiButtonLabelProps): JSX_2.Element;

/** @public */
export declare const TldrawUiButtonPicker: <T extends string>(props: TLUiButtonPickerProps<T>) => ReactElement;

/** @public @react */
export declare function TldrawUiComponentsProvider({ overrides, children, }: TLUiComponentsProviderProps): JSX_2.Element;

/** @public @react */
export declare const TldrawUiContextProvider: NamedExoticComponent<TLUiContextProviderProps>;

/** @public @react */
export declare function TldrawUiDialogBody({ className, children, style }: TLUiDialogBodyProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDialogCloseButton(): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDialogFooter({ className, children }: TLUiDialogFooterProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDialogHeader({ className, children }: TLUiDialogHeaderProps): JSX_2.Element;

/** @public @react */
export declare const TldrawUiDialogs: NamedExoticComponent<object>;

/** @public @react */
export declare function TldrawUiDialogsProvider({ context, children }: TLUiDialogsProviderProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDialogTitle({ className, children }: TLUiDialogTitleProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuCheckboxItem({ children, onSelect, ...rest }: TLUiDropdownMenuCheckboxItemProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuContent({ className, side, align, sideOffset, alignOffset, children, }: TLUiDropdownMenuContentProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuGroup({ children }: TLUiDropdownMenuGroupProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuIndicator(): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuItem({ noClose, children }: TLUiDropdownMenuItemProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuRoot({ id, children, modal, debugOpen, }: TLUiDropdownMenuRootProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuSub({ id, children }: TLUiDropdownMenuSubProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuSubTrigger({ id, label, title, disabled, }: TLUiDropdownMenuSubTriggerProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiDropdownMenuTrigger({ children, ...rest }: TLUiDropdownMenuTriggerProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiEventsProvider({ onEvent, children }: EventsProviderProps): JSX_2.Element;

/** @public @react */
export declare const TldrawUiIcon: NamedExoticComponent<TLUiIconProps>;

/** @public @react */
export declare const TldrawUiInput: React_2.ForwardRefExoticComponent<TLUiInputProps & React_2.RefAttributes<HTMLInputElement>>;

/** @public @react */
export declare function TldrawUiKbd({ children, visibleOnMobileLayout }: TLUiKbdProps): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiMenuActionCheckboxItem({ actionId, ...rest }: TLUiMenuActionCheckboxItemProps): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiMenuActionItem({ actionId, ...rest }: TLUiMenuActionItemProps): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiMenuCheckboxItem<TranslationKey extends string = string, IconType extends string = string>({ id, kbd, label, readonlyOk, onSelect, toggle, disabled, checked, }: TLUiMenuCheckboxItemProps<TranslationKey, IconType>): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiMenuContextProvider({ type, sourceId, children, }: TLUiMenuContextProviderProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiMenuGroup({ id, label, children }: TLUiMenuGroupProps): boolean | JSX_2.Element | Iterable<ReactNode> | null | number | string | undefined;

/** @public @react */
export declare function TldrawUiMenuItem<TranslationKey extends string = string, IconType extends string = string>({ disabled, spinner, readonlyOk, id, kbd, label, icon, onSelect, noClose, isSelected, }: TLUiMenuItemProps<TranslationKey, IconType>): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiMenuSubmenu<Translation extends string = string>({ id, disabled, label, size, children, }: TLUiMenuSubmenuProps<Translation>): boolean | JSX_2.Element | Iterable<ReactNode> | null | number | string | undefined;

/** @public @react */
export declare function TldrawUiMenuToolItem({ toolId, ...rest }: TLUiMenuToolItemProps): JSX_2.Element | null;

/** @public @react */
export declare function TldrawUiPopover({ id, children, onOpenChange, open }: TLUiPopoverProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiPopoverContent({ side, children, align, sideOffset, alignOffset, disableEscapeKeyDown, }: TLUiPopoverContentProps): JSX_2.Element;

/** @public @react */
export declare function TldrawUiPopoverTrigger({ children }: TLUiPopoverTriggerProps): JSX_2.Element;

/** @public */
export declare interface TldrawUiProps extends TLUiContextProviderProps {
    /**
     * The component's children.
     */
    children?: ReactNode;
    /**
     * Whether to hide the user interface and only display the canvas.
     */
    hideUi?: boolean;
    /**
     * Overrides for the UI components.
     */
    components?: TLUiComponents;
    /**
     * Additional items to add to the debug menu (will be deprecated)
     */
    renderDebugMenuItems?(): React_3.ReactNode;
    /** Asset URL override. */
    assetUrls?: TLUiAssetUrlOverrides;
}

/** @public @react */
export declare const TldrawUiSlider: NamedExoticComponent<TLUiSliderProps>;

/** @public @react */
export declare const TldrawUiToasts: NamedExoticComponent<object>;

/** @public @react */
export declare function TldrawUiToastsProvider({ children }: TLUiToastsProviderProps): JSX_2.Element;

/* Excluded from this release type: TldrawUiTranslationProvider */

/** @public */
export declare interface TLEditorAssetUrls {
    fonts: {
        draw: string;
        monospace: string;
        sansSerif: string;
        serif: string;
    };
}

/** @public */
export declare type TLEmbedDefinition = CustomEmbedDefinition | EmbedDefinition;

/** @public */
export declare type TLEmbedResult = {
    definition: TLEmbedDefinition;
    embedUrl: string;
    url: string;
} | undefined;

/** @public */
export declare type TLEmbedShapePermissions = {
    [K in keyof typeof embedShapePermissionDefaults]?: boolean;
};

/** @public */
export declare type TLExportType = 'jpeg' | 'json' | 'png' | 'svg' | 'webp';

/** @public */
export declare interface TLExternalContentProps {
    /**
     * The maximum dimension (width or height) of an image. Images larger than this will be rescaled
     * to fit. Defaults to infinity.
     */
    maxImageDimension?: number;
    /**
     * The maximum size (in bytes) of an asset. Assets larger than this will be rejected. Defaults
     * to 10mb (10 * 1024 * 1024).
     */
    maxAssetSize?: number;
    /**
     * The mime types of images that are allowed to be handled. Defaults to
     * DEFAULT_SUPPORTED_IMAGE_TYPES.
     */
    acceptedImageMimeTypes?: readonly string[];
    /**
     * The mime types of videos that are allowed to be handled. Defaults to
     * DEFAULT_SUPPORT_VIDEO_TYPES.
     */
    acceptedVideoMimeTypes?: readonly string[];
}

/** @public */
export declare interface TLTypeFace {
    url: string;
    display?: any;
    featureSettings?: string;
    stretch?: string;
    style?: string;
    unicodeRange?: string;
    variant?: string;
    weight?: string;
    format?: string;
}

/** @public */
export declare interface TLUiActionItem<TransationKey extends string = string, IconType extends string = string> {
    icon?: IconType;
    id: string;
    kbd?: string;
    label?: {
        [key: string]: TransationKey;
    } | TransationKey;
    readonlyOk?: boolean;
    checkbox?: boolean;
    onSelect(source: TLUiEventSource): Promise<void> | void;
}

/** @public */
export declare type TLUiActionsContextType = Record<string, TLUiActionItem>;

/** @public */
export declare interface TLUiActionsMenuProps {
    children?: ReactNode;
}

/** @public */
export declare type TLUiAssetUrlOverrides = RecursivePartial<TLUiAssetUrls>;

/** @public */
export declare type TLUiAssetUrls = TLEditorAssetUrls & {
    embedIcons: Record<(typeof DEFAULT_EMBED_DEFINITIONS)[number]['type'], string>;
    icons: Record<Exclude<string, TLUiIconType> | TLUiIconType, string>;
    translations: Record<(typeof LANGUAGES)[number]['locale'], string>;
};

/** @public */
export declare interface TLUiButtonCheckProps {
    checked: boolean;
}

/** @public */
export declare interface TLUiButtonIconProps {
    icon: string;
    small?: boolean;
    invertIcon?: boolean;
}

/** @public */
export declare interface TLUiButtonLabelProps {
    children?: ReactNode;
}

/** @public */
export declare interface TLUiButtonPickerProps<T extends string> {
    title: string;
    uiType: string;
    style: StyleProp<T>;
    value: SharedStyle<T>;
    items: StyleValuesForUi<T>;
    theme: TLDefaultColorTheme;
    onValueChange(style: StyleProp<T>, value: T): void;
    onHistoryMark?(id: string): void;
}

/** @public */
export declare interface TLUiButtonProps extends React_2.HTMLAttributes<HTMLButtonElement> {
    disabled?: boolean;
    type: 'danger' | 'help' | 'icon' | 'low' | 'menu' | 'normal' | 'primary' | 'tool';
}

/** @public */
export declare interface TLUiComponents {
    ContextMenu?: ComponentType<TLUiContextMenuProps> | null;
    ActionsMenu?: ComponentType<TLUiActionsMenuProps> | null;
    HelpMenu?: ComponentType<TLUiHelpMenuProps> | null;
    ZoomMenu?: ComponentType<TLUiZoomMenuProps> | null;
    MainMenu?: ComponentType<TLUiMainMenuProps> | null;
    Minimap?: ComponentType | null;
    StylePanel?: ComponentType<TLUiStylePanelProps> | null;
    PageMenu?: ComponentType | null;
    NavigationPanel?: ComponentType | null;
    Toolbar?: ComponentType | null;
    KeyboardShortcutsDialog?: ComponentType<TLUiKeyboardShortcutsDialogProps> | null;
    QuickActions?: ComponentType<TLUiQuickActionsProps> | null;
    HelperButtons?: ComponentType<TLUiHelperButtonsProps> | null;
    DebugPanel?: ComponentType | null;
    DebugMenu?: ComponentType | null;
    MenuPanel?: ComponentType | null;
    TopPanel?: ComponentType | null;
    SharePanel?: ComponentType | null;
    CursorChatBubble?: ComponentType | null;
}

/** @public */
export declare interface TLUiComponentsProviderProps {
    overrides?: TLUiComponents;
    children: ReactNode;
}

/** @public */
export declare interface TLUiContextMenuProps {
    children?: ReactNode;
    disabled?: boolean;
}

/** @public */
export declare interface TLUiContextProviderProps {
    /**
     * Urls for where to find fonts and other assets for the UI.
     */
    assetUrls?: RecursivePartial<TLUiAssetUrls>;
    /**
     * Overrides for the UI.
     */
    overrides?: TLUiOverrides | TLUiOverrides[];
    /**
     * Overrides for the UI components.
     */
    components?: TLUiComponents;
    /**
     * Callback for when an event occurs in the UI.
     */
    onUiEvent?: TLUiEventHandler;
    /**
     * Whether to always should the mobile breakpoints.
     */
    forceMobile?: boolean;
    /**
     * The component's children.
     */
    children?: ReactNode;
    /**
     * Supported mime types for media files.
     */
    mediaMimeTypes?: string[];
}

/** @public */
export declare interface TLUiDebugMenuProps {
    children?: ReactNode;
}

/** @public */
export declare interface TLUiDialog {
    id: string;
    onClose?(): void;
    component: ComponentType<TLUiDialogProps>;
}

/** @public */
export declare interface TLUiDialogBodyProps {
    className?: string;
    children: ReactNode;
    style?: React.CSSProperties;
}

/** @public */
export declare interface TLUiDialogFooterProps {
    className?: string;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDialogHeaderProps {
    className?: string;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDialogProps {
    onClose(): void;
}

/** @public */
export declare interface TLUiDialogsContextType {
    addDialog(dialog: Omit<TLUiDialog, 'id'> & {
        id?: string;
    }): string;
    removeDialog(id: string): string;
    clearDialogs(): void;
    dialogs: Atom<TLUiDialog[]>;
}

/** @public */
export declare interface TLUiDialogsProviderProps {
    context?: string;
    overrides?(editor: Editor): TLUiDialogsContextType;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDialogTitleProps {
    className?: string;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuCheckboxItemProps {
    checked?: boolean;
    onSelect?(e: Event): void;
    disabled?: boolean;
    title: string;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuContentProps {
    id?: string;
    className?: string;
    side?: 'bottom' | 'left' | 'right' | 'top';
    align?: 'center' | 'end' | 'start';
    sideOffset?: number;
    alignOffset?: number;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuGroupProps {
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuItemProps {
    noClose?: boolean;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuRootProps {
    id: string;
    children: ReactNode;
    modal?: boolean;
    debugOpen?: boolean;
}

/** @public */
export declare interface TLUiDropdownMenuSubProps {
    id: string;
    children: ReactNode;
}

/** @public */
export declare interface TLUiDropdownMenuSubTriggerProps {
    label: string;
    id?: string;
    title?: string;
    disabled?: boolean;
}

/** @public */
export declare interface TLUiDropdownMenuTriggerProps {
    children?: ReactNode;
}

/** @public */
export declare type TLUiEventContextType = TLUiEventHandler;

/** @public */
export declare type TLUiEventData<K> = K extends null ? {
    source: TLUiEventSource;
} : {
    source: TLUiEventSource;
} & K;

/** @public */
export declare type TLUiEventHandler = <T extends keyof TLUiEventMap>(name: T, data: TLUiEventData<TLUiEventMap[T]>) => void;

/** @public */
export declare interface TLUiEventMap {
    undo: null;
    redo: null;
    'change-language': {
        locale: string;
    };
    'change-page': null;
    'delete-page': null;
    'duplicate-page': null;
    'move-page': null;
    'new-page': null;
    'rename-page': null;
    'move-to-page': null;
    'move-to-new-page': null;
    'rename-document': null;
    'group-shapes': null;
    'ungroup-shapes': null;
    'remove-frame': null;
    'fit-frame-to-content': null;
    'convert-to-embed': null;
    'convert-to-bookmark': null;
    'open-embed-link': null;
    'toggle-auto-size': null;
    'copy-as': {
        format: 'json' | 'png' | 'svg';
    };
    'export-as': {
        format: 'json' | 'png' | 'svg';
    };
    'export-all-as': {
        format: 'json' | 'png' | 'svg';
    };
    'edit-link': null;
    'insert-embed': null;
    'insert-media': null;
    'align-shapes': {
        operation: 'bottom' | 'center-horizontal' | 'center-vertical' | 'left' | 'right' | 'top';
    };
    'duplicate-shapes': null;
    'pack-shapes': null;
    'stack-shapes': {
        operation: 'horizontal' | 'vertical';
    };
    'flip-shapes': {
        operation: 'horizontal' | 'vertical';
    };
    'distribute-shapes': {
        operation: 'horizontal' | 'vertical';
    };
    'stretch-shapes': {
        operation: 'horizontal' | 'vertical';
    };
    'reorder-shapes': {
        operation: 'backward' | 'forward' | 'toBack' | 'toFront';
    };
    'delete-shapes': null;
    'select-all-shapes': null;
    'select-none-shapes': null;
    'rotate-ccw': null;
    'rotate-cw': null;
    'zoom-in': null;
    'zoom-out': null;
    'zoom-to-fit': null;
    'zoom-to-selection': null;
    'reset-zoom': null;
    'zoom-into-view': null;
    'zoom-to-content': null;
    'toggle-zoom': null;
    'open-menu': {
        id: string;
    };
    'close-menu': {
        id: string;
    };
    'create-new-project': null;
    'save-project-to-file': null;
    'open-file': null;
    'select-tool': {
        id: string;
    };
    print: null;
    copy: null;
    paste: null;
    cut: null;
    'set-style': {
        id: string;
        value: number | string;
    };
    'toggle-transparent': null;
    'toggle-snap-mode': null;
    'toggle-tool-lock': null;
    'toggle-grid-mode': null;
    'toggle-wrap-mode': null;
    'toggle-focus-mode': null;
    'toggle-debug-mode': null;
    'toggle-dynamic-size-mode': null;
    'toggle-paste-at-cursor': null;
    'toggle-lock': null;
    'toggle-reduce-motion': null;
    'toggle-edge-scrolling': null;
    'color-scheme': {
        value: string;
    };
    'exit-pen-mode': null;
    'start-following': null;
    'stop-following': null;
    'set-color': null;
    'change-user-name': null;
    'open-cursor-chat': null;
    'zoom-tool': null;
    'unlock-all': null;
    'flatten-to-image': null;
    'open-url': {
        url: string;
    };
    'copy-link': null;
}

/** @public */
export declare type TLUiEventSource = 'actions-menu' | 'context-menu' | 'debug-panel' | 'dialog' | 'document-name' | 'export-menu' | 'help-menu' | 'helper-buttons' | 'kbd' | 'main-menu' | 'menu' | 'navigation-zone' | 'page-menu' | 'people-menu' | 'quick-actions' | 'share-menu' | 'style-panel' | 'toolbar' | 'unknown' | 'zoom-menu';

/** @public */
export declare interface TLUiHelperButtonsProps {
    children?: ReactNode;
}

/** @public */
export declare interface TLUiHelpMenuProps {
    children?: ReactNode;
}

/** @public */
export declare interface TLUiIconProps extends React.HTMLProps<HTMLDivElement> {
    icon: Exclude<string, TLUiIconType> | TLUiIconType;
    small?: boolean;
    color?: string;
    children?: undefined;
    invertIcon?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials';
}

/** @public */
export declare type TLUiIconType = 'align-bottom' | 'align-center-horizontal' | 'align-center-vertical' | 'align-left' | 'align-right' | 'align-top' | 'arrow-left' | 'arrowhead-arrow' | 'arrowhead-bar' | 'arrowhead-diamond' | 'arrowhead-dot' | 'arrowhead-none' | 'arrowhead-square' | 'arrowhead-triangle-inverted' | 'arrowhead-triangle' | 'blob' | 'bring-forward' | 'bring-to-front' | 'broken' | 'check-circle' | 'check' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'chevron-up' | 'chevrons-ne' | 'chevrons-sw' | 'clipboard-copied' | 'clipboard-copy' | 'color' | 'cross-2' | 'cross-circle' | 'dash-dashed' | 'dash-dotted' | 'dash-draw' | 'dash-solid' | 'disconnected' | 'discord' | 'distribute-horizontal' | 'distribute-vertical' | 'dot' | 'dots-horizontal' | 'dots-vertical' | 'drag-handle-dots' | 'duplicate' | 'edit' | 'external-link' | 'fill-fill' | 'fill-none' | 'fill-pattern' | 'fill-semi' | 'fill-solid' | 'follow' | 'following' | 'font-draw' | 'font-mono' | 'font-sans' | 'font-serif' | 'geo-arrow-down' | 'geo-arrow-left' | 'geo-arrow-right' | 'geo-arrow-up' | 'geo-check-box' | 'geo-cloud' | 'geo-diamond' | 'geo-ellipse' | 'geo-heart' | 'geo-hexagon' | 'geo-octagon' | 'geo-oval' | 'geo-pentagon' | 'geo-rectangle' | 'geo-rhombus-2' | 'geo-rhombus' | 'geo-star' | 'geo-trapezoid' | 'geo-triangle' | 'geo-x-box' | 'github' | 'group' | 'horizontal-align-end' | 'horizontal-align-middle' | 'horizontal-align-start' | 'info-circle' | 'leading' | 'link' | 'lock' | 'menu' | 'minus' | 'mixed' | 'pack' | 'plus' | 'question-mark-circle' | 'question-mark' | 'redo' | 'reset-zoom' | 'rotate-ccw' | 'rotate-cw' | 'send-backward' | 'send-to-back' | 'share-1' | 'size-extra-large' | 'size-large' | 'size-medium' | 'size-small' | 'spline-cubic' | 'spline-line' | 'stack-horizontal' | 'stack-vertical' | 'status-offline' | 'stretch-horizontal' | 'stretch-vertical' | 'text-align-center' | 'text-align-left' | 'text-align-right' | 'toggle-off' | 'toggle-on' | 'tool-arrow' | 'tool-eraser' | 'tool-frame' | 'tool-hand' | 'tool-highlight' | 'tool-laser' | 'tool-line' | 'tool-media' | 'tool-note' | 'tool-pencil' | 'tool-pointer' | 'tool-screenshot' | 'tool-text' | 'trash' | 'twitter' | 'undo' | 'ungroup' | 'unlock' | 'vertical-align-end' | 'vertical-align-middle' | 'vertical-align-start' | 'warning-triangle' | 'zoom-in' | 'zoom-out';

/** @public */
export declare interface TLUiInputProps {
    disabled?: boolean;
    label?: Exclude<string, TLUiTranslationKey> | TLUiTranslationKey;
    icon?: Exclude<string, TLUiIconType> | TLUiIconType;
    iconLeft?: Exclude<string, TLUiIconType> | TLUiIconType;
    autoFocus?: boolean;
    autoSelect?: boolean;
    children?: React_2.ReactNode;
    defaultValue?: string;
    placeholder?: string;
    onComplete?(value: string): void;
    onValueChange?(value: string): void;
    onCancel?(value: string): void;
    onBlur?(value: string): void;
    onFocus?(): void;
    className?: string;
    /**
     * Usually on iOS when you focus an input, the browser will adjust the viewport to bring the input
     * into view. Sometimes this doesn't work properly though - for example, if the input is newly
     * created, iOS seems to have a hard time adjusting the viewport for it. This prop allows you to
     * opt-in to some extra code to manually bring the input into view when the visual viewport of the
     * browser changes, but we don't want to use it everywhere because generally the native behavior
     * looks nicer in scenarios where it's sufficient.
     */
    shouldManuallyMaintainScrollPositionWhenFocused?: boolean;
    value?: string;
}

/** @public */
export declare interface TLUiKbdProps {
    children: string;
    visibleOnMobileLayout?: boolean;
}

/** @public */
export declare type TLUiKeyboardShortcutsDialogProps = TLUiDialogProps & {
    children?: ReactNode;
};

/** @public */
export declare interface TLUiMainMenuProps {
    children?: ReactNode;
}

/** @public */
export declare type TLUiMenuActionCheckboxItemProps = {
    actionId?: string;
} & Pick<TLUiMenuCheckboxItemProps, 'checked' | 'disabled' | 'toggle'>;

/** @public */
export declare type TLUiMenuActionItemProps = {
    actionId?: string;
} & Partial<Pick<TLUiMenuItemProps, 'disabled' | 'isSelected' | 'noClose' | 'onSelect'>>;

/** @public */
export declare interface TLUiMenuCheckboxItemProps<TranslationKey extends string = string, IconType extends string = string> {
    icon?: IconType;
    id: string;
    kbd?: string;
    title?: string;
    label?: {
        [key: string]: TranslationKey;
    } | TranslationKey;
    readonlyOk?: boolean;
    onSelect(source: TLUiEventSource): Promise<void> | void;
    toggle?: boolean;
    checked?: boolean;
    disabled?: boolean;
}

/** @public */
export declare interface TLUiMenuContextProviderProps {
    type: TLUiMenuContextType;
    sourceId: TLUiEventSource;
    children: React.ReactNode;
}

/** @public */
export declare type TLUiMenuContextType = 'context-menu' | 'helper-buttons' | 'icons' | 'keyboard-shortcuts' | 'menu' | 'panel' | 'small-icons' | 'toolbar-overflow' | 'toolbar';

/** @public */
export declare interface TLUiMenuGroupProps<TranslationKey extends string = string> {
    id: string;
    /**
     * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
     */
    label?: {
        [key: string]: TranslationKey;
    } | TranslationKey;
    children?: ReactNode;
}

/** @public */
export declare interface TLUiMenuItemProps<TranslationKey extends string = string, IconType extends string = string> {
    id: string;
    /**
     * The icon to display on the item.
     */
    icon?: IconType;
    /**
     * The keyboard shortcut to display on the item.
     */
    kbd?: string;
    /**
     * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
     */
    label?: {
        [key: string]: TranslationKey;
    } | TranslationKey;
    /**
     * If the editor is in readonly mode and the item is not marked as readonlyok, it will not be rendered.
     */
    readonlyOk?: boolean;
    /**
     * The function to call when the item is clicked.
     */
    onSelect(source: TLUiEventSource): Promise<void> | void;
    /**
     * Whether this item should be disabled.
     */
    disabled?: boolean;
    /**
     * Prevent the menu from closing when the item is clicked
     */
    noClose?: boolean;
    /**
     * Whether to show a spinner on the item.
     */
    spinner?: boolean;
    /**
     * Whether the item is selected.
     */
    isSelected?: boolean;
}

/** @public */
export declare interface TLUiMenuSubmenuProps<Translation extends string = string> {
    id: string;
    label?: {
        [key: string]: Translation;
    } | Translation;
    disabled?: boolean;
    children: ReactNode;
    size?: 'medium' | 'small' | 'tiny' | 'wide';
}

/** @public */
export declare type TLUiMenuToolItemProps = {
    toolId?: string;
} & Pick<TLUiMenuItemProps, 'disabled' | 'isSelected'>;

/** @public */
export declare type TLUiOverrideHelpers = ReturnType<typeof useDefaultHelpers>;

/** @public */
export declare interface TLUiOverrides {
    actions?(editor: Editor, actions: TLUiActionsContextType, helpers: TLUiOverrideHelpers): TLUiActionsContextType;
    tools?(editor: Editor, tools: TLUiToolsContextType, helpers: {
        insertMedia(): void;
    } & TLUiOverrideHelpers): TLUiToolsContextType;
    translations?: TLUiTranslationProviderProps['overrides'];
}

/** @public */
export declare interface TLUiPopoverContentProps {
    children: React_3.ReactNode;
    side: 'bottom' | 'left' | 'right' | 'top';
    align?: 'center' | 'end' | 'start';
    alignOffset?: number;
    sideOffset?: number;
    disableEscapeKeyDown?: boolean;
}

/** @public */
export declare interface TLUiPopoverProps {
    id: string;
    open?: boolean;
    children: React_3.ReactNode;
    onOpenChange?(isOpen: boolean): void;
}

/** @public */
export declare interface TLUiPopoverTriggerProps {
    children?: React_3.ReactNode;
}

/** @public */
export declare interface TLUiQuickActionsProps {
    children?: ReactNode;
}

/** @public */
export declare interface TLUiSliderProps {
    steps: number;
    value: null | number;
    label: string;
    title: string;
    onValueChange(value: number): void;
    onHistoryMark(id: string): void;
    'data-testid'?: string;
}

/** @public */
export declare interface TLUiStylePanelContentProps {
    styles: ReturnType<typeof useRelevantStyles>;
}

/** @public */
export declare interface TLUiStylePanelProps {
    isMobile?: boolean;
    children?: ReactNode;
}

/** @public */
export declare interface TLUiToast {
    id: string;
    icon?: TLUiIconType;
    severity?: AlertSeverity;
    title?: string;
    description?: string;
    actions?: TLUiToastAction[];
    keepOpen?: boolean;
    closeLabel?: string;
}

/** @public */
export declare interface TLUiToastAction {
    type: 'danger' | 'normal' | 'primary';
    label: string;
    onClick(): void;
}

/** @public */
export declare interface TLUiToastsContextType {
    addToast(toast: Omit<TLUiToast, 'id'> & {
        id?: string;
    }): string;
    removeToast(id: TLUiToast['id']): string;
    clearToasts(): void;
    toasts: Atom<TLUiToast[]>;
}

/** @public */
export declare interface TLUiToastsProviderProps {
    overrides?(editor: Editor): TLUiToastsContextType;
    children: ReactNode;
}

/** @public */
export declare interface TLUiToolItem<TranslationKey extends string = string, IconType extends string = string> {
    id: string;
    label: TranslationKey;
    shortcutsLabel?: TranslationKey;
    icon: IconType;
    onSelect(source: TLUiEventSource): void;
    kbd?: string;
    readonlyOk?: boolean;
    meta?: {
        [key: string]: any;
    };
}

/** @public */
export declare type TLUiToolsContextType = Record<string, TLUiToolItem>;

/** @public */
export declare interface TLUiToolsProviderProps {
    overrides?(editor: Editor, tools: TLUiToolsContextType, helpers: {
        insertMedia(): void;
    }): TLUiToolsContextType;
    children: React_2.ReactNode;
}

/** @public */
export declare interface TLUiTranslation {
    readonly locale: string;
    readonly label: string;
    readonly messages: Record<TLUiTranslationKey, string>;
    readonly dir: 'ltr' | 'rtl';
}

/** @public */
export declare type TLUiTranslationContextType = TLUiTranslation;

/** @public */
export declare type TLUiTranslationKey = 'action.align-bottom' | 'action.align-center-horizontal.short' | 'action.align-center-horizontal' | 'action.align-center-vertical.short' | 'action.align-center-vertical' | 'action.align-left' | 'action.align-right' | 'action.align-top' | 'action.back-to-content' | 'action.bring-forward' | 'action.bring-to-front' | 'action.convert-to-bookmark' | 'action.convert-to-embed' | 'action.copy-as-json.short' | 'action.copy-as-json' | 'action.copy-as-png.short' | 'action.copy-as-png' | 'action.copy-as-svg.short' | 'action.copy-as-svg' | 'action.copy' | 'action.cut' | 'action.delete' | 'action.distribute-horizontal.short' | 'action.distribute-horizontal' | 'action.distribute-vertical.short' | 'action.distribute-vertical' | 'action.duplicate' | 'action.edit-link' | 'action.exit-pen-mode' | 'action.export-all-as-json.short' | 'action.export-all-as-json' | 'action.export-all-as-png.short' | 'action.export-all-as-png' | 'action.export-all-as-svg.short' | 'action.export-all-as-svg' | 'action.export-as-json.short' | 'action.export-as-json' | 'action.export-as-png.short' | 'action.export-as-png' | 'action.export-as-svg.short' | 'action.export-as-svg' | 'action.fit-frame-to-content' | 'action.flatten-to-image' | 'action.flip-horizontal.short' | 'action.flip-horizontal' | 'action.flip-vertical.short' | 'action.flip-vertical' | 'action.fork-project-on-tldraw' | 'action.fork-project' | 'action.group' | 'action.insert-embed' | 'action.insert-media' | 'action.leave-shared-project' | 'action.new-project' | 'action.new-shared-project' | 'action.open-cursor-chat' | 'action.open-embed-link' | 'action.open-file' | 'action.pack' | 'action.paste-error-description' | 'action.paste-error-title' | 'action.paste' | 'action.print' | 'action.redo' | 'action.remove-frame' | 'action.rename' | 'action.rotate-ccw' | 'action.rotate-cw' | 'action.save-copy' | 'action.select-all' | 'action.select-none' | 'action.send-backward' | 'action.send-to-back' | 'action.share-project' | 'action.stack-horizontal.short' | 'action.stack-horizontal' | 'action.stack-vertical.short' | 'action.stack-vertical' | 'action.stop-following' | 'action.stretch-horizontal.short' | 'action.stretch-horizontal' | 'action.stretch-vertical.short' | 'action.stretch-vertical' | 'action.toggle-auto-size' | 'action.toggle-dark-mode.menu' | 'action.toggle-dark-mode' | 'action.toggle-debug-mode.menu' | 'action.toggle-debug-mode' | 'action.toggle-dynamic-size-mode.menu' | 'action.toggle-dynamic-size-mode' | 'action.toggle-edge-scrolling.menu' | 'action.toggle-edge-scrolling' | 'action.toggle-focus-mode.menu' | 'action.toggle-focus-mode' | 'action.toggle-grid.menu' | 'action.toggle-grid' | 'action.toggle-lock' | 'action.toggle-paste-at-cursor.menu' | 'action.toggle-paste-at-cursor' | 'action.toggle-reduce-motion.menu' | 'action.toggle-reduce-motion' | 'action.toggle-snap-mode.menu' | 'action.toggle-snap-mode' | 'action.toggle-tool-lock.menu' | 'action.toggle-tool-lock' | 'action.toggle-transparent.context-menu' | 'action.toggle-transparent.menu' | 'action.toggle-transparent' | 'action.toggle-wrap-mode.menu' | 'action.toggle-wrap-mode' | 'action.undo' | 'action.ungroup' | 'action.unlock-all' | 'action.zoom-in' | 'action.zoom-out' | 'action.zoom-to-100' | 'action.zoom-to-fit' | 'action.zoom-to-selection' | 'actions-menu.title' | 'align-style.end' | 'align-style.justify' | 'align-style.middle' | 'align-style.start' | 'arrowheadEnd-style.arrow' | 'arrowheadEnd-style.bar' | 'arrowheadEnd-style.diamond' | 'arrowheadEnd-style.dot' | 'arrowheadEnd-style.inverted' | 'arrowheadEnd-style.none' | 'arrowheadEnd-style.pipe' | 'arrowheadEnd-style.square' | 'arrowheadEnd-style.triangle' | 'arrowheadStart-style.arrow' | 'arrowheadStart-style.bar' | 'arrowheadStart-style.diamond' | 'arrowheadStart-style.dot' | 'arrowheadStart-style.inverted' | 'arrowheadStart-style.none' | 'arrowheadStart-style.pipe' | 'arrowheadStart-style.square' | 'arrowheadStart-style.triangle' | 'assets.files.size-too-big' | 'assets.files.type-not-allowed' | 'assets.files.upload-failed' | 'assets.url.failed' | 'color-style.black' | 'color-style.blue' | 'color-style.green' | 'color-style.grey' | 'color-style.light-blue' | 'color-style.light-green' | 'color-style.light-red' | 'color-style.light-violet' | 'color-style.orange' | 'color-style.red' | 'color-style.violet' | 'color-style.white' | 'color-style.yellow' | 'context-menu.arrange' | 'context-menu.copy-as' | 'context-menu.edit' | 'context-menu.export-all-as' | 'context-menu.export-as' | 'context-menu.move-to-page' | 'context-menu.reorder' | 'context.pages.new-page' | 'cursor-chat.type-to-chat' | 'dash-style.dashed' | 'dash-style.dotted' | 'dash-style.draw' | 'dash-style.solid' | 'debug-panel.more' | 'document-name-menu.copy-link' | 'document.default-name' | 'edit-link-dialog.cancel' | 'edit-link-dialog.clear' | 'edit-link-dialog.detail' | 'edit-link-dialog.invalid-url' | 'edit-link-dialog.save' | 'edit-link-dialog.title' | 'edit-link-dialog.url' | 'edit-pages-dialog.move-down' | 'edit-pages-dialog.move-up' | 'embed-dialog.back' | 'embed-dialog.cancel' | 'embed-dialog.create' | 'embed-dialog.instruction' | 'embed-dialog.invalid-url' | 'embed-dialog.title' | 'embed-dialog.url' | 'file-system.confirm-clear.cancel' | 'file-system.confirm-clear.continue' | 'file-system.confirm-clear.description' | 'file-system.confirm-clear.dont-show-again' | 'file-system.confirm-clear.title' | 'file-system.confirm-open.cancel' | 'file-system.confirm-open.description' | 'file-system.confirm-open.dont-show-again' | 'file-system.confirm-open.open' | 'file-system.confirm-open.title' | 'file-system.file-open-error.file-format-version-too-new' | 'file-system.file-open-error.generic-corrupted-file' | 'file-system.file-open-error.not-a-tldraw-file' | 'file-system.file-open-error.title' | 'file-system.shared-document-file-open-error.description' | 'file-system.shared-document-file-open-error.title' | 'fill-style.fill' | 'fill-style.none' | 'fill-style.pattern' | 'fill-style.semi' | 'fill-style.solid' | 'focus-mode.toggle-focus-mode' | 'font-style.draw' | 'font-style.mono' | 'font-style.sans' | 'font-style.serif' | 'geo-style.arrow-down' | 'geo-style.arrow-left' | 'geo-style.arrow-right' | 'geo-style.arrow-up' | 'geo-style.check-box' | 'geo-style.cloud' | 'geo-style.diamond' | 'geo-style.ellipse' | 'geo-style.hexagon' | 'geo-style.octagon' | 'geo-style.oval' | 'geo-style.pentagon' | 'geo-style.rectangle' | 'geo-style.rhombus-2' | 'geo-style.rhombus' | 'geo-style.star' | 'geo-style.trapezoid' | 'geo-style.triangle' | 'geo-style.x-box' | 'help-menu.about' | 'help-menu.discord' | 'help-menu.docs' | 'help-menu.github' | 'help-menu.keyboard-shortcuts' | 'help-menu.privacy' | 'help-menu.terms' | 'help-menu.title' | 'help-menu.twitter' | 'home-project-dialog.description' | 'home-project-dialog.ok' | 'home-project-dialog.title' | 'menu.copy-as' | 'menu.edit' | 'menu.export-as' | 'menu.file' | 'menu.help' | 'menu.language' | 'menu.preferences' | 'menu.theme' | 'menu.title' | 'menu.view' | 'navigation-zone.toggle-minimap' | 'navigation-zone.zoom' | 'opacity-style.0.1' | 'opacity-style.0.25' | 'opacity-style.0.5' | 'opacity-style.0.75' | 'opacity-style.1' | 'page-menu.create-new-page' | 'page-menu.edit-done' | 'page-menu.edit-start' | 'page-menu.go-to-page' | 'page-menu.max-page-count-reached' | 'page-menu.new-page-initial-name' | 'page-menu.submenu.delete' | 'page-menu.submenu.duplicate-page' | 'page-menu.submenu.move-down' | 'page-menu.submenu.move-up' | 'page-menu.submenu.rename' | 'page-menu.submenu.title' | 'page-menu.title' | 'people-menu.change-color' | 'people-menu.change-name' | 'people-menu.follow' | 'people-menu.following' | 'people-menu.invite' | 'people-menu.leading' | 'people-menu.title' | 'people-menu.user' | 'rename-project-dialog.cancel' | 'rename-project-dialog.rename' | 'rename-project-dialog.title' | 'share-menu.copied' | 'share-menu.copy-link-note' | 'share-menu.copy-link' | 'share-menu.copy-readonly-link-note' | 'share-menu.copy-readonly-link' | 'share-menu.create-snapshot-link' | 'share-menu.creating-project' | 'share-menu.default-project-name' | 'share-menu.fork-note' | 'share-menu.offline-note' | 'share-menu.project-too-large' | 'share-menu.readonly-link' | 'share-menu.save-note' | 'share-menu.share-project' | 'share-menu.snapshot-link-note' | 'share-menu.title' | 'share-menu.upload-failed' | 'sharing.confirm-leave.cancel' | 'sharing.confirm-leave.description' | 'sharing.confirm-leave.dont-show-again' | 'sharing.confirm-leave.leave' | 'sharing.confirm-leave.title' | 'shortcuts-dialog.collaboration' | 'shortcuts-dialog.edit' | 'shortcuts-dialog.file' | 'shortcuts-dialog.preferences' | 'shortcuts-dialog.title' | 'shortcuts-dialog.tools' | 'shortcuts-dialog.transform' | 'shortcuts-dialog.view' | 'size-style.l' | 'size-style.m' | 'size-style.s' | 'size-style.xl' | 'spline-style.cubic' | 'spline-style.line' | 'status.offline' | 'status.online' | 'style-panel.align' | 'style-panel.arrowhead-end' | 'style-panel.arrowhead-start' | 'style-panel.arrowheads' | 'style-panel.color' | 'style-panel.dash' | 'style-panel.fill' | 'style-panel.font' | 'style-panel.geo' | 'style-panel.label-align' | 'style-panel.mixed' | 'style-panel.opacity' | 'style-panel.position' | 'style-panel.size' | 'style-panel.spline' | 'style-panel.title' | 'style-panel.vertical-align' | 'theme.dark' | 'theme.light' | 'theme.system' | 'toast.close' | 'toast.error.copy-fail.desc' | 'toast.error.copy-fail.title' | 'toast.error.export-fail.desc' | 'toast.error.export-fail.title' | 'tool-panel.drawing' | 'tool-panel.more' | 'tool-panel.shapes' | 'tool.arrow-down' | 'tool.arrow-left' | 'tool.arrow-right' | 'tool.arrow-up' | 'tool.arrow' | 'tool.asset' | 'tool.check-box' | 'tool.cloud' | 'tool.diamond' | 'tool.draw' | 'tool.ellipse' | 'tool.embed' | 'tool.eraser' | 'tool.frame' | 'tool.hand' | 'tool.hexagon' | 'tool.highlight' | 'tool.laser' | 'tool.line' | 'tool.note' | 'tool.octagon' | 'tool.oval' | 'tool.pentagon' | 'tool.pointer-down' | 'tool.rectangle' | 'tool.rhombus' | 'tool.select' | 'tool.star' | 'tool.text' | 'tool.trapezoid' | 'tool.triangle' | 'tool.x-box' | 'verticalAlign-style.end' | 'verticalAlign-style.middle' | 'verticalAlign-style.start' | 'vscode.file-open.backup-failed' | 'vscode.file-open.backup-saved' | 'vscode.file-open.backup' | 'vscode.file-open.desc' | 'vscode.file-open.dont-show-again' | 'vscode.file-open.open';

/** @public */
export declare interface TLUiTranslationProviderProps {
    children: React_2.ReactNode;
    locale: string;
    /**
     * A collection of overrides different locales.
     *
     * @example
     *
     * ```ts
     * <TranslationProvider overrides={{ en: { 'style-panel.styles': 'Properties' } }} />
     * ```
     */
    overrides?: Record<string, Record<string, string>>;
}

/** @public */
export declare interface TLUiZoomMenuProps {
    children?: ReactNode;
}

/* Excluded from this release type: TLV1AlignStyle */

/* Excluded from this release type: TLV1ArrowBinding */

/* Excluded from this release type: TLV1ArrowShape */

/* Excluded from this release type: TLV1Asset */

/* Excluded from this release type: TLV1AssetType */

/* Excluded from this release type: TLV1BaseAsset */

/* Excluded from this release type: TLV1BaseBinding */

/* Excluded from this release type: TLV1BaseShape */

/* Excluded from this release type: TLV1Binding */

/* Excluded from this release type: TLV1Bounds */

/* Excluded from this release type: TLV1ColorStyle */

/* Excluded from this release type: TLV1DashStyle */

/* Excluded from this release type: TLV1Decoration */

/* Excluded from this release type: TLV1Document */

/* Excluded from this release type: TLV1DrawShape */

/* Excluded from this release type: TLV1EllipseShape */

/* Excluded from this release type: TLV1FontStyle */

/* Excluded from this release type: TLV1GroupShape */

/* Excluded from this release type: TLV1Handle */

/* Excluded from this release type: TLV1ImageAsset */

/* Excluded from this release type: TLV1ImageShape */

/* Excluded from this release type: TLV1Page */

/* Excluded from this release type: TLV1PageState */

/* Excluded from this release type: TLV1RectangleShape */

/* Excluded from this release type: TLV1Shape */

/* Excluded from this release type: TLV1ShapeStyles */

/* Excluded from this release type: TLV1ShapeType */

/* Excluded from this release type: TLV1SizeStyle */

/* Excluded from this release type: TLV1StickyShape */

/* Excluded from this release type: TLV1TextShape */

/* Excluded from this release type: TLV1TriangleShape */

/* Excluded from this release type: TLV1VideoAsset */

/* Excluded from this release type: TLV1VideoShape */

/** @public @react */
export declare function ToggleAutoSizeMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function ToggleDebugModeItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleEdgeScrollingItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleFocusModeItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleGridItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleLockMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function ToggleReduceMotionItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleSnapModeItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleToolLockItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleTransparentBgMenuItem(): JSX_2.Element;

/** @public @react */
export declare function ToggleWrapModeItem(): JSX_2.Element;

/** @public @react */
export declare function ToolbarItem({ tool }: ToolbarItemProps): JSX_2.Element;

/** @public */
export declare interface ToolbarItemProps {
    tool: string;
}

/** @public @react */
export declare function TrapezoidToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function TriangleToolbarItem(): JSX_2.Element;

/** @public */
export declare const truncateStringWithEllipsis: (str: string, maxLength: number) => string;

/** @public @react */
export declare function UndoRedoGroup(): JSX_2.Element;

/** @public @react */
export declare function UngroupMenuItem(): JSX_2.Element | null;

/** @public @react */
export declare function UnlockAllMenuItem(): JSX_2.Element;

/** @public */
export declare function unwrapLabel(label?: TLUiActionItem['label'], menuType?: string): string | undefined;

/** @public */
export declare function useActions(): TLUiActionsContextType;

/**
 * @deprecated Use {@link useImageOrVideoAsset} instead.
 *
 * @public
 */
export declare const useAsset: typeof useImageOrVideoAsset;

/* Excluded from this release type: useAssetUrls */

/** @public */
export declare function useBreakpoint(): number;

/** @public */
export declare function useCanRedo(): boolean;

/** @public */
export declare function useCanUndo(): boolean;

/** @public */
export declare function useCollaborationStatus(): "offline" | "online" | null;

/** @public */
export declare function useCopyAs(): (ids: TLShapeId[], format?: TLCopyType) => void;

/** @public */
export declare function useCurrentTranslation(): TLUiTranslation;

/** @public */
export declare function useDefaultColorTheme(): {
    "light-blue": TLDefaultColorThemeColor;
    "light-green": TLDefaultColorThemeColor;
    "light-red": TLDefaultColorThemeColor;
    "light-violet": TLDefaultColorThemeColor;
    background: string;
    black: TLDefaultColorThemeColor;
    blue: TLDefaultColorThemeColor;
    green: TLDefaultColorThemeColor;
    grey: TLDefaultColorThemeColor;
    id: "dark" | "light";
    orange: TLDefaultColorThemeColor;
    red: TLDefaultColorThemeColor;
    solid: string;
    text: string;
    violet: TLDefaultColorThemeColor;
    white: TLDefaultColorThemeColor;
    yellow: TLDefaultColorThemeColor;
};

/** @public */
export declare function useDefaultHelpers(): {
    addDialog: (dialog: Omit<TLUiDialog, "id"> & {
        id?: string | undefined;
    }) => string;
    addToast: (toast: Omit<TLUiToast, "id"> & {
        id?: string | undefined;
    }) => string;
    clearDialogs: () => void;
    clearToasts: () => void;
    isMobile: boolean;
    msg: (id?: string | undefined) => string;
    removeDialog: (id: string) => string;
    removeToast: (id: string) => string;
};

/** @public */
export declare function useDialogs(): TLUiDialogsContextType;

/** @public */
export declare function useEditableText(shapeId: TLShapeId, type: string, text: string): {
    handleBlur: () => void;
    handleChange: (e: React_3.ChangeEvent<HTMLTextAreaElement>) => void;
    handleDoubleClick: (e: any) => any;
    handleFocus: () => void;
    handleInputPointerDown: (e: React_3.PointerEvent) => void;
    handleKeyDown: (e: React_3.KeyboardEvent<HTMLTextAreaElement>) => void;
    isEditing: boolean;
    isEditingAnything: boolean;
    isEmpty: boolean;
    rInput: React_3.RefObject<HTMLTextAreaElement>;
};

/** @public */
export declare function useExportAs(): (ids: TLShapeId[], format: TLExportType | undefined, name: string | undefined) => void;

/**
 * This is a handy helper hook that resolves an asset to an optimized URL for a given shape, or its
 * {@link @tldraw/editor#Editor.createTemporaryAssetPreview | placeholder} if the asset is still
 * uploading. This is used in particular for high-resolution images when you want lower and higher
 * resolution depending on the context.
 *
 * For image scaling to work, you need to implement scaled URLs in
 * {@link @tldraw/tlschema#TLAssetStore.resolve}.
 *
 * @public
 */
export declare function useImageOrVideoAsset({ shapeId, assetId, }: {
    assetId: null | TLAssetId;
    shapeId: TLShapeId;
}): {
    asset: (TLImageAsset | TLVideoAsset) | null;
    url: null | string;
};

/** @public */
export declare function useIsToolSelected(tool: TLUiToolItem): boolean;

/** @public */
export declare function useKeyboardShortcuts(): void;

/** @public */
export declare function useLocalStorageState<T = any>(key: string, defaultValue: T): readonly [T, (setter: ((value: T) => T) | T) => void];

/** @public */
export declare function useMenuClipboardEvents(): {
    copy: (source: TLUiEventSource) => Promise<void>;
    cut: (source: TLUiEventSource) => Promise<void>;
    paste: (data: ClipboardItem[] | DataTransfer, source: TLUiEventSource, point?: VecLike) => Promise<void>;
};

/** @public */
export declare function useMenuIsOpen(id: string, cb?: (isOpen: boolean) => void): readonly [boolean, (isOpen: boolean) => void];

/** @public */
export declare function useNativeClipboardEvents(): void;

/** @public */
export declare function usePreloadAssets(assetUrls: TLEditorAssetUrls): {
    done: boolean;
    error: boolean;
};

/** @public */
export declare function useReadonly(): boolean;

/** @public */
export declare function useRelevantStyles(stylesToCheck?: readonly StyleProp<any>[]): null | ReadonlySharedStyleMap;

/** @public */
export declare function useShowCollaborationUi(): boolean;

/** @public */
export declare function useTldrawUiComponents(): TLUiComponents;

/** @public */
export declare function useToasts(): TLUiToastsContextType;

/** @public */
export declare function useTools(): TLUiToolsContextType;

/**
 * Returns a function to translate a translation key into a string based on the current translation.
 *
 * @example
 *
 * ```ts
 * const msg = useTranslation()
 * const label = msg('style-panel.styles')
 * ```
 *
 * @public
 */
export declare function useTranslation(): (id?: Exclude<string, TLUiTranslationKey> | string) => string;

/** @public */
export declare function useUiEvents(): TLUiEventContextType;

/** @public */
export declare class VideoShapeUtil extends BaseBoxShapeUtil<TLVideoShape> {
    static type: "video";
    static props: RecordProps<TLVideoShape>;
    static migrations: TLPropsMigrations;
    canEdit(): boolean;
    isAspectRatioLocked(): boolean;
    getDefaultProps(): TLVideoShape['props'];
    component(shape: TLVideoShape): JSX_2.Element;
    indicator(shape: TLVideoShape): JSX_2.Element;
    toSvg(shape: TLVideoShape): Promise<JSX_2.Element | null>;
}

/** @public @react */
export declare function ViewSubmenu(): JSX_2.Element;

/** @public @react */
export declare function XBoxToolbarItem(): JSX_2.Element;

/** @public @react */
export declare function ZoomOrRotateMenuItem(): JSX_2.Element;

/** @public @react */
export declare function ZoomTo100MenuItem(): JSX_2.Element;

/** @public @react */
export declare function ZoomToFitMenuItem(): JSX_2.Element;

/** @public */
export declare class ZoomTool extends StateNode {
    static id: string;
    static initial: string;
    static children(): TLStateNodeConstructor[];
    static isLockable: boolean;
    info: TLPointerEventInfo & {
        onInteractionEnd?: string | undefined;
    };
    onEnter(info: TLPointerEventInfo & {
        onInteractionEnd: string;
    }): void;
    onExit(): void;
    onKeyDown(): void;
    onKeyUp(info: TLKeyboardEventInfo): void;
    onInterrupt(): void;
    private complete;
    private updateCursor;
}

/** @public @react */
export declare function ZoomToSelectionMenuItem(): JSX_2.Element;


export * from "@tldraw/editor";

export { }
