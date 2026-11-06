import { PageRecordType, toRichText } from 'tldraw'
import { Scenario, pageOf } from './scenario'

// The room's first page becomes the Design page.
const DESIGN = PageRecordType.createId('page')
const COPY = PageRecordType.createId('copy')

// `pages:write:<pageId>` lets an actor change the shapes on that page only. Everyone reads every
// page. Only `document:write` adds, renames, or deletes pages (the default policy).
export const pageAccess: Scenario = {
	id: 'page-access',
	title: 'Edit access per page',
	rules:
		'Dee edits the Design page only, and Will edits the Copy page only. The lead edits everything and is the only one who changes pages.',
	tryThis:
		'As Dee, draw on Design, then go to Copy and try to change Will’s text. Try to rename a page as Dee.',
	people: [
		{ id: 'lead', name: 'Lead', role: 'editor', actions: ['document:write'] },
		{ id: 'dee', name: 'Dee', role: 'designer', actions: [`pages:write:${DESIGN}`] },
		{ id: 'will', name: 'Will', role: 'writer', actions: [`pages:write:${COPY}`] },
	],
	policies: {
		shape: {
			create: (ctx) => ctx.base() || ctx.can(`pages:write:${pageOf(ctx.next, ctx.get)}`),
			// Both pages are checked, so a shape cannot be moved to a page the actor may not edit.
			update: (ctx) =>
				ctx.base() ||
				(ctx.can(`pages:write:${pageOf(ctx.prev, ctx.get)}`) &&
					ctx.can(`pages:write:${pageOf(ctx.next, ctx.get)}`)),
			delete: (ctx) => ctx.base() || ctx.can(`pages:write:${pageOf(ctx.prev, ctx.get)}`),
		},
	},
	seed(editor, person) {
		if (person.id !== 'lead' || editor.getPage(COPY)) return
		editor.run(() => {
			editor.renamePage(DESIGN, 'Design')
			editor.createPage({ id: COPY, name: 'Copy' })
			editor.createShapes([
				{ type: 'geo', parentId: DESIGN, x: 0, y: 0, props: { w: 240, h: 160, geo: 'ellipse' } },
				{
					type: 'text',
					parentId: COPY,
					x: 0,
					y: 0,
					props: { richText: toRichText('Headline: draw together') },
				},
			])
		})
	},
}
