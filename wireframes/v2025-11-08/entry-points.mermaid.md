%% tldraw Entry Points
%% All ways to interact with the tldraw codebase
%% Application initialization, APIs, CLI, development servers

graph TB
    subgraph "SDK Entry Points"
        subgraph "React Application Integration"
            NPMInstall["npm install tldraw<br/>Package installation"]
            NPMInstall --> ImportTldraw["import Tldraw from 'tldraw'<br/>import 'tldraw/tldraw.css'"]
            ImportTldraw --> BasicUsage["&lt;Tldraw /&gt;<br/>Minimal setup"]
            ImportTldraw --> CustomStore["&lt;Tldraw store={myStore} /&gt;<br/>Custom store"]
            ImportTldraw --> CustomShapes["&lt;Tldraw shapeUtils={utils} /&gt;<br/>Custom shapes"]
            ImportTldraw --> CustomUI["&lt;Tldraw components={ui} /&gt;<br/>Custom UI"]
        end

        subgraph "Editor-Only Integration"
            EditorImport["import TldrawEditor<br/>from '@tldraw/editor'"]
            EditorImport --> EditorUsage["&lt;TldrawEditor<br/>  shapeUtils={utils}<br/>  tools={tools} /&gt;"]
            EditorUsage --> EditorAPI["editor.createShape()<br/>editor.updateShape()<br/>Full API access"]
        end

        subgraph "Multiplayer Integration"
            SyncImport["import useSync<br/>from '@tldraw/sync'"]
            SyncImport --> UseSyncHook["const store = useSync({<br/>  uri: 'wss://...',<br/>  assets: assetStore<br/>})"]
            UseSyncHook --> SyncTldraw["&lt;Tldraw store={store} /&gt;<br/>Real-time collaboration"]

            SyncDemoImport["import useSyncDemo<br/>from '@tldraw/sync'"]
            SyncDemoImport --> SyncDemoHook["useSyncDemo({<br/>  roomId: 'demo-room'<br/>})"]
        end

        subgraph "Custom Store Creation"
            StoreImport["import createTLStore<br/>from '@tldraw/editor'"]
            StoreImport --> CreateStore["const store = createTLStore({<br/>  shapeUtils,<br/>  bindingUtils<br/>})"]
            CreateStore --> Persistence["persistenceKey: 'my-app'<br/>IndexedDB persistence"]
        end
    end

    subgraph "Development Entry Points"
        subgraph "Examples App (Primary Dev)"
            ExamplesStart["yarn dev<br/>Port 5420"]
            ExamplesStart --> ExamplesURL["http://localhost:5420"]
            ExamplesURL --> ExampleRoutes["Browse 130+ examples<br/>/examples/"]
            ExamplesURL --> ExampleCreate["Create new example<br/>/src/examples/"]
        end

        subgraph "tldraw.com Development"
            DotcomStart["yarn dev-app<br/>Development server"]
            DotcomStart --> DotcomURL["http://localhost:3000"]
            DotcomURL --> DotcomRoutes["Routes:<br/>/ (landing)<br/>/new (create)<br/>/f/:id (file)"]
            DotcomURL --> DotcomAuth["Clerk Auth integration"]
            DotcomURL --> DotcomDB["PostgreSQL + Zero sync"]
        end

        subgraph "Documentation Development"
            DocsStart["yarn dev-docs<br/>Docs site"]
            DocsStart --> DocsURL["http://localhost:3000"]
            DocsURL --> DocsContent["tldraw.dev content<br/>Next.js + MDX"]
        end

        subgraph "VSCode Extension Dev"
            VSCodeStart["yarn dev-vscode<br/>Extension development"]
            VSCodeStart --> VSCodeLaunch["F5 in VSCode<br/>Extension Host"]
            VSCodeLaunch --> VSCodeFiles["Open .tldr files<br/>Webview editor"]
        end

        subgraph "Template Development"
            TemplateStart["yarn dev-template &lt;name&gt;<br/>Run template"]
            TemplateStart --> ViteTemplate["vite - Fastest start"]
            TemplateStart --> NextTemplate["nextjs - SSR support"]
            TemplateStart --> VueTemplate["vue - Vue integration"]
            TemplateStart --> SyncTemplate["sync-cloudflare - Multiplayer"]
        end
    end

    subgraph "CLI Entry Points"
        subgraph "npm create Command"
            NPMCreate["npm create tldraw@latest<br/>Interactive scaffolding"]
            NPMCreate --> SelectTemplate["Select template:<br/>• vite<br/>• nextjs<br/>• vue<br/>• sync-cloudflare"]
            SelectTemplate --> ProjectScaffold["Project created<br/>with dependencies"]
            ProjectScaffold --> DevServer["yarn dev<br/>Start development"]
        end

        subgraph "Context Tool"
            ContextCLI["yarn context<br/>Find nearest CONTEXT.md"]
            ContextCLI --> ContextFlags["-v (verbose)<br/>-r (recursive)<br/>-u (update)"]

            RefreshContext["yarn refresh-context<br/>Update CONTEXT.md files"]
            RefreshContext --> ClaudeCodeCLI["Uses Claude Code CLI<br/>AI-generated docs"]
        end

        subgraph "Build Commands"
            BuildAll["yarn build<br/>LazyRepo incremental"]
            BuildPackage["yarn build-package<br/>SDK packages only"]
            BuildApp["yarn build-app<br/>tldraw.com client"]
            BuildDocs["yarn build-docs<br/>Documentation site"]
        end

        subgraph "Testing Commands"
            TestLocal["yarn test run<br/>In specific package"]
            E2EExamples["yarn e2e<br/>Examples E2E tests"]
            E2EDotcom["yarn e2e-dotcom<br/>tldraw.com E2E"]
            TypeCheck["yarn typecheck<br/>All packages"]
        end
    end

    subgraph "API Entry Points"
        subgraph "Editor API (Programmatic)"
            EditorInstance["const editor = useEditor()"]

            EditorInstance --> ShapeAPI["Shape Operations<br/>• createShape()<br/>• updateShape()<br/>• deleteShapes()<br/>• getShape()"]
            EditorInstance --> SelectionAPI["Selection<br/>• select()<br/>• selectAll()<br/>• getSelectedShapes()"]
            EditorInstance --> CameraAPI["Camera<br/>• setCamera()<br/>• zoomIn/Out()<br/>• zoomToFit()"]
            EditorInstance --> HistoryAPI["History<br/>• undo()<br/>• redo()<br/>• mark()"]
            EditorInstance --> ToolAPI["Tools<br/>• setCurrentTool()<br/>• getCurrentTool()"]
            EditorInstance --> EventAPI["Events<br/>• on()<br/>• off()<br/>• emit()"]
        end

        subgraph "Store API"
            StoreInstance["const store = editor.store"]
            StoreInstance --> RecordAPI["Records<br/>• put()<br/>• remove()<br/>• get()<br/>• has()"]
            StoreInstance --> QueryAPI["Queries<br/>• allRecords()<br/>• query.records()<br/>• query.index()"]
            StoreInstance --> ListenAPI["Listeners<br/>• listen()<br/>• onChange()"]
        end

        subgraph "Asset API"
            AssetHandler["editor.registerExternalAssetHandler()"]
            AssetHandler --> URLHandler["'url' handler<br/>Bookmark creation"]
            AssetHandler --> FileHandler["'file' handler<br/>Image/video upload"]
        end
    end

    subgraph "HTTP Entry Points (tldraw.com)"
        subgraph "Frontend Routes"
            RootRoute["/ - Landing/TLA"]
            NewRoute["/new - Create file"]
            FileRoute["/f/:fileId - Editor"]
            HistoryRoute["/f/:fileId/h - History"]
            PublishRoute["/publish - Publish"]
        end

        subgraph "WebSocket Endpoints"
            SyncWS["wss://sync.tldraw.com<br/>Real-time collaboration"]
            SyncWS --> RoomConnect["?sessionId=&lt;tab&gt;<br/>&storeId=&lt;store&gt;"]
        end

        subgraph "Worker APIs"
            UploadAPI["POST /uploads/:name<br/>Asset upload worker"]
            ImageAPI["GET /images/:id<br/>Image resize worker"]
            UnfurlAPI["POST /bookmarks/unfurl<br/>URL metadata"]
        end
    end

    subgraph "Environment Configuration"
        subgraph "Development"
            DevEnv[".env.development<br/>Local config"]
            DevEnv --> DevVars["VITE_APP_URL<br/>DATABASE_URL<br/>CLERK_KEY"]
        end

        subgraph "Production"
            ProdEnv[".env.production<br/>Production config"]
            ProdEnv --> ProdVars["CDN_URL<br/>SENTRY_DSN<br/>POSTHOG_KEY"]
        end

        subgraph "Worker Environment"
            WorkerEnv["wrangler.toml<br/>Worker config"]
            WorkerEnv --> WorkerBindings["Durable Objects<br/>R2 Buckets<br/>KV Namespaces"]
        end
    end

    classDef sdk fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef dev fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef cli fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef http fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef env fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class NPMInstall,ImportTldraw,EditorImport,SyncImport sdk
    class ExamplesStart,DotcomStart,DocsStart,VSCodeStart dev
    class NPMCreate,ContextCLI,BuildAll,TestLocal cli
    class EditorInstance,StoreInstance,AssetHandler api
    class RootRoute,SyncWS,UploadAPI http
    class DevEnv,ProdEnv,WorkerEnv env
