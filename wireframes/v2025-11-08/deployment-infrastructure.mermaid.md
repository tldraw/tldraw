%% tldraw Deployment Infrastructure
%% How the code runs in production - hosting, services, CI/CD
%% Covers Vercel (frontend), Cloudflare Workers (backend), and supporting services

graph TB
    subgraph "Source Control & CI/CD"
        GitHub["GitHub Repository<br/>tldraw/tldraw"]
        GitHub --> Actions["GitHub Actions<br/>CI/CD Pipeline"]

        Actions --> BuildSDK["Build SDK Packages<br/>LazyRepo incremental"]
        Actions --> BuildApp["Build tldraw.com<br/>Vite production build"]
        Actions --> BuildWorkers["Build Workers<br/>Wrangler builds"]
        Actions --> RunTests["Run Tests<br/>Vitest + Playwright"]
        Actions --> TypeCheck["Type Check<br/>tsc --noEmit"]
        Actions --> Lint["Lint & Format<br/>ESLint + Prettier"]

        BuildSDK --> NPMPublish["npm Publish<br/>@tldraw/* packages"]
        BuildApp --> VercelDeploy["Vercel Deploy<br/>Automatic deployment"]
        BuildWorkers --> CloudflareDeploy["Cloudflare Deploy<br/>Wrangler publish"]
    end

    subgraph "Frontend Hosting (Vercel)"
        Vercel["Vercel Edge Network<br/>Global CDN"]

        Vercel --> VercelEdge["Edge Nodes<br/>100+ locations"]
        VercelEdge --> StaticAssets["Static Assets<br/>HTML, JS, CSS, images"]
        VercelEdge --> SSR["Serverless Functions<br/>(if needed)"]

        StaticAssets --> ClientApp["React SPA<br/>tldraw.com client"]
        StaticAssets --> DocsApp["Docs Site<br/>tldraw.dev"]

        ClientApp --> Browser["User Browser"]
    end

    subgraph "Backend Services (Cloudflare)"
        subgraph "Edge Workers"
            SyncWorker["Sync Worker<br/>Multiplayer & file mgmt"]
            AssetWorker["Asset Upload Worker<br/>R2 upload handler"]
            ImageWorker["Image Resize Worker<br/>Optimization"]
            FairyWorker["Fairy Worker<br/>Support services"]
        end

        subgraph "Durable Objects"
            RoomDO["Room Durable Objects<br/>Stateful rooms"]
            RoomDO --> RoomState["Room State<br/>Document + presence"]
            RoomDO --> WebSocketMgmt["WebSocket Management<br/>Connection handling"]
        end

        subgraph "Storage Services"
            R2["R2 Object Storage<br/>Asset files"]
            KV["KV Store<br/>Key-value cache"]
        end

        Browser <--> |"WebSocket<br/>wss://"| SyncWorker
        Browser --> |"HTTPS<br/>Upload"| AssetWorker
        Browser --> |"HTTPS<br/>Image"| ImageWorker

        SyncWorker <--> RoomDO
        AssetWorker --> R2
        ImageWorker <--> R2
        SyncWorker --> KV
    end

    subgraph "Database & Persistence"
        PostgreSQL["PostgreSQL<br/>Primary database"]
        PostgreSQL --> Users["Users table"]
        PostgreSQL --> Files["Files table"]
        PostgreSQL --> Versions["File versions"]
        PostgreSQL --> Shares["File shares"]
        PostgreSQL --> Assets_DB["Assets metadata"]

        RoomDO -.->|"Persist state"| PostgreSQL
        SyncWorker -.->|"Query/Update"| PostgreSQL
    end

    subgraph "Third-Party Services"
        Clerk["Clerk<br/>Authentication"]
        Sentry["Sentry<br/>Error tracking"]
        PostHog["PostHog<br/>Analytics"]
        Vercel_Analytics["Vercel Analytics<br/>Performance"]

        Browser --> |"Sign in"| Clerk
        ClientApp -.->|"Errors"| Sentry
        ClientApp -.->|"Events"| PostHog
        ClientApp -.->|"Metrics"| Vercel_Analytics
        SyncWorker -.->|"Errors"| Sentry
    end

    subgraph "DNS & CDN"
        CloudflareDNS["Cloudflare DNS<br/>tldraw.com"]
        CloudflareDNS --> |"Frontend"| Vercel
        CloudflareDNS --> |"API/Workers"| SyncWorker
        CloudflareDNS --> |"Assets"| ImageWorker

        CDN["Cloudflare CDN<br/>Asset delivery"]
        R2 --> CDN
        CDN --> Browser
    end

    subgraph "Monitoring & Observability"
        VercelLogs["Vercel Logs<br/>Frontend logs"]
        CloudflareLogs["Cloudflare Logs<br/>Worker logs"]
        SentryDashboard["Sentry Dashboard<br/>Error analysis"]
        PostHogDashboard["PostHog Dashboard<br/>User analytics"]

        Vercel -.->|"Logs"| VercelLogs
        SyncWorker -.->|"Logs"| CloudflareLogs
        Sentry -.->|"Aggregate"| SentryDashboard
        PostHog -.->|"Aggregate"| PostHogDashboard
    end

    subgraph "Development Environments"
        LocalDev["Local Development<br/>yarn dev"]
        LocalDev --> LocalVite["Vite Dev Server<br/>localhost:5420"]
        LocalDev --> LocalWorkers["Local Workers<br/>Miniflare/Wrangler"]
        LocalDev --> LocalDB["PostgreSQL<br/>Local instance"]

        Staging["Staging Environment<br/>Preview deployments"]
        Staging --> VercelPreview["Vercel Preview<br/>Per-PR deployment"]
        Staging --> WorkerPreview["Worker Preview<br/>Staging workers"]
    end

    subgraph "Package Distribution"
        NPM["npm Registry<br/>Public packages"]
        NPM --> SDKUsers["SDK Users<br/>npm install tldraw"]

        NPMPublish --> NPM
    end

    classDef cicd fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef frontend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef thirdparty fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef monitoring fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef dev fill:#fff9c4,stroke:#f57f17,stroke-width:2px

    class GitHub,Actions,BuildSDK,NPMPublish cicd
    class Vercel,VercelEdge,ClientApp,DocsApp frontend
    class SyncWorker,AssetWorker,ImageWorker,RoomDO,R2 backend
    class PostgreSQL,Users,Files database
    class Clerk,Sentry,PostHog thirdparty
    class VercelLogs,CloudflareLogs,SentryDashboard monitoring
    class LocalDev,Staging,LocalVite dev
