// TipTap re-exported so extension authors don't install `@tiptap/*` themselves: a separate copy
// brings its own ProseMirror, and ProseMirror throws when a schema mixes nodes from two instances.
// These come out of tldraw's bundle, so they stay single-instance at the version tldraw ships.
export {
	Extension,
	getSchema,
	Mark,
	mergeAttributes,
	Node,
	type Extensions,
	type JSONContent,
} from '@tiptap/core'
export {
	TaskItem,
	TaskList,
	type TaskItemOptions,
	type TaskListOptions,
} from '@tiptap/extension-list'
