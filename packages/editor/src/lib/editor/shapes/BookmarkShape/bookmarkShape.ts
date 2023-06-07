import { createShape } from '../../../config/createShape'
import { BookmarkShapeUtil } from './BookmarkShapeUtil/BookmarkShapeUtil'
import { bookmarkShapeMigrations } from './bookmarkShapeMigrations'
import { TLBookmarkShape } from './bookmarkShapeTypes'
import { bookmarkShapeValidator } from './bookmarkShapeValidator'

/** @public */
export const bookmarkShape = createShape<TLBookmarkShape>('bookmark', {
	util: BookmarkShapeUtil,
	migrations: bookmarkShapeMigrations,
	validator: bookmarkShapeValidator,
})
