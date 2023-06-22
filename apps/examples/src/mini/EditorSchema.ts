import { BaseRecord, IdOf, RecordId, UnknownRecord, createRecordType } from '@tldraw/store'

import { T } from '@tldraw/validate'

export function idValidator<R extends UnknownRecord>(
	prefix: IdOf<R>['__type__']['typeName']
): T.Validator<R['id']> {
	const _prefix = `${prefix}:`
	return new T.Validator((value: unknown) => {
		if (!(typeof value === 'string' && value.startsWith(_prefix))) {
			throw new T.ValidationError('Uh oh')
		}

		return value as R['id']
	})
}

// Page

interface PageRecord extends BaseRecord<'page', PageRecordId> {
	name: string
}

type PageRecordId = RecordId<PageRecord>

export const pageRecordType = createRecordType<PageRecord>('page', {
	scope: 'document',
}).withDefaultProperties(() => ({
	name: 'Page',
}))

// Shape

interface ShapeRecord extends BaseRecord<'shape', ShapeRecordId> {
	pageId: PageRecordId
	x: number
	y: number
}

type ShapeRecordId = RecordId<ShapeRecord>

export const shapeRecordType = createRecordType<ShapeRecord>('shape', {
	scope: 'document',
}).withDefaultProperties(() => ({
	x: 0,
	y: 0,
}))

// Page State

interface PageStateRecord extends BaseRecord<'page-state', PageStateRecordId> {
	selectedShapeIds: ShapeRecordId[]
}

type PageStateRecordId = RecordId<PageStateRecord>

export const pageStateRecordType = createRecordType<PageStateRecord>('page-state', {
	scope: 'session',
	validator: T.object({
		id: idValidator<PageStateRecord>('page-state'),
		typeName: T.literal('page-state'),
		selectedShapeIds: T.arrayOf(idValidator<ShapeRecord>('shape')),
	}),
}).withDefaultProperties(() => ({
	selectedShapeIds: [],
}))

// Editor State

interface EditorStateRecord extends BaseRecord<'editor-state', EditorStateRecordId> {
	currentPageId: PageRecordId
}

type EditorStateRecordId = RecordId<EditorStateRecord>

export const editorStateRecordType = createRecordType<EditorStateRecord>('editor-state', {
	scope: 'session',
	validator: T.object({
		id: idValidator<EditorStateRecord>('editor-state'),
		typeName: T.literal('editor-state'),
		currentPageId: idValidator<PageRecord>('page'),
	}),
})

export type EditorRecord = EditorStateRecord | PageStateRecord | PageRecord | ShapeRecord
