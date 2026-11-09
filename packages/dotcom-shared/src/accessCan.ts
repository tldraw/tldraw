import { TLRecordChange } from '@tldraw/tlschema'
import { TLAccessGrant } from './accessGrant'

// SPIKE: what a session can do. A grant lists capabilities as `record:action[:detail]`, and a
// trailing `:*` covers everything under that prefix. The room and the client both ask judgeChange.
//
//   shape:create          create shapes of any colour
//   shape:create:red      create shapes that are red, or recolour a shape to red
//   shape:edit            change existing shapes
//   shape:delete          delete shapes
//   page:create|edit|delete
//   grants:manage         change grants
//
// Shapes and pages are limited to the grant's `pages` (`*` means every page). Records with no
// capability here, like assets and the document, are not judged.

export const TEACHER_CAN = ['shape:*', 'page:*', 'grants:manage']
export const TEACHER_PAGES = ['*']

export function grantCan(grant: Pick<TLAccessGrant, 'can'> | undefined, needed: string) {
	return !!grant?.can.some(
		(can) => can === needed || (can.endsWith(':*') && needed.startsWith(can.slice(0, -1)))
	)
}

export function grantCoversPage(grant: Pick<TLAccessGrant, 'pages'> | undefined, pageId: string) {
	return !!grant && (grant.pages.includes('*') || grant.pages.includes(pageId))
}

// The colours a grant can create, or null when any colour is fine.
export function allowedColours(grant: Pick<TLAccessGrant, 'can'> | undefined): string[] | null {
	if (grantCan(grant, 'shape:create')) return null
	const prefix = 'shape:create:'
	return (grant?.can ?? [])
		.filter((can) => can.startsWith(prefix) && !can.endsWith('*'))
		.map((can) => can.slice(prefix.length))
}

const WHAT: Record<string, string> = {
	'shape:create': 'create shapes',
	'shape:edit': 'edit shapes',
	'shape:delete': 'delete shapes',
	'page:create': 'create pages',
	'page:edit': 'edit pages',
	'page:delete': 'delete pages',
	'grants:manage': 'change permissions',
}

function needs(capability: string) {
	return `You can't ${WHAT[capability] ?? capability} (needs ${capability})`
}

export interface JudgeContext {
	/**
	 * The page a shape or binding is on, as the change found it (`prev`) or leaves it (`next`), or
	 * null when it can't be worked out.
	 */
	pageOf(record: any, end: 'prev' | 'next'): string | null
	/** What to do with a record whose page can't be worked out: the room refuses, the client lets it be. */
	unresolved: 'refuse' | 'allow'
}

// Returns why a session with this grant can't make this change, or null when it can.
export function judgeChange(
	grant: TLAccessGrant | undefined,
	change: TLRecordChange<any>,
	ctx: JudgeContext
): string | null {
	const record = change.next ?? change.prev

	const pageProblem = () => {
		for (const end of ['prev', 'next'] as const) {
			const record = change[end]
			if (!record) continue
			const pageId = ctx.pageOf(record, end)
			if (pageId === null) {
				if (ctx.unresolved === 'refuse') return "This shape's page can't be found"
				continue
			}
			if (!grantCoversPage(grant, pageId)) return "You can't change this page"
		}
		return null
	}

	switch (record.typeName) {
		case 'access-grant':
		case 'access-policy':
			return grantCan(grant, 'grants:manage') ? null : needs('grants:manage')

		case 'page': {
			const capability =
				change.type === 'create'
					? 'page:create'
					: change.type === 'update'
						? 'page:edit'
						: 'page:delete'
			if (!grantCan(grant, capability)) return needs(capability)
			if (change.type !== 'create' && !grantCoversPage(grant, record.id)) {
				return "You can't change this page"
			}
			return null
		}

		case 'shape': {
			const colour = record.props?.color as string | undefined
			const previousColour =
				change.type === 'update' ? (change.prev.props?.color as string) : undefined
			const colourOk = (c: string) =>
				grantCan(grant, 'shape:create') || grantCan(grant, `shape:create:${c}`)

			if (change.type === 'create') {
				// a grant limited to some colours can create shapes of the colours it names
				if (!grantCan(grant, 'shape:create') && !(colour !== undefined && colourOk(colour))) {
					return colour !== undefined && (allowedColours(grant)?.length ?? 0) > 0
						? `You can't use ${colour} shapes (needs shape:create:${colour})`
						: needs('shape:create')
				}
			} else if (change.type === 'update') {
				if (!grantCan(grant, 'shape:edit')) return needs('shape:edit')
				if (colour !== undefined && colour !== previousColour && !colourOk(colour)) {
					return `You can't use ${colour} shapes (needs shape:create:${colour})`
				}
			} else if (!grantCan(grant, 'shape:delete')) {
				return needs('shape:delete')
			}
			return pageProblem()
		}

		case 'binding':
			return grantCan(grant, 'shape:edit') ? pageProblem() : needs('shape:edit')

		default:
			return null
	}
}
