import { CommentsSidebar, CommentsSidebarProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentsSidebarProps> = {
	title: 'Comments/Sidebar',
	component: CommentsSidebar,
}
export default sketchbook

export const WithComments: Sketch<CommentsSidebarProps> = { args: { empty: false } }
export const Empty: Sketch<CommentsSidebarProps> = { args: { empty: true } }
