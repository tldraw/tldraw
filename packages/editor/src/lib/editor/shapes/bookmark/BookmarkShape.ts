import { bookmarkShapeMigrations, bookmarkShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { BookmarkShapeUtil } from './BookmarkShapeUtil'

/** @public */
export const BookmarkShape = defineShape('bookmark', {
	util: BookmarkShapeUtil,
	props: bookmarkShapeProps,
	migrations: bookmarkShapeMigrations,
})
