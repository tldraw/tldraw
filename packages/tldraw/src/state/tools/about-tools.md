# Tools

Tools are classes that handle events. A tldrawApp instance has a set of tools (`tools`) and one current tool (`currentTool`). The state delegates events (such as `onPointerMove`) to its current tool for handling.

In this way, tools function as a finite state machine: events are always handled by a tool and will only ever be handled by one tool.

## BaseTool

Each tool extends `BaseTool`, which comes with several default methods used by the majority of other tools. If a tool overrides one of the BaseTool methods, consider re-implementing the functionality found in BaseTool. For example, see how `StickyTool` overrides `onPointerUp` so that, in addition to completing the current session, the it also sets the state's `editingId` to the new sticky shape.

## Enter and Exit Methods

When the state changes from one tool to another, it will:

1.  run the previous tool's `onExit` method
2.  switch to the new tool
3.  run the new current tool's `onEnter` method

Each tool has a status (`status`) that may be set with `setStatus`.
