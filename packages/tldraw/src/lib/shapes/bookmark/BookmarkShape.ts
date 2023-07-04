import { bookmarkShapeMigrations, bookmarkShapeProps, defineShape } from '@tldraw/editor'
import { BookmarkShapeUtil } from './BookmarkShapeUtil'

/** @public */
export const BookmarkShape = defineShape('bookmark', {
	util: BookmarkShapeUtil,
	props: bookmarkShapeProps,
	migrations: bookmarkShapeMigrations,
})
