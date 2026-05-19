import * as tlschema from '@tldraw/tlschema'
import {
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
	RecordProps,
	TLBaseShape,
	TLSchema,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// -----------------------------------------------------------------------------
// githubIssue — a card on the board that represents one GitHub issue.
// Shape ID is deterministic (createShapeId(`gh-issue/${owner}/${repo}/${number}`))
// so the sync script can find or upsert without a separate mapping table.
// -----------------------------------------------------------------------------

export interface GithubIssueLabel {
	name: string
	color: string
}

export interface GithubIssueShapeProps {
	w: number
	h: number
	owner: string
	repo: string
	number: number
	title: string
	state: 'open' | 'closed'
	stateReason: 'completed' | 'not_planned' | 'reopened' | null
	labels: GithubIssueLabel[]
	assignee: string | null
	url: string
}

export type GithubIssueShape = TLBaseShape<'githubIssue', GithubIssueShapeProps>

const githubLabelValidator = T.object<GithubIssueLabel>({
	name: T.string,
	color: T.string,
})

export const githubIssueShapeProps: RecordProps<GithubIssueShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	owner: T.string,
	repo: T.string,
	number: T.positiveInteger,
	title: T.string,
	state: T.literalEnum('open', 'closed'),
	stateReason: T.literalEnum('completed', 'not_planned', 'reopened').nullable(),
	labels: T.arrayOf(githubLabelValidator),
	assignee: T.string.nullable(),
	url: T.string,
}

const GithubIssueVersions = createShapePropsMigrationIds('githubIssue', {
	Initial: 1,
})

export const githubIssueShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: GithubIssueVersions.Initial,
			up: () => {
				// initial version — nothing to migrate
			},
			down: () => {
				// no-op
			},
		},
	],
})

// -----------------------------------------------------------------------------
// githubColumn — a kanban column. The sync script hit-tests issue card centers
// against each column's bounds to decide what state the issue should be in.
// -----------------------------------------------------------------------------

/**
 * `state` is the GitHub state this column represents.
 *  - 'open'                : issue.state === 'open'
 *  - 'closed:completed'    : issue.state === 'closed', state_reason === 'completed'
 *  - 'closed:not_planned'  : issue.state === 'closed', state_reason === 'not_planned'
 */
export type GithubColumnState = 'open' | 'closed:completed' | 'closed:not_planned'

export interface GithubColumnShapeProps {
	w: number
	h: number
	name: string
	state: GithubColumnState
	color: string
}

export type GithubColumnShape = TLBaseShape<'githubColumn', GithubColumnShapeProps>

export const githubColumnShapeProps: RecordProps<GithubColumnShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	name: T.string,
	state: T.literalEnum('open', 'closed:completed', 'closed:not_planned'),
	color: T.string,
}

const GithubColumnVersions = createShapePropsMigrationIds('githubColumn', {
	Initial: 1,
})

export const githubColumnShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: GithubColumnVersions.Initial,
			up: () => {},
			down: () => {},
		},
	],
})

// -----------------------------------------------------------------------------
// githubLabel — a "label shower" chip on the board. Dragging an issue card on
// top of one of these applies the corresponding GitHub label.
// -----------------------------------------------------------------------------

export interface GithubLabelShapeProps {
	w: number
	h: number
	owner: string
	repo: string
	name: string
	color: string
}

export type GithubLabelShape = TLBaseShape<'githubLabel', GithubLabelShapeProps>

export const githubLabelShapeProps: RecordProps<GithubLabelShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	owner: T.string,
	repo: T.string,
	name: T.string,
	color: T.string,
}

const GithubLabelVersions = createShapePropsMigrationIds('githubLabel', {
	Initial: 1,
})

export const githubLabelShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: GithubLabelVersions.Initial,
			up: () => {},
			down: () => {},
		},
	],
})

// -----------------------------------------------------------------------------
// notionProject — a card on the board representing one Notion database page.
// -----------------------------------------------------------------------------

export interface NotionProjectShapeProps {
	w: number
	h: number
	pageId: string
	title: string
	status: string | null
	url: string
}

export type NotionProjectShape = TLBaseShape<'notionProject', NotionProjectShapeProps>

export const notionProjectShapeProps: RecordProps<NotionProjectShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	pageId: T.string,
	title: T.string,
	status: T.string.nullable(),
	url: T.string,
}

const NotionProjectVersions = createShapePropsMigrationIds('notionProject', { Initial: 1 })

export const notionProjectShapeMigrations = createShapePropsMigrationSequence({
	sequence: [{ id: NotionProjectVersions.Initial, up: () => {}, down: () => {} }],
})

// -----------------------------------------------------------------------------
// hubspotCompany — a card representing a HubSpot company that has at least
// one active deal.
// -----------------------------------------------------------------------------

export interface HubspotCompanyShapeProps {
	w: number
	h: number
	companyId: string
	name: string
	domain: string | null
	activeDealCount: number
	url: string
}

export type HubspotCompanyShape = TLBaseShape<'hubspotCompany', HubspotCompanyShapeProps>

export const hubspotCompanyShapeProps: RecordProps<HubspotCompanyShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	companyId: T.string,
	name: T.string,
	domain: T.string.nullable(),
	activeDealCount: T.positiveInteger,
	url: T.string,
}

const HubspotCompanyVersions = createShapePropsMigrationIds('hubspotCompany', { Initial: 1 })

export const hubspotCompanyShapeMigrations = createShapePropsMigrationSequence({
	sequence: [{ id: HubspotCompanyVersions.Initial, up: () => {}, down: () => {} }],
})

// -----------------------------------------------------------------------------
// Factory: a single schema record to pass into createTLSchema({ shapes }).
// -----------------------------------------------------------------------------

export const githubShapeSchemas = {
	githubIssue: { props: githubIssueShapeProps, migrations: githubIssueShapeMigrations },
	githubColumn: { props: githubColumnShapeProps, migrations: githubColumnShapeMigrations },
	githubLabel: { props: githubLabelShapeProps, migrations: githubLabelShapeMigrations },
	notionProject: { props: notionProjectShapeProps, migrations: notionProjectShapeMigrations },
	hubspotCompany: { props: hubspotCompanyShapeProps, migrations: hubspotCompanyShapeMigrations },
} as const

/**
 * The single source of truth for dotcom's TL schema. Used by both the client
 * and the sync-worker so they agree on the shape catalog (defaults + the
 * github-integration shapes). Always call this instead of createTLSchema().
 *
 * Note: we import tlschema via a namespace and read `defaultShapeSchemas` at
 * call time rather than at module-evaluation time. Bundlers (Vite in
 * particular) can interleave module evaluation such that a top-level spread
 * of `defaultShapeSchemas` produces an empty object — and a schema missing
 * the arrow shape's migrations is unusable because the arrow binding
 * migration depends on `com.tldraw.shape.arrow/4`.
 */
export function createDotcomTLSchema(): TLSchema {
	const defaults = tlschema.defaultShapeSchemas
	if (!defaults || !defaults.arrow) {
		throw new Error(
			'createDotcomTLSchema: defaultShapeSchemas not yet initialized. ' +
				'This is a module-evaluation-order issue — make sure dotcom-shared is ' +
				'imported after @tldraw/tlschema has finished evaluating.'
		)
	}
	return tlschema.createTLSchema({
		shapes: { ...defaults, ...githubShapeSchemas },
	})
}

// Make the type system aware of the custom shapes registered above, so
// BaseBoxShapeUtil<GithubIssueShape> can resolve against TLGlobalShapePropsMap.
declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		githubIssue: GithubIssueShapeProps
		githubColumn: GithubColumnShapeProps
		githubLabel: GithubLabelShapeProps
		notionProject: NotionProjectShapeProps
		hubspotCompany: HubspotCompanyShapeProps
	}
}
