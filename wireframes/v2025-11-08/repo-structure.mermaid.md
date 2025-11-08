%% tldraw Repository Structure
%% Complete directory tree visualization for the tldraw monorepo
%% Version: 3.15.1 | Node.js: ^20.0.0 | React: ^18.0.0

graph TB
    subgraph "Root Configuration"
        Root["/tldraw<br/>(Monorepo Root)"]
        Root --> PackageJSON["package.json<br/>Yarn Berry v4<br/>Workspace manager"]
        Root --> LazyConfig["lazy.config.ts<br/>LazyRepo build system"]
        Root --> TSConfig["tsconfig.json<br/>TypeScript workspace refs"]
        Root --> Context["CONTEXT.md<br/>AI-friendly docs"]
        Root --> Claude["CLAUDE.md<br/>Claude Code instructions"]
    end

    subgraph "Core SDK Packages (/packages)"
        Packages["/packages"]

        subgraph "Foundation Layer"
            Editor["editor/<br/>Core canvas engine<br/>No shapes/tools/UI"]
            Store["store/<br/>Reactive database<br/>IndexedDB + Signals"]
            State["state/<br/>Reactive signals<br/>Atom + Computed"]
            TLSchema["tlschema/<br/>Type definitions<br/>Validators + Migrations"]
            Utils["utils/<br/>Shared utilities<br/>Math, arrays, etc."]
            Validate["validate/<br/>Validation library<br/>Lightweight schemas"]
        end

        subgraph "Complete SDK Layer"
            TLDraw["tldraw/<br/>Batteries-included SDK<br/>UI + Shapes + Tools"]
        end

        subgraph "Collaboration Layer"
            SyncCore["sync-core/<br/>Core sync logic<br/>Protocol impl"]
            Sync["sync/<br/>Multiplayer SDK<br/>React hooks"]
        end

        subgraph "Supporting Packages"
            Assets["assets/<br/>Icons, fonts, i18n<br/>40+ languages"]
            StateReact["state-react/<br/>React bindings<br/>for @tldraw/state"]
            CreateTLDraw["create-tldraw/<br/>npm create CLI<br/>Project scaffolder"]
            DotcomShared["dotcom-shared/<br/>Shared dotcom utils<br/>Workers + client"]
            WorkerShared["worker-shared/<br/>Cloudflare Workers<br/>shared code"]
            NamespacedTLDraw["namespaced-tldraw/<br/>Namespaced<br/>components"]
        end

        Packages --> Editor
        Packages --> Store
        Packages --> State
        Packages --> TLSchema
        Packages --> Utils
        Packages --> Validate
        Packages --> TLDraw
        Packages --> SyncCore
        Packages --> Sync
        Packages --> Assets
        Packages --> StateReact
        Packages --> CreateTLDraw
        Packages --> DotcomShared
        Packages --> WorkerShared
        Packages --> NamespacedTLDraw
    end

    subgraph "Applications (/apps)"
        Apps["/apps"]

        subgraph "Primary Development"
            Examples["examples/<br/>SDK showcase<br/>130+ examples"]
        end

        subgraph "tldraw.com Stack"
            DotcomClient["dotcom/client/<br/>React SPA<br/>Vite + Clerk auth"]
            SyncWorker["dotcom/sync-worker/<br/>Multiplayer backend<br/>Durable Objects"]
            AssetUploadWorker["dotcom/asset-upload-worker/<br/>Media uploads<br/>R2 storage"]
            ImageResizeWorker["dotcom/image-resize-worker/<br/>Image optimization<br/>Format conversion"]
            ZeroCache["dotcom/zero-cache/<br/>DB sync layer<br/>Rocicorp Zero"]
        end

        subgraph "Documentation & Tooling"
            Docs["docs/<br/>tldraw.dev site<br/>Next.js + SQLite"]
            VSCode["vscode/<br/>VSCode extension<br/>.tldr file support"]
        end

        subgraph "Additional Services"
            Analytics["analytics/<br/>Analytics service<br/>UMD + GDPR"]
            BemoWorker["bemo-worker/<br/>Bemo service<br/>Collaboration"]
        end

        Apps --> Examples
        Apps --> DotcomClient
        Apps --> SyncWorker
        Apps --> AssetUploadWorker
        Apps --> ImageResizeWorker
        Apps --> ZeroCache
        Apps --> Docs
        Apps --> VSCode
        Apps --> Analytics
        Apps --> BemoWorker
    end

    subgraph "Starter Templates (/templates)"
        Templates["/templates"]

        Templates --> Vite["vite/<br/>Vite integration<br/>Fastest start"]
        Templates --> NextJS["nextjs/<br/>Next.js + SSR<br/>React framework"]
        Templates --> Vue["vue/<br/>Vue integration<br/>Vue 3 support"]
        Templates --> SyncCloudflare["sync-cloudflare/<br/>Multiplayer impl<br/>Durable Objects"]
        Templates --> AI["ai/<br/>AI integration<br/>LLM examples"]
        Templates --> BranchingChat["branching-chat/<br/>AI chat UI<br/>Node-based trees"]
        Templates --> Workflow["workflow/<br/>Visual programming<br/>Executable workflows"]
        Templates --> ChatTemplate["chat/<br/>Chat template"]
        Templates --> Agent["agent/<br/>Agent template"]
        Templates --> SimpleServer["simple-server-example/<br/>Basic server"]
    end

    subgraph "Internal Tools (/internal)"
        Internal["/internal"]

        Internal --> AppsScript["apps-script/<br/>Google Meet<br/>integration"]
        Internal --> Config["config/<br/>Shared configs<br/>TS, API, tests"]
        Internal --> DevTools["dev-tools/<br/>Git bisect helper<br/>Debugging"]
        Internal --> HealthWorker["health-worker/<br/>Updown.io alerts<br/>Discord webhook"]
        Internal --> Scripts["scripts/<br/>Build & deploy<br/>Automation"]
    end

    Root --> Packages
    Root --> Apps
    Root --> Templates
    Root --> Internal

    classDef foundation fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef sdk fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef worker fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef template fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef internal fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class Editor,Store,State,TLSchema,Utils,Validate foundation
    class TLDraw,SyncCore,Sync sdk
    class Examples,DotcomClient,Docs,VSCode app
    class SyncWorker,AssetUploadWorker,ImageResizeWorker,ZeroCache,BemoWorker worker
    class Vite,NextJS,Vue,SyncCloudflare,AI,BranchingChat,Workflow template
    class AppsScript,Config,DevTools,HealthWorker,Scripts internal
