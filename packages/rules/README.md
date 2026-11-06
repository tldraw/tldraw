# @tldraw/rules

Access rules for tldraw records, as data. Each record type declares who may read, create, update, and delete it, with a small expression language over `user`, `prev`, `next`, and related records. The sync room enforces the rules; the editor uses the same rules to hide tools, lock shapes, derive read-only mode, and explain denials.

See the "Permission rules" example in `apps/examples` and the backtests in `packages/sync-core/src/test/rules.test.ts`.
