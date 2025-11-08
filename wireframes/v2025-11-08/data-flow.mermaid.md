%% tldraw Data Flow
%% How data moves through the system - state management, reactive updates, sync protocol
%% Covers local editing, multiplayer sync, and persistence

sequenceDiagram
    participant User
    participant DOM as DOM Events
    participant Tool as Tool StateNode
    participant Editor as Editor Class
    participant Store as TLStore
    participant Atom as Atoms/Computed
    participant React as React Components
    participant Sync as Sync Client
    participant WS as WebSocket
    participant Server as Sync Server
    participant DB as PostgreSQL

    Note over User,DB: LOCAL EDITING FLOW

    User->>DOM: Pointer/Keyboard Event
    DOM->>Tool: Event captured
    Tool->>Tool: State machine<br/>processes event
    Tool->>Editor: API call<br/>(createShape, updateShape, etc.)
    Editor->>Store: put([records])
    Store->>Store: Validate records
    Store->>Atom: Update individual<br/>record atoms
    Atom->>Atom: Notify dependents
    Atom->>React: Trigger re-render<br/>(via useValue hook)
    React->>User: UI updates

    Note over Store,Atom: REACTIVE UPDATE FLOW

    Store->>Store: History accumulator<br/>batches changes
    Store->>Store: Compute RecordsDiff<br/>(added, updated, removed)
    Store->>Atom: Update history atom
    Atom->>Editor: Notify change listeners
    Editor->>Editor: Side effects execute<br/>(if registered)
    Editor->>React: Shape re-render<br/>(only affected shapes)

    Note over User,DB: MULTIPLAYER SYNC FLOW

    User->>Tool: Make change
    Tool->>Editor: Update shapes
    Editor->>Store: put([records])
    Store->>Atom: Local update<br/>(optimistic)
    Atom->>React: Immediate UI update

    Store->>Sync: Record change<br/>(source: 'user')
    Sync->>Sync: Create diff message
    Sync->>WS: Send binary message<br/>(efficient encoding)
    WS->>Server: WebSocket message

    Server->>Server: Operational Transform<br/>(resolve conflicts)
    Server->>Server: Apply to room state
    Server->>DB: Persist changes<br/>(async)

    Server->>WS: Broadcast to other clients
    WS->>Sync: Receive update
    Sync->>Store: put([records])<br/>(source: 'remote')
    Store->>Atom: Update atoms<br/>(skip if same)
    Atom->>React: Re-render other users' changes

    Note over Sync,Server: PRESENCE FLOW (Cursors)

    User->>Editor: Mouse move
    Editor->>Editor: Compute presence state<br/>(cursor, selection)
    Editor->>Sync: Update presence<br/>(throttled)
    Sync->>WS: Presence message
    WS->>Server: Broadcast presence

    Server->>WS: Send to other clients
    WS->>Sync: Receive presence
    Sync->>Store: Update presence records<br/>(not persisted)
    Store->>React: Render cursors

    Note over User,DB: ASSET UPLOAD FLOW

    User->>Editor: Drop image file
    Editor->>Editor: Create temporary asset
    Editor->>Store: Add asset record<br/>(temporary URL)
    Store->>React: Show image immediately<br/>(optimistic)

    Editor->>Editor: Call asset upload handler
    Editor->>WS: Upload to asset worker<br/>(via HTTP)
    WS->>Server: Asset worker processes
    Server->>DB: Store in R2
    Server->>Editor: Return final URL

    Editor->>Store: Update asset record<br/>(final URL)
    Store->>React: Update image source

    Note over Store,DB: PERSISTENCE FLOW

    Store->>Store: Debounced save trigger
    Store->>Store: Serialize store snapshot
    Store->>Store: IndexedDB.put()<br/>(local persistence)

    Store->>Sync: Send to server<br/>(if multiplayer)
    Sync->>Server: Sync changes
    Server->>DB: PostgreSQL INSERT/UPDATE<br/>(source of truth)

    Note over Editor,React: SHAPE RENDERING FLOW

    Store->>Atom: Shape record updated
    Atom->>React: useValue() notifies
    React->>React: Component re-renders
    React->>Editor: Get ShapeUtil for type
    Editor->>Editor: ShapeUtil.component(shape)
    Editor->>React: Return shape component
    React->>User: Render to canvas

    Note over Tool,Editor: TOOL INTERACTION FLOW

    User->>Tool: onPointerDown
    Tool->>Tool: Transition state<br/>(Idle → Pointing)
    Tool->>Editor: Start interaction

    User->>Tool: onPointerMove
    Tool->>Tool: Update state
    Tool->>Editor: Update temporary shape<br/>(preview)

    User->>Tool: onPointerUp
    Tool->>Tool: Transition state<br/>(Pointing → Idle)
    Tool->>Editor: Finalize shape<br/>(commit to store)
    Editor->>Store: put([finalShape])

    Note over Store,Editor: UNDO/REDO FLOW

    User->>Editor: Ctrl+Z (undo)
    Editor->>Editor: HistoryManager.undo()
    Editor->>Store: Get history diffs
    Store->>Store: Reverse last diff<br/>(updated → from)
    Store->>Atom: Apply reversed changes
    Atom->>React: Re-render previous state
    React->>User: UI restored

    Note over Editor,React: COMPUTED GEOMETRY FLOW

    Store->>Atom: Shape updated
    Atom->>Editor: Notify change
    Editor->>Editor: Get ShapeUtil
    Editor->>Editor: ShapeUtil.getGeometry(shape)
    Editor->>Editor: Cache geometry<br/>(memoized)
    Editor->>Editor: Use for hit testing,<br/>bounds, snapping
    Editor->>React: Render indicators<br/>using geometry
