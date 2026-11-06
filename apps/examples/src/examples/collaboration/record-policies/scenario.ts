import { ComponentType } from 'react'
import {
	CustomRecordInfo,
	Editor,
	PolicyContext,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TLParentId,
	TLPolicies,
	TLShape,
	TldrawProps,
	atom,
	createUserId,
	defaultBindingUtils,
	defaultShapeUtils,
	createPolicyActor,
	isOwnedBy,
	mayUpdate,
} from 'tldraw'

export interface Person {
	id: string
	name: string
	role: string
	actions: string[]
}

// One use case: who takes part, the rules, and what the panes show. The editors and the room both
// build their schema from `policies`, `records`, and `shapeUtils`.
export interface Scenario {
	id: string
	title: string
	rules: string
	tryThis: string
	people: [Person, Person, Person]
	policies: TLPolicies
	records?: Record<string, CustomRecordInfo>
	shapeUtils?: TLAnyShapeUtilConstructor[]
	// Each pane seeds the records that its person may create, so seeding obeys the same rules.
	seed?(editor: Editor, person: Person): void
	Controls?: ComponentType<{ editor: Editor; person: Person; scenario: Scenario }>
	tldrawProps?(person: Person, scenario: Scenario): Partial<TldrawProps>
}

// What each person may do now. A host would keep this in its database. Both the room's
// `getActor` and the editors read it, so a change applies to the next push without a reconnect.
const access = atom<Record<string, string[]>>('access', {})

export function getActions(person: Person) {
	return access.get()[person.id] ?? person.actions
}

export function setActions(person: Person, actions: string[]) {
	access.update((all) => ({ ...all, [person.id]: actions }))
}

export function actorFor(person: Person) {
	return createPolicyActor({ id: person.id, actions: getActions(person) })
}

export function pageOf(shape: TLShape, get: PolicyContext['get']) {
	let parentId: TLParentId | undefined = shape.parentId
	for (let i = 0; i < 100 && parentId; i++) {
		if (parentId.startsWith('page:')) return parentId
		parentId = (get(parentId) as TLShape | undefined)?.parentId
	}
	return undefined
}

export function isInside(shape: TLShape, ancestorId: string, get: PolicyContext['get']) {
	let parentId: TLParentId | undefined = shape.parentId
	for (let i = 0; i < 100 && parentId; i++) {
		if (parentId === ancestorId) return true
		parentId = (get(parentId) as TLShape | undefined)?.parentId
	}
	return false
}

export function ownsShape(ctx: PolicyContext, shape: TLShape) {
	return isOwnedBy(ctx.actor, shape.meta.ownerId)
}

// A parent the actor may put a shape in: a page that they may read, or a shape that they may
// change. Without the read check, a student could move a shape onto a hidden page.
export function mayParent(ctx: PolicyContext, parentId: TLParentId) {
	const parent = ctx.get(parentId)
	if (!parent) return false
	return parentId.startsWith('page:')
		? ctx.authorize({ verb: 'read', record: parent })
		: mayUpdate(ctx, parent)
}

// Everyone writes their own user record (name and color for attribution), nobody else's.
const ownUserRecord: TLPolicies['user'] = {
	create: (ctx) => ctx.base() || ctx.next.id === createUserId(ctx.actor.id ?? ''),
	update: (ctx) => ctx.base() || ctx.next.id === createUserId(ctx.actor.id ?? ''),
}

// The same schema options for the editors (`useSync`) and the room. Cached, because `useSync`
// rebuilds its schema when the options change.
const schemaOptions = new Map<Scenario, SchemaOptions>()
export function schemaOptionsFor(scenario: Scenario): SchemaOptions {
	let opts = schemaOptions.get(scenario)
	if (!opts) schemaOptions.set(scenario, (opts = buildSchemaOptions(scenario)))
	return opts
}

interface SchemaOptions {
	shapeUtils: TLAnyShapeUtilConstructor[]
	bindingUtils: readonly TLAnyBindingUtilConstructor[]
	records?: Record<string, CustomRecordInfo>
	policies: TLPolicies
}

function buildSchemaOptions(scenario: Scenario): SchemaOptions {
	return {
		shapeUtils: [...defaultShapeUtils, ...(scenario.shapeUtils ?? [])],
		bindingUtils: defaultBindingUtils,
		records: scenario.records,
		policies: { user: ownUserRecord, ...scenario.policies },
	}
}
