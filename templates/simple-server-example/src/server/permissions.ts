import type { RecordsDiff, TLCheckDiff, TLCheckResult, TLRecord } from 'tldraw'

// A classroom. The teacher can change everything. A student can change shapes only on the page
// that has the student's name. In a real app, load roles from your database.
const TEACHER = 'teacher'

type Get = (id: string) => TLRecord | undefined

// [1]
function getPageId(record: TLRecord, getParent: Get): string | null {
	let current: TLRecord | undefined = record
	while (current?.typeName === 'shape') {
		if (current.parentId.startsWith('page:')) {
			return current.parentId
		}
		current = getParent(current.parentId)
	}
	return null
}

export function checkDiff(
	diff: RecordsDiff<TLRecord>,
	{ userId, get }: Parameters<TLCheckDiff>[1]
): TLCheckResult {
	if (!userId) {
		return { reason: 'Sign in to edit' }
	}
	if (userId === TEACHER) {
		return null
	}

	// [2]
	const getAfter: Get = (id) => {
		const key = id as TLRecord['id']
		if (diff.removed[key]) {
			return undefined
		}
		return diff.added[key] ?? diff.updated[key]?.[1] ?? get(id)
	}

	function canChangeShapeOn(pageId: string | null) {
		const page = pageId ? get(pageId) : undefined
		return page?.typeName === 'page' && page.name === userId
	}

	// [3]
	for (const record of Object.values(diff.added)) {
		if (record.typeName === 'page') {
			return { reason: 'Only the teacher can add pages' }
		}
		if (record.typeName === 'shape' && !canChangeShapeOn(getPageId(record, getAfter))) {
			return { reason: 'You can only draw on your own page' }
		}
	}
	for (const [from, to] of Object.values(diff.updated)) {
		if (from.typeName === 'page') {
			return { reason: 'Only the teacher can change pages' }
		}
		if (from.typeName === 'shape') {
			if (!canChangeShapeOn(getPageId(from, get))) {
				return { reason: 'You can only change shapes on your own page' }
			}
			if (!canChangeShapeOn(getPageId(to, getAfter))) {
				return { reason: 'You can only move shapes to your own page' }
			}
		}
	}
	for (const record of Object.values(diff.removed)) {
		if (record.typeName === 'page') {
			return { reason: 'Only the teacher can delete pages' }
		}
		if (record.typeName === 'shape' && !canChangeShapeOn(getPageId(record, get))) {
			return { reason: 'You can only delete shapes on your own page' }
		}
	}
	return null
}

/*
[1]
A shape's page is the first page among its ancestors. A shape can be inside a frame or a group,
so walk up the parents.

[2]
`get` reads the document before the change. A new or moved shape can have a parent that the same
change adds, so the page after the change has to be found in the diff first.

[3]
Check both sides of an update. Otherwise a student could move a shape from another page onto
their own page, or from their page onto another page.
*/
