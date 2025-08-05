# Stuff I want in the SDK after building this

1. ~~Some way to have state scoped to the lifecycle of an editor. We do this a fair bit in the SDK, and it's ad-hoc every time. `EditorState` worked well here~~.
2. `canTranslate` & `canDuplicate` style flags. These operations don't really make sense for connections, but i can't disable them comprehensively.
3. ~~`onHandleDragStart`, `onHandleDragComplete`, `onHandleDragCancel`. Maybe some way of attaching state to these too? It'd be nice to have the full set for all of this genre of callback. `cancel` is important for state management.~~
4. ~~`isCreatingShape` flag for handle dragging~~
5. ~~A better way to insert nodes into the state graph~~
6. More custom ways of controlling snapping & how snap lines render. Snap _lines_ rather than points, maybe?
7. Fast spacial querying e.g. "get me all shapes in this bounding box"
8. `getIndices(n)` returns n + 1 indices which feels very counter intuitive.
9. Generally I'd like an easier way to work with "multiplayer arrays" - objects where the keys are fractional indexes. I ended up writing some of my own helpers for this.
10. A way to have things in geometry that don't contribute to `bounds` calculations. I achieved this by marking them as labels, but that feels wrong maybe?
11. ~~A way to pass custom JSX in the place of icon names to anything that expects an icon~~
12. A canonical way (or at least an example) to have the size of an element derived from how it's rendered in the DOM.
13. A better way of having geometry derived from the DOM (ie port locations).
14. Hide resize handles when no selected items are resizable.
15. Disable rotation?
16. ~~A better way of doing vertical toolbars~~ with overflow

# Other things I maybe want to do

1. API example showing inserting a state node
2. "Ports" addon library
