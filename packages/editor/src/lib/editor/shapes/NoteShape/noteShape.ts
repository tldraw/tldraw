import { defineShape } from '../../../config/defineShape'
import { NoteShapeTool } from './NoteShapeTool/NoteShapeTool'
import { NoteShapeUtil } from './NoteShapeUtil/NoteShapeUtil'
import { noteShapeMigrations } from './noteShapeMigrations'
import { TLNoteShape } from './noteShapeTypes'
import { noteShapeValidator } from './noteShapeValidator'

/** @public */
export const noteShape = defineShape<TLNoteShape>({
	type: 'note',
	util: NoteShapeUtil,
	tool: NoteShapeTool,
	migrations: noteShapeMigrations,
	validator: noteShapeValidator,
})
