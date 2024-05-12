Times when states talk to each-other

- reading / writing to selection
- reading / writing to styles
- switching to other tools

Which pieces of state are "universal" vs which are "tool-specific"?
For example, the selection brush is only relevant to the select tool but the selected shape ids are relevant to all tools.

Therefore the selection brush should be stored in the select tool's context but the selected shape ids should be stored in the editor's context. The erasing / cropping / hinted shapes are probably relevant only to their tools, and should be extracted from the default canvas into their tool's overlay / underlay.

Snapping seems to be a universal UI (because it's used while shapes are being resized, for example) but that happens while shape tools are being used to create a shape. In that case the select tool is technically active, however.

We could further separate this into tools vs. interactions, each with their own UI. For example, here the indicators are tool-specific, and should be displayed when the tool is active. But the brush is only shown when the tool is active and the user is dragging, so it's an interaction-specific UI.

In other words, we could extract the interaction out of the tool into its own concept, and have it be responsible for that part of the UI (i.e. its own overlay / underlay).

But the consequences of that interaction would not be re-usable. The "zoom brush" is almost identical but we use its box for something else (i.e. zooming in or out).

I think it's best if we leave this as much up to the consumer as possible. It's enough to say "hey, an event happened, what would you like to do about it In theory a user could use their own state chart library to manage the responses.
