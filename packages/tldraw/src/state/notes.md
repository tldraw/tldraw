# Notes

- [x] Remap style panel
- [x] Remap zoom panel
- [x] Remap undo / redo panel
- [x] Remap tool panel
- [x] Migrate commands
- [x] Migrate sessions

## History

The app's history is an array of [Command](#command) objects, together with a pointer indicating the current position in the stack. If the pointer is above the lowest (zeroth) position, a user may _undo_ to move the pointer down. If the pointer is below the highest position, a user may _redo_ to move the pointer up. When the pointer changes to a new position, it will either _redo_ the command at that position if moving up or _undo_ the command at its previous position if moving down.

## Commands

Commands are entries in the app's [History](#history) stack. have two methods: `do` and `undo`. Each method should return a `Partial<TLDrawState>`.

The `do` method is called under two circumstances: first, when executing a command for the first time; and second, when executing a "redo". The method receives a boolean (`isRedo`) as its second argument indiciating whether it is being called as a "do" or a "redo".

## Sessions

Sessions have two methods: `start`, `update`, `cancel` and `complete`. The `start`, `update`, and `cancel` methods should return a `Partial<TLDrawState>`. The `complete` method should return a [Command](#commands).

## Mutations

When we mutate shapes inside of a command, we:

- Gather a unique set of all shapes that _will_ be mutated: the initial shapes directly effected by the change, plus their descendants (if any), plus their parents (if any), plus other shapes that are "bound to" the shapes / parents. Repeat this check until an iteration returns the same size set as the previous iteration, indicating that we've found all shapes effected by the mutation.
- Serialize a snapshot of the mutation. This data will be used to perform the "undo".
- Using a reducer that returns the `Data` object, iterate through the initial shapes, mutating first the shape, then its bindings, and then the shape's parents beginning with the direct parent and moving upward toward the root (a page). If _n_ shapes share the same parent, then the parent will be updated _n_ times. If the initial set of shapes includes _n_ shapes that are bound to eachother, then the binding will be updated _n_ times.
- Finally, serialize a snapshot of all effected shapes. This data will be used to perform the "redo".
- Return both the "undo" and "redo" data. This should be saved to the history stack. It can also be saved to storage as part of the document.
- When the history "does" the command, merge the "redo" data into the current `Data`.
- When the history "undoes" the command, merge the "undo" data into the current `Data`.
- When the history "redoes" the command, merge the "redo" data into the current `Data`.
