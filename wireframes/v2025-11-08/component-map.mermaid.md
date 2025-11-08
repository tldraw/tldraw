%% tldraw Component Map
%% Detailed component breakdown showing module boundaries, responsibilities, and dependencies
%% Organized by package with clear dependency arrows

classDiagram
    class State {
        <<package @tldraw/state>>
        +Atom~T~ mutableState
        +Computed~T~ derivedValues
        +reactor() sideEffects
        +track() dependencyTracking
        +transaction() atomicUpdates
        --Responsibilities--
        Fine-grained reactivity
        Automatic dependency tracking
        Efficient updates
    }

    class Store {
        <<package @tldraw/store>>
        +AtomMap~RecordId,Record~ records
        +history: Atom~RecordsDiff~
        +put() createUpdateRecords
        +remove() deleteRecords
        +query: StoreQueries
        +sideEffects: StoreSideEffects
        --Responsibilities--
        Record storage and retrieval
        Change tracking and history
        Reactive queries
        Validation and migrations
    }

    class TLSchema {
        <<package @tldraw/tlschema>>
        +TLShape shapeDefinitions
        +TLBinding bindingDefinitions
        +createTLSchema() schemaFactory
        +validators: T.Validator
        +migrations: MigrationSequence
        --Responsibilities--
        Type definitions
        Schema validation
        Migration logic
        Shape/binding types
    }

    class Editor {
        <<package @tldraw/editor>>
        +TldrawEditor reactComponent
        +Editor coreClass
        +ShapeUtil~S~ shapeUtilities
        +StateNode toolStateMachines
        +BindingUtil~B~ bindingUtilities
        +managers: ClickManager, SnapManager, etc
        --Responsibilities--
        Canvas rendering
        Event handling
        Shape/tool/binding systems
        Camera and viewport
    }

    class EditorManagers {
        <<Editor Subsystem>>
        +ClickManager multiClickDetection
        +EdgeScrollManager autoScroll
        +FocusManager focusState
        +FontManager fontLoading
        +HistoryManager undoRedo
        +ScribbleManager brushInteractions
        +SnapManager shapeSnapping
        +TextManager textMeasurement
        +TickManager animationFrames
        +UserPreferencesManager settings
        --Responsibilities--
        Specialized editor concerns
        Delegated functionality
    }

    class ShapeUtils {
        <<Editor Subsystem>>
        +ShapeUtil~S~ baseClass
        +getGeometry() boundsCalculation
        +component() renderMethod
        +indicator() selectionVisual
        +onResize() interactionHandler
        +onRotate() interactionHandler
        --Responsibilities--
        Shape behavior definition
        Geometry calculations
        Rendering logic
        Interaction handling
    }

    class StateNodes {
        <<Editor Subsystem>>
        +StateNode baseClass
        +onEnter() stateEntry
        +onExit() stateExit
        +onPointerDown() eventHandler
        +onKeyDown() eventHandler
        +children: StateNode[]
        --Responsibilities--
        Tool state machines
        Event-driven behavior
        Hierarchical states
        State transitions
    }

    class TLDraw {
        <<package @tldraw/tldraw>>
        +Tldraw mainComponent
        +TldrawUi uiSystem
        +defaultShapeUtils 12+shapes
        +defaultTools toolset
        +defaultBindingUtils bindings
        +defaultSideEffects reactiveLogic
        +defaultExternalContentHandlers assetProcessing
        --Responsibilities--
        Complete SDK
        UI components
        Default implementations
        Asset handling
    }

    class TLDrawShapes {
        <<TLDraw Subsystem>>
        +TextShapeUtil richText
        +DrawShapeUtil freehand
        +GeoShapeUtil geometricShapes
        +ArrowShapeUtil smartArrows
        +NoteShapeUtil stickyNotes
        +FrameShapeUtil containers
        +ImageShapeUtil images
        +VideoShapeUtil videos
        +BookmarkShapeUtil urlCards
        +EmbedShapeUtil externalContent
        +HighlightShapeUtil annotations
        +LineShapeUtil straightLines
        --Responsibilities--
        Shape implementations
        Each with ShapeUtil + Tool
        Specific rendering logic
    }

    class TLDrawTools {
        <<TLDraw Subsystem>>
        +SelectTool multiStateSelection
        +HandTool panCanvas
        +EraserTool deleteShapes
        +LaserTool presentations
        +ZoomTool zoomAreas
        +TextTool textCreation
        +DrawTool drawingPaths
        +GeoTool geometricCreation
        +ArrowTool arrowDrawing
        +NoteTool noteCreation
        --Responsibilities--
        Tool implementations
        User interaction patterns
        Tool-specific behavior
    }

    class TLDrawUI {
        <<TLDraw Subsystem>>
        +TldrawUiContextProvider contextSetup
        +Toolbar toolSelection
        +StylePanel shapeProperties
        +MenuPanel appMenu
        +SharePanel collaboration
        +NavigationPanel pageZoom
        +Minimap canvasOverview
        +Dialogs modals
        +Toasts notifications
        +Breakpoints responsiveSystem
        --Responsibilities--
        Complete UI system
        Responsive design
        Component override system
        Context providers
    }

    class SyncCore {
        <<package @tldraw/sync-core>>
        +TLSyncClient clientProtocol
        +TLSyncRoom serverRoom
        +WebSocketAdapter wsWrapper
        +OperationalTransform conflictResolution
        +PresenceManager userAwareness
        --Responsibilities--
        Sync protocol
        WebSocket communication
        Conflict resolution
        Presence tracking
    }

    class Sync {
        <<package @tldraw/sync>>
        +useSync() productionHook
        +useSyncDemo() demoHook
        +RemoteTLStoreWithStatus storeWrapper
        +ClientWebSocketAdapter wsClient
        +ConnectionManagement reconnection
        --Responsibilities--
        React integration
        Connection management
        Error handling
        Demo server integration
    }

    class DotcomClient {
        <<app dotcom/client>>
        +main.tsx entryPoint
        +routes.tsx routeDefinitions
        +TLA fileManagement
        +ClerkAuth authentication
        +ZeroSync clientDB
        +FileSystem CRUD
        --Responsibilities--
        Frontend application
        File management
        User authentication
        Real-time sync
    }

    class DotcomWorkers {
        <<app dotcom/workers>>
        +SyncWorker multiplayer
        +AssetUploadWorker uploads
        +ImageResizeWorker optimization
        +DurableObjects rooms
        +R2Storage media
        --Responsibilities--
        Backend services
        Real-time collaboration
        Asset processing
        File persistence
    }

    class Assets {
        <<package @tldraw/assets>>
        +icons: SVGSpritesheet
        +fonts: IBMPlex, Shantell
        +translations: 40+languages
        +getAssetUrls() assetExport
        --Responsibilities--
        Static asset management
        Internationalization
        Font loading
        Icon system
    }

    class Utils {
        <<package @tldraw/utils>>
        +Vec vectorMath
        +Mat matrixMath
        +Box boundingBoxes
        +arrayHelpers utilities
        +performanceHelpers optimization
        --Responsibilities--
        Shared utilities
        Math operations
        Performance helpers
        Type utilities
    }

    class Validate {
        <<package @tldraw/validate>>
        +T.Validator validators
        +T.object() objectSchema
        +T.array() arraySchema
        +T.union() unionTypes
        --Responsibilities--
        Runtime validation
        Schema definition
        Type checking
        Error reporting
    }

    %% Dependencies
    Store ..> State: uses signals
    Editor ..> State: reactive state
    Editor ..> Store: document storage
    Editor ..> TLSchema: type definitions
    Editor ..> Utils: math & utilities
    Store ..> TLSchema: type validation
    Store ..> Validate: runtime checks
    TLSchema ..> Validate: validators

    Editor ..> EditorManagers: composes
    Editor ..> ShapeUtils: uses
    Editor ..> StateNodes: uses

    TLDraw ..> Editor: extends
    TLDraw ..> Assets: uses
    TLDraw ..> TLDrawShapes: provides
    TLDraw ..> TLDrawTools: provides
    TLDraw ..> TLDrawUI: wraps with

    SyncCore ..> Store: syncs
    Sync ..> SyncCore: uses
    Sync ..> TLDraw: integrates

    DotcomClient ..> TLDraw: uses
    DotcomClient ..> Sync: multiplayer
    DotcomClient ..> Assets: static assets

    DotcomWorkers ..> SyncCore: implements
