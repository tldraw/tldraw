import { composeRules } from './compose'
import { commentRules, userRecordRules } from './presets'
import { defineRules } from './rules'

/**
 * Reference rule sets for the use cases in the permissions research. The sync-core backtests run
 * against these, and the "Permission rules" example in `apps/examples` shows each one live. They
 * use these user facts, which a host would fill from its own auth:
 *
 * - `user.id`: stable id, or null for anonymous.
 * - `user.access`: `'none' | 'view' | 'comment' | 'edit'` (share links and file tiers).
 * - `user.role`: `'teacher' | 'student' | 'agent' | …` (app roles).
 * - `user.teams`: team ids (team-only pages).
 * - `user.area`: the frame id an agent may work in.
 *
 * @public
 */
export const useCaseRules = {
	/**
	 * Dotcom tiers. A share link gives `access` to anyone with it: view, comment, or edit. Comment
	 * rules come from {@link commentRules}, so "comment-only" needs no new code anywhere.
	 */
	shareLinks: composeRules(
		defineRules({
			version: 1,
			let: { canView: "user.access in ['view', 'comment', 'edit']" },
			actions: {
				'file:rename': "user.access == 'edit' && exists(user.id)",
				'file:share': "user.role == 'owner'",
			},
			default: {
				read: 'canView',
				write: { allow: "user.access == 'edit'", message: 'You can only view this file' },
			},
		}),
		commentRules,
		userRecordRules
	),

	/**
	 * Classroom. Students draw only with the student tools, only inside the frame assigned to
	 * them, and change only shapes they made. Teachers do anything. A teacher can lock the lesson,
	 * which is one field on the document: every student's tools turn off at once, because the
	 * rules read that field.
	 */
	classroom: composeRules(
		defineRules({
			version: 1,
			let: {
				isTeacher: "user.role == 'teacher'",
				isStudent: "user.role == 'student'",
				locked: "get('document:document').meta.locked == true",
				studentTool: "next.type in ['draw', 'geo', 'text', 'note', 'arrow']",
				inMyFrame: 'ancestors(next).some(a => a.meta.assignee == user.id)',
				mine: 'prev.meta.ownerId == user.id',
			},
			actions: { 'lesson:lock': 'isTeacher' },
			types: {
				shape: {
					stamp: { 'meta.ownerId': 'user.id' },
					create: {
						allow: 'isTeacher || (isStudent && !locked && studentTool && inMyFrame)',
						message: 'Draw inside your own frame, with the student tools',
					},
					update: {
						// both ends of the move: you own it now, and it stays in your frame
						allow: 'isTeacher || (isStudent && !locked && mine && inMyFrame)',
						message: 'You can only change your own shapes, inside your frame',
					},
					delete: {
						allow: 'isTeacher || (isStudent && !locked && mine)',
						message: 'Not your shape',
					},
				},
				// An arrow's binding follows the arrow: bind only arrows you may edit.
				binding: {
					create: 'canEdit(get(next.fromId))',
					update: 'canEdit(get(next.fromId))',
					delete: 'canEdit(get(prev.fromId)) || canEdit(get(prev.toId))',
				},
			},
			default: {
				read: 'true',
				write: { allow: 'isTeacher', message: 'Only the teacher can do that' },
			},
		}),
		userRecordRules
	),

	/**
	 * Team-only pages. A page with `meta.team` is visible only to that team, and so are its
	 * shapes, its bindings, and the cursors of the people on it. The room never sends them.
	 */
	teamPages: composeRules(
		defineRules({
			version: 1,
			let: {
				pageVisible: '!exists(record.meta.team) || record.meta.team in user.teams',
			},
			types: {
				page: {
					read: 'pageVisible',
					create: 'true',
					update: 'true',
					delete: {
						allow: '!exists(prev.meta.team)',
						message: 'Team pages cannot be deleted here',
					},
				},
				shape: { read: 'canRead(page(record))' },
				binding: { read: 'canRead(get(record.fromId))' },
				instance_presence: { read: 'canRead(get(record.currentPageId))' },
			},
			default: { read: 'true', write: 'exists(user.id)' },
		}),
		userRecordRules
	),

	/**
	 * Poker and progressive reveal. A card (a shape with `meta.holder`) is visible only to its
	 * holder until the dealer sets `meta.revealed`. Anything inside a frame with `meta.hidden` is
	 * visible only to the dealer until the frame is revealed.
	 */
	reveal: composeRules(
		defineRules({
			version: 1,
			let: {
				isDealer: "user.role == 'dealer'",
				cardVisible:
					'record.meta.holder == null || record.meta.revealed == true || record.meta.holder == user.id',
				frameVisible: '!ancestors(record).some(a => a.meta.hidden == true)',
			},
			actions: { 'cards:reveal': 'isDealer' },
			types: {
				shape: {
					read: 'isDealer || (cardVisible && frameVisible && !(record.meta.hidden == true))',
					update: {
						allow: "isDealer || (onlyChanged('x', 'y', 'rotation') && prev.meta.holder == user.id)",
						message: 'Only the dealer changes the table. You may move your own cards.',
					},
				},
			},
			default: { read: 'true', write: 'isDealer' },
		}),
		userRecordRules
	),

	/**
	 * An agent limited to one frame. It reads only that frame's subtree, creates only text, notes,
	 * and geo shapes there, and can never delete. Human users keep full access.
	 */
	agent: composeRules(
		defineRules({
			version: 1,
			let: {
				isAgent: "user.role == 'agent'",
				inArea: 'record.id == user.area || ancestors(record).some(a => a.id == user.area)',
				nextInArea: 'ancestors(next).some(a => a.id == user.area)',
			},
			types: {
				shape: {
					read: '!isAgent || inArea',
					create: {
						allow: "!isAgent || (nextInArea && next.type in ['text', 'note', 'geo'])",
						message: 'The agent may add text, notes, and boxes in its frame only',
					},
					update: {
						allow: '!isAgent || (nextInArea && prev.meta.ownerId == user.id)',
						message: 'The agent may change only its own shapes, in its frame',
					},
					delete: { allow: '!isAgent', message: 'The agent may not delete' },
					stamp: { 'meta.ownerId': 'user.id' },
				},
				instance_presence: { read: '!isAgent' },
			},
			default: { read: 'true', write: '!isAgent' },
		}),
		userRecordRules
	),
}

/**
 * A plugin's rules travel with the plugin. This poll shape lets anyone with edit access vote, but
 * only by changing their own entry in `props.votes`, and only the poll's creator can edit the
 * question. A host adds it with `composeRules(hostRules, pollPluginRules)`.
 *
 * @public
 */
export const pollPluginRules = {
	actions: { 'poll:create': "user.access == 'edit'" },
	let: {
		isPoll: "(op == 'delete' ? prev : next).type == 'poll'",
		ownVoteOnly: "onlyChanged('props.votes.' + user.id)",
	},
	types: {
		shape: {
			create: "!isPoll || can('poll:create')",
			update: {
				allow: '!isPoll || prev.meta.ownerId == user.id || ownVoteOnly',
				message: 'You can only change your own vote',
			},
		},
	},
}
