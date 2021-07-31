# Notes

## History

The app's history is an array of [Command](#command) objects, together with a pointer indicating the current position in the stack. If the pointer is above the lowest (zeroth) position, a user may _undo_ to move the pointer down. If the pointer is below the highest position, a user may _redo_ to move the pointer up. When the pointer changes to a new position, it will either _redo_ the command at that position if moving up or _undo_ the command at its previous position if moving down.

## Commands

Commands are entries in the app's [History](#history) stack. have two methods: `do` and `undo`. Each method should return a `Partial<TLDrawState>`.

The `do` method is called under two circumstances: first, when executing a command for the first time; and second, when executing a "redo". The method receives a boolean (`isRedo`) as its second argument indiciating whether it is being called as a "do" or a "redo".

## Sessions

Sessions have two methods: `start`, `update`, `cancel` and `complete`. The `start`, `update`, and `cancel` methods should return a `Partial<TLDrawState>`. The `complete` method should return a [Command](#commands).
