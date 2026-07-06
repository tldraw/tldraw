import { Sketch, Sketchbook } from '../../sketch'
import { EmptyState, EmptyStateProps } from './empty-state'

const sketchbook: Sketchbook<EmptyStateProps> = {
	title: 'Comments/Empty',
	component: EmptyState,
}
export default sketchbook

export const Default: Sketch<EmptyStateProps> = {
	args: { message: 'No comments yet. Start the conversation.' },
}
