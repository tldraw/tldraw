import {
	GithubColumnShape,
	GithubIssueShape,
	GithubLabelShape,
	HubspotCompanyShape,
	NotionProjectShape,
	githubColumnShapeMigrations,
	githubColumnShapeProps,
	githubIssueShapeMigrations,
	githubIssueShapeProps,
	githubLabelShapeMigrations,
	githubLabelShapeProps,
	hubspotCompanyShapeMigrations,
	hubspotCompanyShapeProps,
	notionProjectShapeMigrations,
	notionProjectShapeProps,
} from '@tldraw/dotcom-shared'
import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, defaultShapeUtils } from 'tldraw'
import './githubShapes.css'

function rectPath(w: number, h: number) {
	const path = new Path2D()
	path.rect(0, 0, w, h)
	return path
}

function pickReadableTextColor(hex: string): string {
	const clean = hex.replace(/^#/, '')
	if (clean.length !== 6) return '#1f2328'
	const r = parseInt(clean.slice(0, 2), 16)
	const g = parseInt(clean.slice(2, 4), 16)
	const b = parseInt(clean.slice(4, 6), 16)
	const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
	return luma > 0.6 ? '#1f2328' : 'white'
}

// -----------------------------------------------------------------------------
// IssueShapeUtil — a card on the board representing a single GitHub issue.
// -----------------------------------------------------------------------------

export class GithubIssueShapeUtil extends BaseBoxShapeUtil<GithubIssueShape> {
	static override type = 'githubIssue' as const
	static override props = githubIssueShapeProps
	static override migrations = githubIssueShapeMigrations

	override getDefaultProps(): GithubIssueShape['props'] {
		return {
			w: 260,
			h: 120,
			owner: '',
			repo: '',
			number: 1,
			title: '',
			state: 'open',
			stateReason: null,
			labels: [],
			assignee: null,
			url: '',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}

	override getGeometry(shape: GithubIssueShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override component(shape: GithubIssueShape) {
		const { number, title, state, stateReason, labels, assignee, url } = shape.props
		const stateModifier =
			state === 'open'
				? 'gh-issue-card__state--open'
				: stateReason === 'not_planned'
					? 'gh-issue-card__state--closed-not-planned'
					: 'gh-issue-card__state--closed-completed'
		return (
			<HTMLContainer>
				<div className="gh-issue-card">
					<div className="gh-issue-card__header">
						<span className={`gh-issue-card__state ${stateModifier}`}>{state}</span>
						<a
							className="gh-issue-card__number"
							href={url || undefined}
							target="_blank"
							rel="noreferrer"
							onPointerDown={(e) => e.stopPropagation()}
						>
							#{number}
						</a>
					</div>
					<div className="gh-issue-card__title">{title || '(no title)'}</div>
					{labels.length > 0 && (
						<div className="gh-issue-card__labels">
							{labels.slice(0, 6).map((l) => (
								<span
									key={l.name}
									className="gh-issue-card__label"
									title={l.name}
									style={{ background: `#${l.color || 'd0d7de'}`, color: pickReadableTextColor(l.color) }}
								>
									{l.name}
								</span>
							))}
						</div>
					)}
					{assignee && <div className="gh-issue-card__assignee">@{assignee}</div>}
				</div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: GithubIssueShape) {
		return rectPath(shape.props.w, shape.props.h)
	}
}

// -----------------------------------------------------------------------------
// ColumnShapeUtil — a labeled rectangle that represents a kanban column.
// -----------------------------------------------------------------------------

export class GithubColumnShapeUtil extends BaseBoxShapeUtil<GithubColumnShape> {
	static override type = 'githubColumn' as const
	static override props = githubColumnShapeProps
	static override migrations = githubColumnShapeMigrations

	override getDefaultProps(): GithubColumnShape['props'] {
		return {
			w: 320,
			h: 720,
			name: 'Open',
			state: 'open',
			color: '#22c55e',
		}
	}

	override canEdit() {
		return false
	}

	override getGeometry(shape: GithubColumnShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false })
	}

	override component(shape: GithubColumnShape) {
		const stateModifier =
			shape.props.state === 'open'
				? 'gh-column--open'
				: shape.props.state === 'closed:completed'
					? 'gh-column--closed-completed'
					: 'gh-column--closed-not-planned'
		return (
			<HTMLContainer>
				<div className={`gh-column ${stateModifier}`}>
					<div className="gh-column__header">{shape.props.name}</div>
				</div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: GithubColumnShape) {
		return rectPath(shape.props.w, shape.props.h)
	}
}

// -----------------------------------------------------------------------------
// LabelShapeUtil — a "label sprinkler" chip.
// -----------------------------------------------------------------------------

export class GithubLabelShapeUtil extends BaseBoxShapeUtil<GithubLabelShape> {
	static override type = 'githubLabel' as const
	static override props = githubLabelShapeProps
	static override migrations = githubLabelShapeMigrations

	override getDefaultProps(): GithubLabelShape['props'] {
		return {
			w: 160,
			h: 32,
			owner: '',
			repo: '',
			name: 'label',
			color: 'd0d7de',
		}
	}

	override canEdit() {
		return false
	}

	override getGeometry(shape: GithubLabelShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override component(shape: GithubLabelShape) {
		return (
			<HTMLContainer>
				<div
					className="gh-label"
					title={shape.props.name}
					style={{
						background: `#${shape.props.color}`,
						color: pickReadableTextColor(shape.props.color),
					}}
				>
					{shape.props.name}
				</div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: GithubLabelShape) {
		return rectPath(shape.props.w, shape.props.h)
	}
}

// -----------------------------------------------------------------------------
// NotionProjectShapeUtil — a card representing a Notion database page.
// -----------------------------------------------------------------------------

export class NotionProjectShapeUtil extends BaseBoxShapeUtil<NotionProjectShape> {
	static override type = 'notionProject' as const
	static override props = notionProjectShapeProps
	static override migrations = notionProjectShapeMigrations

	override getDefaultProps(): NotionProjectShape['props'] {
		return {
			w: 260,
			h: 100,
			pageId: '',
			title: '',
			status: null,
			url: '',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}

	override getGeometry(shape: NotionProjectShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override component(shape: NotionProjectShape) {
		const { title, status, url } = shape.props
		return (
			<HTMLContainer>
				<div className="notion-project">
					<div className="notion-project__header">
						<span className="notion-project__provider">notion</span>
						{status && <span className="notion-project__status">{status}</span>}
					</div>
					<a
						className="notion-project__title"
						href={url || undefined}
						target="_blank"
						rel="noreferrer"
						onPointerDown={(e) => e.stopPropagation()}
					>
						{title || '(untitled)'}
					</a>
				</div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: NotionProjectShape) {
		return rectPath(shape.props.w, shape.props.h)
	}
}

// -----------------------------------------------------------------------------
// HubspotCompanyShapeUtil — a card representing a HubSpot company that has
// at least one active deal.
// -----------------------------------------------------------------------------

export class HubspotCompanyShapeUtil extends BaseBoxShapeUtil<HubspotCompanyShape> {
	static override type = 'hubspotCompany' as const
	static override props = hubspotCompanyShapeProps
	static override migrations = hubspotCompanyShapeMigrations

	override getDefaultProps(): HubspotCompanyShape['props'] {
		return {
			w: 260,
			h: 96,
			companyId: '',
			name: '',
			domain: null,
			activeDealCount: 1,
			url: '',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}

	override getGeometry(shape: HubspotCompanyShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override component(shape: HubspotCompanyShape) {
		const { name, domain, activeDealCount, url } = shape.props
		return (
			<HTMLContainer>
				<div className="hubspot-company">
					<div className="hubspot-company__header">
						<span className="hubspot-company__provider">hubspot</span>
						<span className="hubspot-company__deals">
							{activeDealCount} {activeDealCount === 1 ? 'deal' : 'deals'}
						</span>
					</div>
					<a
						className="hubspot-company__name"
						href={url || undefined}
						target="_blank"
						rel="noreferrer"
						onPointerDown={(e) => e.stopPropagation()}
					>
						{name || '(unnamed company)'}
					</a>
					{domain && <div className="hubspot-company__domain">{domain}</div>}
				</div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: HubspotCompanyShape) {
		return rectPath(shape.props.w, shape.props.h)
	}
}

export const githubShapeUtils = [
	GithubIssueShapeUtil,
	GithubColumnShapeUtil,
	GithubLabelShapeUtil,
	NotionProjectShapeUtil,
	HubspotCompanyShapeUtil,
]

/**
 * Use this anywhere a non-merging API expects shape utils (notably `useSync`).
 * `<Tldraw shapeUtils={...}>` itself merges with defaults internally, but
 * `useSync` does not — passing only the github utils there leaves arrow,
 * geo, etc. out of the schema, and `com.tldraw.binding.arrow/1` then fails
 * its dependsOn lookup for `com.tldraw.shape.arrow/4`.
 */
export const dotcomShapeUtils = [...defaultShapeUtils, ...githubShapeUtils]
