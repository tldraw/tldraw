import { toRichText, useValue } from 'tldraw'
import { Scenario, getActions, setActions } from './scenario'

const EDIT = ['document:write']

// No host rules at all: the default policy already says that every write needs `document:write`.
// A share link only decides which actions its holder gets.
export const shareLinks: Scenario = {
	id: 'share-links',
	title: 'Share links',
	rules:
		'The owner and an edit link write. A view link reads only. The owner can turn the edit link into a view link while the guest is connected.',
	tryThis:
		'As Vic, try to draw or move a shape. As the owner, press “Make Alex view only”, then try to draw as Alex: the next change is rejected without a reconnect.',
	people: [
		{ id: 'owner', name: 'Owner', role: 'owner', actions: EDIT },
		{ id: 'alex', name: 'Alex', role: 'edit link', actions: EDIT },
		{ id: 'vic', name: 'Vic', role: 'view link', actions: [] },
	],
	policies: {},
	seed(editor, person) {
		if (person.id !== 'owner' || editor.getCurrentPageShapeIds().size > 0) return
		editor.createShapes([
			{ type: 'geo', x: 0, y: 0, props: { w: 200, h: 120, richText: toRichText('Shared board') } },
			{ type: 'note', x: 260, y: 0, props: { richText: toRichText('Anyone with edit access') } },
		])
	},
	Controls({ person, scenario }) {
		const alex = scenario.people[1]
		const canEdit = useValue('alex can edit', () => getActions(alex).length > 0, [alex])
		if (person.id !== 'owner') return null
		return (
			<button onClick={() => setActions(alex, canEdit ? [] : EDIT)}>
				{canEdit ? 'Make Alex view only' : 'Let Alex edit'}
			</button>
		)
	},
}
