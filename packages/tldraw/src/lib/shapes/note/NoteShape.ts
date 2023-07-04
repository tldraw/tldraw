import { defineShape, noteShapeMigrations, noteShapeProps } from '@tldraw/editor'
import { NoteShapeTool } from './NoteShapeTool'
import { NoteShapeUtil } from './NoteShapeUtil'

/** @public */
export const NoteShape = defineShape('note', {
	util: NoteShapeUtil,
	props: noteShapeProps,
	migrations: noteShapeMigrations,
	tool: NoteShapeTool,
})
