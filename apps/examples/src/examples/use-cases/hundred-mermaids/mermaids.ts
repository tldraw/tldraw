export default [
	[
		`flowchart TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`,
		`flowchart TD
    A[Start] --> B[End]`,
		`flowchart LR
    A[Open app] --> B[Sign in]
    B --> C[Dashboard]`,
		`flowchart TB
    A[Receive request] --> B[Validate]
    B --> C[Process]
    C --> D[Respond]`,
		`flowchart TD
    A[Submit form] --> B{Is valid?}
    B -- Yes --> C[Save]
    B -- No --> D[Show errors]`,
		`flowchart TD
    A[Start] --> B{User type?}
    B -- Admin --> C[Admin panel]
    B -- Member --> D[Member home]
    B -- Guest --> E[Landing page]
    C --> F[Common logout]
    D --> F
    E --> F`,
		`flowchart TD
    A([Start]) --> B[Task]
    B --> C{Decision}
    C -- Yes --> D[[Subprocess]]
    C -- No --> E[(Database)]
    D --> F([End])
    E --> F`,
		`flowchart LR
    A[Client] -->|POST /login| B[API]
    B -->|Check credentials| C[(Users DB)]
    C -->|User record| B
    B -->|JWT token| A`,
		`flowchart TD
    A[Draft] -. Review .-> B[Editor]
    B ==> C[Published]
    A --> D[Archived]`,
		`flowchart LR
    A[Idea] --> B[Spec] --> C[Build] --> D[Test] --> E[Release]`,
		`flowchart TD
    subgraph Frontend
        A[UI]
        B[State manager]
    end

    subgraph Backend
        C[API]
        D[(DB)]
    end

    A --> B
    B --> C
    C --> D`,
		`flowchart TD
    subgraph Client
        direction LR
        A[Page] --> B[Form] --> C[Submit button]
    end

    subgraph Server
        direction TB
        D[Controller] --> E[Service] --> F[(DB)]
    end

    C --> D`,
		`flowchart TD
    X[User action] --> A

    subgraph Auth
        A[Enter credentials] --> B{Valid?}
        B -- Yes --> C[Issue session]
        B -- No --> D[Reject]
    end

    C --> Y[Go to app]
    D --> Z[Retry]`,
		`flowchart TD
    A([Start]) --> B[Collect order]
    B --> C{In stock?}
    C -- Yes --> D[Pack item]
    C -- No --> E[Backorder]
    E --> F[Notify customer]
    D --> G[Ship]
    F --> H([End])
    G --> H`,
		`flowchart TD
    A[Request] --> B[Validation]
    B --> C[Success]
    B --> D[Failure]

    style B fill:#fff4cc,stroke:#cc9900,stroke-width:2px
    style C fill:#e8f5e9,stroke:#2e7d32
    style D fill:#ffebee,stroke:#c62828`,
		`flowchart LR
    A[Start]:::good --> B[Process]:::normal --> C{OK?}:::warn
    C -- Yes --> D[Done]:::good
    C -- No --> E[Retry]:::bad

    classDef good fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef normal fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
    classDef warn fill:#fff8e1,stroke:#ef6c00,stroke-width:2px;
    classDef bad fill:#ffebee,stroke:#c62828,stroke-width:2px;`,
		`flowchart TD
    A[API Gateway] --> B[Auth Service]
    A --> C[Orders Service]
    A --> D[Inventory Service]
    B --> E[(Users DB)]
    C --> F[(Orders DB)]
    D --> G[(Stock DB)]

    classDef svc fill:#e3f2fd,stroke:#1565c0;
    classDef db fill:#f3e5f5,stroke:#6a1b9a;
    class A,B,C,D svc;
    class E,F,G db;`,
		`flowchart TD
    A[Client] --> B[API]
    A --> C[Cache]
    B --> D[(Primary DB)]
    C --> D

    linkStyle 0 stroke:#1565c0,stroke-width:2px;
    linkStyle 1 stroke:#ef6c00,stroke-dasharray: 5 5;
    linkStyle 2 stroke:#2e7d32,stroke-width:2px;
    linkStyle 3 stroke:#6a1b9a,stroke-dasharray: 2 2;`,
		`%%{init: {'flowchart': {'curve': 'basis'}}}%%
flowchart LR
    A[Input] --> B{Transform?}
    B -- Yes --> C[Mapper]
    B -- No --> D[Pass through]
    C --> E[Output]
    D --> E`,
		`flowchart TD
    A[Checkout] --> B[Payment] --> C[Confirmation]`,
		`flowchart LR
    A[Producer] --> B[Queue]
    B --> C[Worker]
    C --> D[Result]

    classDef pulse stroke-width:3px,stroke:#d32f2f,animate:true,animation:fast;
    class B pulse;`,
		`flowchart TD
    A[Start] --> B{Route?}
    B -- Short --> C[Quick task]
    B -- Long --> D[Step 1]
    D --> E[Step 2]
    E --> F[Step 3]
    F --> G[Step 4]
    G --> H[Finish]
    C --> H`,
		`flowchart LR
    A[Input] --> B[Parse]
    A --> C[Validate]
    A --> D[Normalize]
    B --> E[Assemble]
    C --> E
    D --> E
    E --> F[Output]`,
		`flowchart TD
    A[User opens checkout] --> B[System validates whether the currently selected shipping address is complete and deliverable]
    B --> C{Was the validation successful?}
    C -- Yes --> D[Continue to payment]
    C -- No --> E[Show address correction prompt]`,
		`flowchart TD
    A[Request] --> B{Authenticated?}
    B -- No --> C[Reject]
    B -- Yes --> D{Authorized?}
    D -- No --> E[Forbidden]
    D -- Yes --> F{Cached?}
    F -- Yes --> G[Return cached result]
    F -- No --> H[Query service]
    H --> I[Return fresh result]
    G --> J[Done]
    I --> J
    C --> J
    E --> J`,
		`flowchart LR
    A[Draft] --> B[Review]
    B --> C{Approved?}
    C -- Yes --> D[Publish]
    C -- No --> E[Revise]
    E --> B`,
		`flowchart TD
    subgraph Client
        A[Page]
        B[Form]
    end

    subgraph Server
        C[Gateway]
        D[Auth service]
        E[Profile service]
        F[(User DB)]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F`,
		`flowchart TD
    X[Start] --> A

    subgraph Pipeline
        direction LR
        A[Ingest] --> B[Transform] --> C[Store]
    end

    C --> D[Notify]
    D --> E[End]`,
		`flowchart TD
    A[Upload file] --> B{File type accepted by the current processing pipeline?}
    B -- Yes, continue with normal processing --> C[Process file]
    B -- No, reject and explain supported formats --> D[Show unsupported format message]
    C --> E[Done]
    D --> E`,
		`flowchart LR
    A[Web app] --> D[API]
    B[Mobile app] --> D
    C[Admin app] --> D
    D --> E[Auth]
    D --> F[Orders]
    D --> G[Inventory]
    E --> H[(Users DB)]
    F --> I[(Orders DB)]
    G --> I`,
		`flowchart TD
    A[Event received] --> B{Needs enrichment?}
    B -- No --> C[Dispatch immediately]
    B -- Yes --> D[Load metadata]
    D --> E[Merge payload]
    E --> F[Run policy checks]
    F --> G[Dispatch]
    C --> H[Complete]
    G --> H`,
		`flowchart LR
    A[Start] --> B{Decision}
    B -- Path 1 --> C[Short]
    B -- Path 2 --> D[Much longer intermediate processing step]
    D --> E[Another step]
    E --> F[End]
    C --> F`,
		`flowchart LR
    A[Start] -->|Begin initial system bootstrap process| B[Initialize services]
    B -->|Wait for all dependency containers to finish starting successfully| C[Dependency ready]
    C -->|Notify orchestration layer that system state is now healthy| D[Operational]`,
		`flowchart LR
    A[Request] -->|"GET /users?id=42"| B[API]
    B -->|"SELECT * FROM users WHERE id=42;"| C[(Database)]
    C -->|"200 OK + JSON payload"| B
    B -->|"HTTP response (compressed)"| A`,
		`flowchart TD
    A[Submit form] --> B{Validation}
    B -- OK --> C[Continue]
    B -- "Invalid because the provided address fails multiple delivery verification rules" --> D[Show detailed validation errors]
    C --> E[Finish]
    D --> E`,
		`flowchart TD

    subgraph Client
        A[Browser] --> B[Form submit]
    end

    subgraph Gateway
        C[Edge proxy]
    end

    subgraph Backend
        D[Controller]
        E[Service]
        F[(DB)]
    end

    B -->|"POST /api/submit"| C
    C -->|"forward request"| D
    D -->|"invoke business logic"| E
    E -->|"write transaction"| F`,
		`flowchart TD

    subgraph System
        subgraph Frontend
            A[Page] --> B[Submit]
        end

        subgraph Backend
            C[API]
            D[Worker]
        end
    end

    B -->|"JSON payload"| C
    C -->|"enqueue job"| D`,
		`flowchart LR
    A[Event] -->|"This event triggers a complex downstream processing pipeline"| B[Processor]
    B -->|"Output results that may contain multiple transformation stages"| C[Consumer]`,
		`flowchart LR
    A[Client] -->|"request"| B[Gateway]
    A -->|"healthcheck ping"| C[Monitor]

    B -->|"authenticate session token"| D[Auth]
    B -->|"fetch order history from service"| E[Orders]

    D -->|"validate user"| F[(User DB)]
    E -->|"load order data"| G[(Orders DB)]`,
		`flowchart LR

    subgraph UserLayer
        A[User]
    end

    subgraph AppLayer
        B[UI]
        C[Controller]
    end

    subgraph DataLayer
        D[Service]
        E[(DB)]
    end

    A -->|"click action"| B
    B -->|"dispatch event"| C
    C -->|"invoke business logic"| D
    D -->|"query persistent storage"| E
    E -->|"return dataset"| D
    D -->|"response payload"| C`,
	],
	[
		`stateDiagram-v2
    [*] --> Idle
    Idle --> Active`,
		`stateDiagram-v2
    [*] --> Idle
    Idle --> Active: start
    Active --> Idle: stop`,
		`stateDiagram-v2
    [*] --> Draft
    Draft --> Review: submit
    Review --> Published: approve
    Published --> [*]`,
		`stateDiagram-v2
    [*] --> Editing
    Editing --> Editing: type
    Editing --> Saved: save
    Saved --> [*]`,
		`stateDiagram-v2
    [*] --> LoggedOut
    LoggedOut --> LoggedIn: login
    SessionExpired --> LoggedIn: reauthenticate
    LoggedIn --> SessionExpired: timeout`,
		`stateDiagram-v2
    [*] --> Validate
    Validate --> Accepted: valid
    Validate --> Rejected: invalid
    Accepted --> [*]
    Rejected --> [*]`,
		`stateDiagram-v2
    [*] --> Idle
    state Idle: Waiting for input
    state Processing: Running background work
    Idle --> Processing: submit
    Processing --> Idle: done`,
		`stateDiagram-v2
    direction LR
    [*] --> New
    New --> Assigned: assign
    Assigned --> Resolved: resolve
    Resolved --> Closed: close`,
		`stateDiagram-v2
    [*] --> Authentication

    state Authentication {
        [*] --> EnterCredentials
        EnterCredentials --> Verifying: submit
        Verifying --> Success: valid
        Verifying --> Failure: invalid
    }

    Authentication --> Dashboard: success`,
		`stateDiagram-v2
    [*] --> Checkout

    state Checkout {
        [*] --> Cart
        Cart --> Address: continue
        Address --> Payment: next
        Payment --> Complete: pay
    }

    Checkout --> Confirmation: order complete
    Confirmation --> [*]`,
		`stateDiagram-v2
    [*] --> Order

    state Order {
        [*] --> Pending
        Pending --> Packed: pack
        Packed --> Shipped: ship
        Shipped --> Delivered: deliver
    }

    Order --> Archived: archive`,
		`stateDiagram-v2
    [*] --> Processing

    state Processing {
        [*] --> Fork
        state Fork <<fork>>

        Fork --> FraudCheck
        Fork --> InventoryCheck

        FraudCheck --> Join
        InventoryCheck --> Join

        state Join <<join>>
        Join --> Ready
    }

    Ready --> [*]`,
		`stateDiagram-v2
    [*] --> Submitted
    Submitted --> ReviewDecision

    state ReviewDecision <<choice>>

    ReviewDecision --> Approved: score >= 80
    ReviewDecision --> NeedsInfo: score < 80
    Approved --> [*]
    NeedsInfo --> [*]`,
		`stateDiagram-v2
    [*] --> StartValidation

    StartValidation --> MergeChecks
    ManualValidation --> MergeChecks

    state MergeChecks <<junction>>

    MergeChecks --> Accepted: all checks pass
    MergeChecks --> Rejected: any check fails`,
		`stateDiagram-v2
    [*] --> Session

    state Session {
        state entry1 <<entryPoint>>
        state exit1 <<exitPoint>>

        [*] --> entry1
        entry1 --> Active
        Active --> exit1: logout
    }

    Session --> LoggedOut`,
		`stateDiagram-v2
    [*] --> TicketOpen
    TicketOpen --> Investigating: assign
    Investigating --> WaitingForCustomer: need info
    WaitingForCustomer --> Investigating: reply received
    Investigating --> Resolved: fix applied
    Resolved --> Closed: confirm

    note right of WaitingForCustomer
        SLA clock may pause here
    end note`,
		`stateDiagram-v2
    [*] --> Player

    state Player {
        [*] --> Stopped
        Stopped --> Playing: play
        Playing --> Paused: pause
        Paused --> Playing: resume
        Playing --> Stopped: stop

        state H <<history>>
    }

    Player --> Suspended: app backgrounded
    Suspended --> H: app foregrounded`,
		`stateDiagram-v2
    [*] --> Editor

    state Editor {
        [*] --> Viewing

        state Mode {
            [*] --> Select
            Select --> Draw: pen tool
            Draw --> Erase: eraser
            Erase --> Select: pointer
        }

        Viewing --> Mode: edit
        Mode --> Viewing: preview

        state H <<history>>
    }

    Editor --> Suspended: sleep
    Suspended --> H: wake`,
		`stateDiagram-v2
    [*] --> Running
    Running --> Saving: exit requested
    Saving --> [*]: save complete
    Running --> FatalError: crash

    state FatalError <<terminate>>`,
		`stateDiagram-v2
    direction LR

    [*] --> Draft
    Draft --> Submitted: submit

    state Review {
        [*] --> ManagerReview
        ManagerReview --> LegalReview: manager approves
        ManagerReview --> Rejected: manager rejects
        LegalReview --> Approved: legal approves
        LegalReview --> Rejected: legal rejects
    }

    Submitted --> Review
    Review --> Published: approved
    Review --> Draft: rejected for edits
    Published --> [*]`,
		`stateDiagram-v2
    [*] --> OrderPlaced
    OrderPlaced --> Validation

    state Validation {
        [*] --> F
        state F <<fork>>

        F --> PaymentCheck
        F --> StockCheck
        F --> AddressCheck

        PaymentCheck --> J
        StockCheck --> J
        AddressCheck --> J

        state J <<join>>
        J --> Decision
    }

    state Decision <<choice>>

    Decision --> Approved: all valid
    Decision --> Rejected: any invalid

    Approved --> Fulfillment
    Rejected --> Cancelled
    Fulfillment --> Shipped
    Shipped --> Delivered
    Delivered --> [*]
    Cancelled --> [*]`,
		`stateDiagram-v2
    [*] --> Editing
    Editing --> Editing: type character
    Editing --> Saved: save
    Saved --> [*]`,
		`stateDiagram-v2
    [*] --> Waiting
    Waiting --> Processing: user clicks the big primary call-to-action button after hesitating for several seconds
    Processing --> Completed: background work finishes successfully
    Completed --> [*]`,
		`stateDiagram-v2
    state "Idle but still listening for websocket reconnection attempts in the background" as Idle
    state "Processing a surprisingly complicated synchronization routine" as Processing

    [*] --> Idle
    Idle --> Processing: reconnect
    Processing --> Idle: synced`,
		`%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#eef7ff",
    "primaryBorderColor": "#336699",
    "lineColor": "#222",
    "fontSize": "16px"
  }
}}%%
stateDiagram-v2
    direction LR

    [*] --> Draft
    Draft --> Review: submit
    Review --> Review: request more changes
    Review --> Published: approve
    Published --> [*]`,
		`stateDiagram-v2
    [*] --> Validate
    Validate --> Decision

    state Decision <<choice>>

    Decision --> Accept: everything looks fine
    Decision --> Validate: hmm... maybe run the exact same validation pipeline one more time just to be absolutely certain
    Accept --> [*]`,
		`stateDiagram-v2
	state "Drafting\\nwith autosave\\nand validation" as Drafting

    [*] --> Drafting
    Drafting --> Drafting: type
    Drafting --> [*]: close`,
	],
	[
		`sequenceDiagram
    Alice->>+John: Hello John, how are you?
    Alice->>+John: John, can you hear me?
    John-->>-Alice: Hi Alice, I can hear you!
    John-->>-Alice: I feel great!`,
		`sequenceDiagram
    Alice->>Bob: Hello Bob`,
		`sequenceDiagram
    User->>App: Open app
    App->>API: Fetch profile
    API-->>App: Profile data
    App-->>User: Render profile`,
		`sequenceDiagram
    participant U as User
    participant A as App
    participant S as Server

    U->>A: Click login
    A->>S: POST /login
    S-->>A: 200 OK
    A-->>U: Show dashboard`,
		`sequenceDiagram
    participant Client
    participant Server

    Client->>Server: Request data
    activate Server
    Server-->>Client: Response data
    deactivate Server`,
		`sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: Get order
    activate API
    API->>DB: Query order
    activate DB
    DB-->>API: Order row
    deactivate DB
    API-->>Client: Order JSON
    deactivate API`,
		`sequenceDiagram
    participant Worker

    Worker->>Worker: Retry counter++
    Worker->>Worker: Recompute backoff`,
		`sequenceDiagram
    participant User
    participant App

    User->>App: Open settings
    Note right of App: Settings are cached locally
    App-->>User: Show settings page`,
		`sequenceDiagram
    actor User
    participant App

    User->>App: Open settings
    App-->>User: Show preferences`,
		`sequenceDiagram
    participant Worker

    Worker->>Worker: Recalculate cache
    Worker-->>Worker: Cache updated`,
		`sequenceDiagram
    participant User
    participant App

    User->>App: Sign in
    alt Credentials valid
        App-->>User: Redirect to dashboard
    else Credentials invalid
        App-->>User: Show error message
    end`,
		`sequenceDiagram
    participant Shopper
    participant Checkout

    Shopper->>Checkout: Place order
    opt Promo code provided
        Checkout->>Checkout: Apply discount
    end
    Checkout-->>Shopper: Order confirmation`,
		`sequenceDiagram
    participant App
    participant Auth
    participant Profile
    participant Billing

    App->>Auth: Validate token
    par Load profile
        App->>Profile: Get profile
        Profile-->>App: Profile data
    and Load billing
        App->>Billing: Get subscription
        Billing-->>App: Billing data
    end
    Auth-->>App: Token valid`,
		`sequenceDiagram
    participant Client
    participant Inventory
    participant Payment

    Client->>Inventory: Reserve item
    critical Atomic checkout
        Inventory->>Payment: Charge card
        Payment-->>Inventory: Payment success
    option Payment failed
        Inventory-->>Client: Reservation released
    end
    Inventory-->>Client: Order completed`,
		`sequenceDiagram
    participant User
    participant API

    User->>API: Request export
    break Rate limit exceeded
        API-->>User: 429 Too Many Requests
    end
    API-->>User: Export ready`,
		`sequenceDiagram
    participant Browser
    participant App
    participant DB

    rect rgb(235, 245, 255)
        Browser->>App: Submit search
        App->>DB: Query records
        DB-->>App: Results
        App-->>Browser: Render results
    end`,
		`sequenceDiagram
    autonumber
    participant User
    participant API
    participant DB

    User->>API: Create item
    API->>DB: Insert row
    DB-->>API: Inserted
    API-->>User: 201 Created`,
		`sequenceDiagram
    participant Client
    participant TempSession

    Client->>TempSession: Start temporary session
    TempSession-->>Client: Session active
    Client->>TempSession: Close session
    destroy TempSession`,
		`sequenceDiagram
    participant User
    participant App

    User->>App: Start report generation
    create participant JobRunner
    App->>JobRunner: Spawn background job
    JobRunner-->>App: Job started
    App-->>User: Report is processing`,
		`sequenceDiagram
    participant MobileApp
    participant Gateway
    participant AuthService
    participant OrdersService

    MobileApp->>Gateway: GET /orders
    activate Gateway
    Gateway->>AuthService: Validate JWT
    activate AuthService
    AuthService-->>Gateway: User claims
    deactivate AuthService

    Note right of Gateway: Forward request with user context

    Gateway->>OrdersService: Fetch orders
    activate OrdersService
    OrdersService-->>Gateway: Order list
    deactivate OrdersService

    Gateway-->>MobileApp: 200 OK + JSON
    deactivate Gateway`,
		`sequenceDiagram
    participant Client
    participant API
    participant Queue
    participant Worker

    Client->>API: Submit video for processing
    API->>Queue: Enqueue job
    API-->>Client: 202 Accepted

    loop Retry until worker available
        Worker->>Queue: Pull next job
        alt Job available
            Queue-->>Worker: Video job
        else No job yet
            Queue-->>Worker: Empty
        end
    end

    Note over Worker: Video processing may take several minutes`,
		`sequenceDiagram
    autonumber
    actor User
    participant Frontend
    participant AuthAPI
    participant AuditLog
    participant Email

    User->>Frontend: Submit username/password
    Frontend->>AuthAPI: POST /login

    alt Login successful
        par Record audit log
            AuthAPI->>AuditLog: Write login success event
        and Optional alert
            opt New device detected
                AuthAPI->>Email: Send new device alert
            end
        end
        AuthAPI-->>Frontend: Access token
        Frontend-->>User: Redirect to app
    else Login failed
        AuthAPI->>AuditLog: Write failed login event
        AuthAPI-->>Frontend: 401 Unauthorized
        Frontend-->>User: Show login error
    end`,
		`sequenceDiagram
    participant Customer
    participant Storefront
    participant Inventory
    participant Payment
    participant Shipping

    Customer->>Storefront: Checkout cart

    rect rgb(245, 255, 245)
        Note over Storefront,Shipping: Order orchestration begins

        Storefront->>Inventory: Reserve items
        Inventory-->>Storefront: Reserved

        critical Finalize payment and shipment
            Storefront->>Payment: Authorize payment
            Payment-->>Storefront: Authorized
            Storefront->>Shipping: Create shipment
            Shipping-->>Storefront: Shipment created
        option Shipment creation failed
            Storefront->>Payment: Void authorization
            Payment-->>Storefront: Authorization voided
        end
    end

    alt All steps succeeded
        Storefront-->>Customer: Order confirmed
    else Failure occurred
        Storefront-->>Customer: Checkout failed
    end`,
		`sequenceDiagram
    autonumber
    actor Customer
    participant WebApp
    participant API
    participant Auth
    participant Catalog
    participant Inventory
    participant Payment
    participant Notification
    participant Analytics

    Customer->>WebApp: Click "Buy now"
    WebApp->>API: POST /purchase
    activate API

    API->>Auth: Validate session
    activate Auth
    Auth-->>API: Session valid
    deactivate Auth

    par Fetch product data
        API->>Catalog: Get product details
        activate Catalog
        Catalog-->>API: Product details
        deactivate Catalog
    and Check stock
        API->>Inventory: Check availability
        activate Inventory
        Inventory-->>API: In stock
        deactivate Inventory
    end

    alt Product available
        opt Customer included coupon
            API->>API: Apply discount rules
        end

        critical Commit purchase
            API->>Payment: Capture payment
            activate Payment
            Payment-->>API: Payment confirmed
            deactivate Payment

            API->>Inventory: Deduct stock
            activate Inventory
            Inventory-->>API: Stock updated
            deactivate Inventory
        option Payment failed
            Note right of API: Stop flow before inventory mutation
        end

        alt Purchase committed
            par Notify customer
                API->>Notification: Send receipt
                activate Notification
                Notification-->>API: Receipt queued
                deactivate Notification
            and Track analytics
                API->>Analytics: Record purchase event
                activate Analytics
                Analytics-->>API: Event stored
                deactivate Analytics
            end
            API-->>WebApp: 200 Purchase complete
            WebApp-->>Customer: Show confirmation page
        else Commit failed
            API-->>WebApp: 409 Purchase failed
            WebApp-->>Customer: Show retry message
        end
    else Out of stock
        API-->>WebApp: 409 Out of stock
        WebApp-->>Customer: Show unavailable message
    end

    deactivate API`,
		`sequenceDiagram
    participant Cache

    Cache->>Cache: Recompute eviction policy
    Cache-->>Cache: Policy updated`,
		`sequenceDiagram
    participant Browser
    participant API

    Browser->>API: Send a request containing a deliberately over-explained label to see how Mermaid wraps or stretches the message text in the renderer
    API-->>Browser: Return a response with an equally verbose description for layout testing`,
		`sequenceDiagram
    participant U as Extremely Verbose End User
    participant S as Somewhat Overengineered Backend Service

    U->>S: Submit form
    Note right of S: This note is intentionally long<br/>and split over multiple lines<br/>to test spacing and wrapping.
    S-->>U: Accepted`,
		`sequenceDiagram
    participant Client
    participant Gateway
    participant Worker

    Client->>Gateway: Submit job

    rect rgb(235, 245, 255)
        Gateway->>Worker: Start processing
        Worker->>Worker: Retry parsing malformed input
        Worker-->>Gateway: Done
    end

    Gateway-->>Client: Result ready`,
		`sequenceDiagram
    participant JobRunner

    JobRunner->>JobRunner: poll
    JobRunner->>JobRunner: poll again
    JobRunner->>JobRunner: perform an unusually long internal bookkeeping step with a very wide label
    JobRunner-->>JobRunner: ok`,
		`%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#f4f4ff",
    "primaryBorderColor": "#7a7aff",
    "lineColor": "#444",
    "secondaryColor": "#fff4e6",
    "tertiaryColor": "#eef9f1"
  }
}}%%
sequenceDiagram
    actor User
    participant App
    participant DB

    User->>App: Save settings
    activate App
    App->>DB: Write preferences
    activate DB
    DB-->>App: Stored
    deactivate DB
    App-->>User: Success
    deactivate App`,
		`sequenceDiagram
    participant A
    participant B

    A->>B: ok
    B->>A: This label is intentionally much, much, much longer than the previous one so you can see how the diagram stretches unevenly`,
		`sequenceDiagram
    participant Worker

    activate Worker
    Worker->>Worker: parse chunk 1
    Worker->>Worker: parse chunk 2
    Worker->>Worker: parse chunk 3 with a suspiciously long status label for layout testing
    deactivate Worker`,
	],
]
