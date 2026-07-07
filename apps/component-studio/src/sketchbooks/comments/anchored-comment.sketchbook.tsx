import { TLCommentThread } from 'tldraw'
import { sampleComments, sampleThread } from '../../comment-model'
import { Sketch, Sketchbook } from '../../sketch'
import { AnchoredComment, AnchoredCommentProps } from './anchored-comment'

const resolvedThread: TLCommentThread = {
	...sampleThread,
	resolvedAt: sampleThread.createdAt + 3_600_000,
	resolvedBy: 'ada',
}

const sketchbook: Sketchbook<AnchoredCommentProps> = {
	title: 'Comments/Anchored comment',
	component: AnchoredComment,
}
export default sketchbook

export const Open: Sketch<AnchoredCommentProps> = {
	args: { thread: sampleThread, comments: sampleComments, open: true },
}
export const Resolved: Sketch<AnchoredCommentProps> = {
	args: { thread: resolvedThread, comments: sampleComments, open: true },
}
export const Collapsed: Sketch<AnchoredCommentProps> = {
	args: { thread: sampleThread, comments: sampleComments, open: false },
}
