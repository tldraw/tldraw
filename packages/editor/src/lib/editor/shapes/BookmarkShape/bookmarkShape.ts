import { defineShape } from '../../../config/defineShape'
import { BookmarkShapeUtil } from './BookmarkShapeUtil/BookmarkShapeUtil'
import { bookmarkShapeMigrations } from './bookmarkShapeMigrations'
import { TLBookmarkShape } from './bookmarkShapeTypes'
import { bookmarkShapeValidator } from './bookmarkShapeValidator'

/** @public */
export const bookmarkShape = defineShape<TLBookmarkShape>({
	type: 'bookmark',
	util: BookmarkShapeUtil,
	migrations: bookmarkShapeMigrations,
	validator: bookmarkShapeValidator,
})
