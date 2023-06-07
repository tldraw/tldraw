import { TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { BookmarkShapeUtil } from './BookmarkShapeUtil/BookmarkShapeUtil'
import { bookmarkShapeMigrations } from './bookmarkShapeMigrations'
import { bookmarkShapeValidator } from './bookmarkShapeValidator'

/** @public */
export const bookmarkShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: BookmarkShapeUtil,
	migrations: bookmarkShapeMigrations,
	validator: bookmarkShapeValidator,
}
