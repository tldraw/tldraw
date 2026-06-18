# @tldraw/state behavior specification

This document states the rules that `@tldraw/state` implements. It is written to drive testing: each rule has a stable ID (e.g. `EP2`, `T5`), each rule is independently observable through the public API (or the documented internal API where noted), and the unit tests should be an expression of these rules. When a test and this document disagree, one of them is wrong — figure out which and fix it.

Sections marked **internal** describe supporting machinery (`ArraySet`, `HistoryBuffer`, capture functions) that has its own contract worth testing directly, even though users never touch it.

## 1. Model and vocabulary

- A **signal** is a reactive value container. There are two kinds: **atoms** (set directly) and **computed signals** (derived from other signals).
- A **child** is anything that depends on signals: a computed signal or an effect scheduler.
- A child's **parents** are the signals it dereferenced during its most recent execution.
- An **effect** is a side-effecting function managed by an `EffectScheduler`, usually via `react()` or `reactor()`.
- The **global epoch** is a single integer clock shared by every signal. It ticks when state changes.
- A **transaction** batches atom changes and defers effects; it can be rolled back.
- The **reaction phase** is the period during which changed atoms' effects are being run.
- A **diff** is a value describing the change between two sequential values of a signal. `RESET_VALUE` is a sentinel meaning "no diff available; consumers must start over from the current value."

## 2. The epoch clock (EP)

- **EP1** There is one global epoch counter shared by all signals.
- **EP2** Creating a signal (atom or computed) does not advance the global epoch.
- **EP3** Setting an atom to a value that is not equal to its current value (see EQ) advances the global epoch by exactly one.
- **EP4** Setting an atom to an equal value does not advance the global epoch.
- **EP5** Every signal exposes `lastChangedEpoch`: the global epoch at the moment its value last actually changed. For a computed, recomputing to an equal value does not update `lastChangedEpoch`.
- **EP6** Aborting a transaction advances the global epoch (in addition to any epoch advances caused by restoring atom values).

## 3. Equality (EQ)

- **EQ1** Default equality between an old value `a` and a new value `b` is: `a === b`, else `Object.is(a, b)`, else `a.equals(b)` if `a` has a callable `equals` method.
- **EQ2** Default equality is asymmetric: only the _old_ value's `equals` method is consulted. A `b.equals` method alone has no effect.
- **EQ3** If an `isEqual` option is provided to `atom()` or `computed()`, it replaces default equality for change detection on that signal.
- **EQ4** When two values are "equal" by these rules, the system treats them as no change at all: no epoch advance, no history entry, no notification of children, and (for computed) the previous value object is retained — `get()` keeps returning the _old_ reference.

## 4. Atoms (A)

- **A1** `atom(name, initialValue, options?)` creates an atom whose `get()` returns `initialValue`.
- **A2** `atom.set(value)` makes subsequent `get()` calls return `value`, unless `value` is equal (EQ) to the current value, in which case the call is a complete no-op.
- **A3** `atom.set` returns the atom's value after the call (the new value, or the unchanged current value).
- **A4** `atom.update(fn)` is exactly `atom.set(fn(currentValue))`. It does not accept a diff.
- **A5** `atom.get()` captures the atom as a parent of the currently-executing computed or effect (see CAP). `atom.__unsafe__getWithoutCapture()` returns the same value without capturing.
- **A6** Atoms are independent: changing one atom never affects another atom's value, history, or `lastChangedEpoch`.

## 5. Dependency capture (CAP)

- **CAP1** While a computed signal is deriving or an effect is executing, every signal whose `get()` (or `getDiffSince()`) is called is captured as a parent of that computed/effect.
- **CAP2** A child's parent set after an execution is exactly the set of signals dereferenced during that execution. Signals dereferenced in a previous execution but not the latest one are removed (and detached).
- **CAP3** Parents are recorded in first-dereference order, deduplicated: dereferencing the same signal twice captures it once.
- **CAP4** Capture contexts nest. A computed dereferenced inside an effect captures its own parents in its own frame; the effect captures the computed, not the computed's parents.
- **CAP5** `unsafe__withoutCapture(fn)` runs `fn` with capture disabled and restores the previous capture context afterwards, even if `fn` throws. Signals dereferenced inside it do not become parents, and changes to them alone do not re-run the enclosing computed/effect.
- **CAP6** Dereferencing a signal outside any capture context is allowed and captures nothing.
- **CAP7** (internal) Liveness propagates transitively: when an actively-listening child captures a computed parent, that computed attaches to its own parents, recursively. Conversely, when a computed loses its last child it detaches from its own parents, recursively. A signal's `children` set is empty whenever nothing is actively listening downstream.
- **CAP8** (internal) `startCapturingParents`/`stopCapturingParents`/`maybeCaptureParent` reuse the child's existing `parents`/`parentEpochs` arrays (no reallocation), shrinking them in place when fewer parents are captured, and recording capture order as dereferenced.

## 6. Computed signals (C)

- **C1** Computeds are lazy. The compute function does not run at creation time; it first runs on the first `get()`.
- **C2** Computeds are cached. Repeated `get()` calls re-run the compute function only if at least one parent's `lastChangedEpoch` differs from the epoch recorded when that parent was last dereferenced. Epoch advances unrelated to the computed's parents never cause recomputation.
- **C3** A computed whose first execution captured no parents never recomputes.
- **C4** The compute function receives `(previousValue, lastComputedEpoch)`. On the first computation `previousValue` is the `UNINITIALIZED` symbol (test with `isUninitialized`); afterwards it is the previous value. `lastComputedEpoch` is the epoch at which the computed last finished computing.
- **C5** If recomputation produces a value equal (EQ) to the previous one, the computed keeps the previous value object and its `lastChangedEpoch`; downstream children observe no change. The signal's `isEqual` is never invoked for the first computation.
- **C6** A chain of computeds re-runs minimally: each computed in the chain recomputes at most once per relevant change, and value-level deduplication (C5) stops propagation early.
- **C7** `computed.isActivelyListening` is true exactly when the computed has at least one attached child (effect or actively-listening computed downstream).
- **C8** The `@computed` decorator on a class method makes that method behave as `Computed.get()` for a per-instance computed signal: cached, reactive, with options (`isEqual`, `historyLength`, etc.) honored. Both legacy and TC39 decorator protocols are supported.
- **C9** `getComputedInstance(obj, propertyName)` returns the underlying `Computed` instance for a decorated method, creating it on demand if the method has not been called yet.
- **C10** Using `@computed` on a _getter_ (legacy decorators only) still works but logs a one-time deprecation warning per process.

## 7. Errors in computed signals (CE)

- **CE1** If the compute function throws, the thrown value is cached: subsequent `get()` calls rethrow the same value without re-running the compute function, until a parent changes.
- **CE2** Entering the error state counts as a change: downstream effects re-run (and observe the throw). Throwing again on a subsequent recomputation, while already in the error state, does _not_ count as a change — consecutive errors do not re-trigger effects.
- **CE3** Entering the error state discards the previous value: when the computed later recovers, the compute function receives `UNINITIALIZED` as `previousValue`, and the error state clears.
- **CE4** Entering the error state clears the computed's history buffer; `getDiffSince` spanning the error returns `RESET_VALUE`.
- **CE5** Errors do not corrupt the graph: `__unsafe__getWithoutCapture(true)` suppresses the rethrow (used internally so `haveParentsChanged` can be called on a throwing graph without exploding), and the computed still participates in capture.
- **CE6** An effect that throws does not roll anything back: atom values (including those set in the surrounding transaction) keep their new values, and the error propagates to whoever triggered the flush.

## 8. History and diffs (H)

- **H1** A signal has a history buffer only if `historyLength` was passed at creation. `computeDiff` without `historyLength` does nothing.
- **H2** When an atom with history changes, the recorded diff is chosen in priority order: the explicit `diff` argument to `set(value, diff)`, else `computeDiff(prev, next, lastChangedEpoch, currentEpoch)`, else `RESET_VALUE`.
- **H3** When a computed with history changes, the recorded diff is chosen in priority order: the diff from a `withDiff(value, diff)` return value, else `computeDiff(...)`, else `RESET_VALUE`. No entry is recorded for the first computation.
- **H4** Recording `RESET_VALUE` as a diff clears the entire history buffer. In particular, failing to supply a diff on a signal that has history but no `computeDiff` wipes its history.
- **H5** `getDiffSince(epoch)` returns:
  - the shared frozen `EMPTY_ARRAY` if `epoch >= lastChangedEpoch` (nothing changed since);
  - otherwise `RESET_VALUE` if the signal has no history buffer;
  - otherwise the ordered array of diffs covering `epoch` → now, if the buffer reaches back that far;
  - otherwise `RESET_VALUE` (history evicted: more than `historyLength` changes since `epoch`, or the buffer was cleared, or `epoch` predates the signal's first computation).
- **H6** `getDiffSince` captures the signal as a parent, like `get()`. On a computed it first brings the value up to date.
- **H7** History keeps recording inside transactions. On abort, the history buffers of all atoms changed during the transaction are cleared (their pre-transaction diffs are gone too — `getDiffSince` from before the transaction returns `RESET_VALUE`). A computed's history is _not_ cleared by an abort; it records the round-trip (the change and the change back) as ordinary entries.
- **H8** `withDiff(value, diff)` is only meaningful as a computed's return value; it is unwrapped so `get()` returns `value`, and `diff` feeds the history buffer per H3.

## 9. Effects: EffectScheduler, react, reactor (E)

- **E1** `react(name, fn)` runs `fn` immediately and unconditionally, then re-runs it whenever any signal captured during its previous run changes. It returns a stop function; after stopping, changes no longer re-run `fn`.
- **E2** `reactor(name, fn)` does not run `fn` until `.start()`. `.start()` runs the effect if it has never run or if any parent changed while stopped; otherwise it does not run. `.start({ force: true })` always runs it. `.stop()` detaches. Start/stop may be repeated.
- **E3** One state change produces at most one run of a given effect, even if the change affected several of its parents (e.g. several atoms set in one transaction, or a diamond dependency graph).
- **E4** An effect re-runs only when a parent's value actually changed (per EQ and C5). Equal-value sets and unrelated epoch advances do not re-run it.
- **E5** The effect function receives the epoch at which the effect last ran. This enables the incremental pattern `signal.getDiffSince(lastReactedEpoch)` inside effects. The epoch passed is the one captured _before_ the run, so an effect that updates atoms during its own run remains eligible to be scheduled again.
- **E6** With a custom `scheduleEffect` option, scheduling and execution are decoupled: when the effect would run, `scheduleEffect(execute)` is called instead and nothing executes until the callback invokes `execute`. The initial run of `react()` is also routed through `scheduleEffect`. `scheduleCount` counts scheduling events, whether or not the effect later executes.
- **E7** If an effect is detached after being scheduled but before the deferred `execute` callback runs, executing the callback is a no-op.
- **E8** `EffectScheduler.attach()` does not by itself run the effect (`execute()` must be called the first time; afterwards changes schedule it per E3/E4). `detach()`/`attach()` cycles retain the captured parents: re-attaching does not re-run the effect unless a parent changed while detached (matching E2 since `reactor` is a thin wrapper).
- **E9** `maybeScheduleEffect` on a detached scheduler is a no-op. On an attached scheduler whose parents are unchanged it is a no-op (but marks the scheduler as up to date with the current epoch).

## 10. Change propagation and the reaction phase (P)

- **P1** When an atom changes outside any transaction, effects run synchronously before `set` returns.
- **P2** Propagation reaches effects through arbitrarily deep computed chains, but only along _actively listening_ edges. Effects (or computeds) that nothing is listening to are not visited.
- **P3** Each child in the graph is traversed at most once per epoch during a flush, even when reachable through multiple paths.
- **P4** Effects may set atoms. Changes made during the reaction phase do not interrupt the current pass: affected effects are collected and run after the current pass completes, repeatedly, until the system quiesces.
- **P5** If that loop fails to quiesce after 1000 passes, the flush throws `Reaction update depth limit exceeded`. An effect that unconditionally writes to one of its own parents hits this limit.
- **P6** An effect that sets atoms inside a transaction (or `transact`/`transaction` call) during the reaction phase gets the same deferral: the inner transaction's effects are folded into the current reaction phase rather than flushed reentrantly.
- **P7** Computeds read during the reaction phase are correct: an effect that sets an atom and then reads a computed depending on it sees the updated value (within the same pass).

## 11. Transactions (T)

- **T1** `transaction(fn)` starts a new transaction, always. `transact(fn)` joins the current transaction if one exists, else behaves like `transaction(fn)`. Both return `fn`'s return value — including when the transaction rolls back.
- **T2** Inside a transaction there is no isolation: atom `set`s are visible immediately to subsequent reads, and computeds recompute on demand against in-transaction values.
- **T3** Effects do not run during a transaction. They run once, synchronously, when the _outermost_ transaction commits, per E3.
- **T4** `fn` receives a `rollback` callback. Calling it (and then returning normally) aborts the transaction: every atom changed during the transaction is restored to the value it had when the transaction began.
- **T5** If `fn` throws, the transaction aborts as in T4 and the exception propagates.
- **T6** An aborted transaction still flushes effects: effects whose parents went through a change-and-restore round trip are scheduled, observe the restored values, and per E4 may run. Effects never observe intermediate in-transaction values.
- **T7** Nested `transaction` calls roll back independently: an inner rollback restores to the _inner_ transaction's start. A committed inner transaction is still undone by an outer rollback (the inner transaction's initial values fold into the parent on commit).
- **T8** Because `transact` joins rather than nests, a throw inside an inner `transact` does not restore anything by itself; if it propagates out of the outermost transaction, T5 applies there.
- **T9** Abort clears the history buffers of every atom changed in the transaction (H7).
- **T10** Mismatched transaction boundaries (committing a transaction that is not the innermost) throw `Transaction boundaries overlap`.

## 12. Async transactions: deferAsyncEffects (AT)

- **AT1** `deferAsyncEffects(fn)` runs the async `fn` in a transaction context: atom changes are visible immediately to reads (T2 applies), but effects are deferred until the async transaction completes.
- **AT2** It throws (rejects) if called while a synchronous transaction is in progress. Synchronous `transaction`/`transact` calls _inside_ the async body are fine and nest normally.
- **AT3** If `fn` rejects or throws, all changes made during the async transaction are rolled back and the error propagates.
- **AT4** Calling `deferAsyncEffects` while another async transaction is in flight joins it: changes from both are batched together, and effects run only after the last participating process finishes. Async transaction state leaks across `await` boundaries between concurrent processes (no AsyncContext); the grouping of effects is the guarantee, not isolation.
- **AT5** A `deferAsyncEffects` call kicked off during the reaction phase waits for the reaction phase to finish before starting.
- **AT6** The returned promise resolves to `fn`'s return value.

## 13. Debugging aids (D)

- **D1** Every signal and effect takes a `name` for debugging. Names need not be unique and have no behavioral effect.
- **D2** `whyAmIRunning()` throws if called outside a computed or effect execution.
- **D3** When called inside one, the _next_ execution of that computed/effect logs (via `console.log`) a tree of which ancestor signals changed, by name; if it was executed without any ancestor change, it logs that it was executed manually.

## 14. Type guards and module duplication (G)

- **G1** `isAtom(v)` is true exactly for values created by `atom()`; `isComputed(v)` exactly for computed signals (including instances behind decorated methods); `isSignal(v)` is `isAtom(v) || isComputed(v)`. All three return false for `null`, `undefined`, plain objects, functions, and each other's instances.
- **G2** The library's classes and global state (epoch counter, transaction state, capture stack, class identities) are registered as `globalThis` singletons. If two copies of the library are loaded in one realm, they share one reactive universe and the type guards in G1 work across copies.

## 15. localStorageAtom (LS)

- **LS1** `localStorageAtom(name, initialValue, options?)` returns `[atom, cleanup]`. The atom's starting value is the JSON-parsed localStorage entry for `name` when one exists, else `initialValue`.
- **LS2** A corrupted (unparseable) localStorage entry is deleted, and `initialValue` is used. An empty-string entry is treated as absent.
- **LS3** The atom's value is written to localStorage as JSON on creation and after every change.
- **LS4** A `storage` event for the same key updates the atom with the parsed new value; a `storage` event with `newValue: null` resets the atom to `initialValue`; an unparseable `newValue` and events for other keys are ignored.
- **LS5** `cleanup()` stops localStorage writes and storage-event handling. The atom itself keeps working as a plain atom. Atom `options` (equality, history) pass through per A/H rules.

## 16. ArraySet — internal (AS)

`ArraySet` is the dependency-set data structure. Contract: it behaves as a set under `add`/`remove`/`clear`/`has`/`size`/`isEmpty`/`visit`/iteration.

- **AS1** `add` returns true and inserts when the element is absent; returns false and does nothing when present. `remove` returns true and deletes when present; returns false otherwise.
- **AS2** `visit` and `[Symbol.iterator]` yield each element exactly once; `has`, `size`, and `isEmpty` are consistent with the elements yielded.
- **AS3** The implementation stores up to `ARRAY_SIZE_THRESHOLD` (8) elements in an array, promoting to a `Set` on overflow. Behavior is identical in both modes and across the promotion boundary, including after interleaved adds, removes, and clears.

## 17. HistoryBuffer — internal (HB)

`HistoryBuffer` is the circular diff store behind H1–H5.

- **HB1** `pushEntry(fromEpoch, toEpoch, diff)` stores a diff covering the epoch range; pushing `undefined` is ignored; pushing `RESET_VALUE` clears the buffer.
- **HB2** `getChangesSince(epoch)` returns `[]` when the epoch is at or past the newest entry's `toEpoch`; the ordered diffs back to (and including) the entry whose range contains `epoch`, when the buffer reaches back that far; and `RESET_VALUE` otherwise (epoch too old, buffer empty, capacity exceeded, or cleared).
- **HB3** The buffer holds at most `capacity` entries; the oldest entries are overwritten, after which queries reaching past them return `RESET_VALUE`.
