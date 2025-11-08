%% tldraw Architecture Overview
%% High-level system design showing the layered architecture and component interactions
%% Three-layer SDK design: Editor Engine → Complete SDK → Applications

graph TB
    subgraph "Layer 1: Foundation - Core Engine"
        subgraph "Reactive State System"
            State["@tldraw/state<br/>Signals & Reactivity"]
            State --> Atom["Atom&lt;T&gt;<br/>Mutable state"]
            State --> Computed["Computed&lt;T&gt;<br/>Derived values"]
            State --> Reactor["Reactor<br/>Side effects"]
        end

        subgraph "Data Persistence"
            Store["@tldraw/store<br/>Reactive Database"]
            Store --> Records["Record Storage<br/>AtomMap&lt;ID, Record&gt;"]
            Store --> History["Change History<br/>RecordsDiff tracking"]
            Store --> Queries["Reactive Queries<br/>RSIndex system"]
            Store --> Migrations["Schema Migrations<br/>Version management"]
        end

        subgraph "Type System"
            TLSchema["@tldraw/tlschema<br/>Type Definitions"]
            TLSchema --> ShapeTypes["Shape Types<br/>Text, Geo, Arrow, etc."]
            TLSchema --> BindingTypes["Binding Types<br/>Arrow bindings, etc."]
            TLSchema --> Validators["Validators<br/>Runtime type checking"]
        end

        subgraph "Core Editor"
            Editor["@tldraw/editor<br/>Canvas Engine"]
            Editor --> EditorClass["Editor Class<br/>Central orchestrator"]
            Editor --> ShapeSystem["Shape System<br/>ShapeUtil classes"]
            Editor --> ToolSystem["Tool System<br/>StateNode state machines"]
            Editor --> BindingSystem["Binding System<br/>BindingUtil classes"]
            Editor --> Managers["Managers<br/>Click, Snap, Text, etc."]
        end

        State -.->|Powers| Store
        State -.->|Powers| Editor
        Store -.->|Used by| Editor
        TLSchema -.->|Defines types for| Store
        TLSchema -.->|Defines types for| Editor
    end

    subgraph "Layer 2: Complete SDK"
        TLDraw["@tldraw/tldraw<br/>Batteries-Included SDK"]

        subgraph "Shape Implementations"
            DefaultShapes["Default Shapes<br/>12+ shape types"]
            DefaultShapes --> TextShape["Text<br/>Rich text editing"]
            DefaultShapes --> DrawShape["Draw<br/>Freehand paths"]
            DefaultShapes --> GeoShape["Geo<br/>Rectangle, ellipse, etc."]
            DefaultShapes --> ArrowShape["Arrow<br/>Smart connectors"]
            DefaultShapes --> NoteShape["Note<br/>Sticky notes"]
            DefaultShapes --> FrameShape["Frame<br/>Containers"]
            DefaultShapes --> ImageShape["Image/Video<br/>Media shapes"]
        end

        subgraph "Tool Implementations"
            DefaultTools["Default Tools"]
            DefaultTools --> SelectTool["SelectTool<br/>Multi-state selection"]
            DefaultTools --> ShapeTools["Shape Tools<br/>Creation tools"]
            DefaultTools --> HandTool["HandTool<br/>Pan canvas"]
            DefaultTools --> EraserTool["EraserTool<br/>Delete shapes"]
        end

        subgraph "UI System"
            TLDrawUI["TldrawUi Component"]
            TLDrawUI --> Toolbar["Toolbar<br/>Tool selection"]
            TLDrawUI --> StylePanel["Style Panel<br/>Shape properties"]
            TLDrawUI --> MenuPanel["Menu Panel<br/>Actions & settings"]
            TLDrawUI --> Minimap["Minimap<br/>WebGL overview"]
            TLDrawUI --> Breakpoints["Responsive System<br/>Mobile/desktop"]
        end

        subgraph "Asset & Content Handling"
            AssetSystem["Asset Management"]
            AssetSystem --> ExternalContent["External Content<br/>URLs, files, SVG"]
            AssetSystem --> AssetUpload["Asset Upload<br/>Images, videos"]
            AssetSystem --> Bookmarks["Bookmarks<br/>URL unfurling"]
        end

        Editor -.->|Extended by| TLDraw
        DefaultShapes -.->|Register with| Editor
        DefaultTools -.->|Register with| Editor
        TLDrawUI -.->|Wraps| Editor
    end

    subgraph "Layer 3: Collaboration"
        subgraph "Sync Core"
            SyncCore["@tldraw/sync-core<br/>Protocol Implementation"]
            SyncCore --> Protocol["WebSocket Protocol<br/>Binary messages"]
            SyncCore --> OT["Operational Transform<br/>Conflict resolution"]
            SyncCore --> Presence["Presence System<br/>Cursors & selections"]
        end

        subgraph "Sync React Hooks"
            Sync["@tldraw/sync<br/>React Integration"]
            Sync --> UseSync["useSync()<br/>Production multiplayer"]
            Sync --> UseSyncDemo["useSyncDemo()<br/>Demo server"]
            Sync --> ConnectionMgmt["Connection Management<br/>Reconnection logic"]
        end

        SyncCore -.->|Used by| Sync
        Store -.->|Synced by| SyncCore
    end

    subgraph "Layer 4: Applications"
        subgraph "tldraw.com Stack"
            DotcomClient["Frontend<br/>React SPA"]
            DotcomClient --> Auth["Clerk Auth<br/>User management"]
            DotcomClient --> FileSystem["File System<br/>TLA (tldraw app)"]
            DotcomClient --> ZeroSync["Zero Sync<br/>Client DB"]

            SyncWorker["Sync Worker<br/>Cloudflare DO"]
            SyncWorker --> Rooms["Room Management<br/>Durable Objects"]
            SyncWorker --> FileMgmt["File Management<br/>CRUD + sharing"]

            AssetWorker["Asset Worker<br/>Upload & storage"]
            ImageWorker["Image Worker<br/>Optimization"]

            Database["PostgreSQL<br/>Source of truth"]
            R2Storage["R2 Storage<br/>Media files"]

            DotcomClient <-.->|WebSocket| SyncWorker
            DotcomClient <-.->|Upload| AssetWorker
            DotcomClient <-.->|Optimize| ImageWorker
            SyncWorker <-.->|Persist| Database
            AssetWorker <-.->|Store| R2Storage
            ImageWorker <-.->|Read/Write| R2Storage
        end

        subgraph "Other Applications"
            Examples["Examples App<br/>SDK showcase"]
            Docs["Docs Site<br/>tldraw.dev"]
            VSCode["VSCode Extension<br/>.tldr files"]
        end

        TLDraw -.->|Used by| DotcomClient
        TLDraw -.->|Used by| Examples
        Sync -.->|Used by| DotcomClient
        Editor -.->|Documented in| Docs
    end

    subgraph "Supporting Systems"
        subgraph "Asset Infrastructure"
            Assets["@tldraw/assets<br/>Icons, Fonts, i18n"]
            Assets --> Icons["SVG Icons<br/>80+ optimized"]
            Assets --> Fonts["Fonts<br/>IBM Plex + Shantell"]
            Assets --> Translations["40+ Languages<br/>RTL support"]
        end

        subgraph "Utilities"
            Utils["@tldraw/utils<br/>Shared Utilities"]
            Validate["@tldraw/validate<br/>Validation"]
        end

        Assets -.->|Used by| TLDraw
        Utils -.->|Used by| Editor
        Utils -.->|Used by| Store
        Validate -.->|Used by| Store
    end

    classDef foundation fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef sdk fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef sync fill:#fff3e0,stroke:#e65100,stroke-width:3px
    classDef app fill:#e8f5e9,stroke:#1b5e20,stroke-width:3px
    classDef support fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class State,Store,TLSchema,Editor foundation
    class TLDraw,DefaultShapes,DefaultTools,TLDrawUI sdk
    class SyncCore,Sync sync
    class DotcomClient,SyncWorker,Examples,Docs app
    class Assets,Utils,Validate support
