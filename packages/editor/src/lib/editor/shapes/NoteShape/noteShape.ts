import { createShape } from '../../../config/createShape'
import { NoteShapeTool } from './NoteShapeTool/NoteShapeTool'
import { NoteShapeUtil } from './NoteShapeUtil/NoteShapeUtil'
import { noteShapeMigrations } from './noteShapeMigrations'
import { TLNoteShape } from './noteShapeTypes'
import { noteShapeValidator } from './noteShapeValidator'

/** @public */
export const noteShape = createShape<TLNoteShape>('note', {
	util: NoteShapeUtil,
	tool: NoteShapeTool,
	migrations: noteShapeMigrations,
	validator: noteShapeValidator,
})
