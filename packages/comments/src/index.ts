// eslint-disable-next-line tldraw/no-export-star
export * from './records'
export {
	commentsPlugin,
	type CommentsPluginOptions,
	type CommentsPluginUser,
	type TLCommentsComponents,
} from './commentsPlugin'
export {
	addComment,
	resolveThread,
	startCommentThread,
	useCommentThreads,
	useThreadComments,
} from './hooks'
export { richTextToPlaintext } from './richTextToPlaintext'
