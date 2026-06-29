/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'
import { TlaCtaButton } from '../tla/components/TlaCtaButton/TlaCtaButton'
import dialogStyles from '../tla/components/dialogs/dialogs.module.css'
import inviteStyles from '../tla/components/dialogs/TlaInviteDialog.module.css'
import menuStyles from '../tla/components/tla-menu/menu.module.css'
import sidebarStyles from '../tla/components/TlaSidebar/sidebar.module.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of every button in the dotcom app, rendered together so
 * the styling divergences are visible at a glance. Each specimen renders the
 * real component / real CSS-module class (no reconstruction), inside the app's
 * own theme container so all `--tl-*` / `--tla-*` tokens resolve as in prod.
 *
 * Serves the design-system button work: tldraw/tldraw#9194 (fold TlaCtaButton),
 * #9193 (consolidate button CSS), #9190 (raw buttons). Route: /dev/buttons.
 */

/** One labelled button specimen with a mono caption of its divergent props. */
const Specimen = ({
	label,
	code,
	meta,
	source,
	mock,
	children,
}: {
	label: string
	/** The literal JSX / props used to render this specimen. */
	code?: string
	meta: string
	/** Where this button's styling is defined and which component renders it. */
	source?: string
	/** True when the stage is a representation rather than a live render. */
	mock?: boolean
	children: ReactNode
}): ReactNode => (
	<div className="specimen">
		<span className="specimen__badge" data-mock={mock || undefined}>
			{mock ? 'mock' : 'live'}
		</span>
		<div className="specimen__stage">{children}</div>
		<div className="specimen__label">{label}</div>
		{code && <div className="specimen__code">{code}</div>}
		<div className="specimen__meta">{meta}</div>
		{source && <div className="specimen__source">{source}</div>}
	</div>
)

const Section = ({
	title,
	note,
	api,
	source,
	children,
}: {
	title: string
	note: string
	/** The props the component accepts (its public API). */
	api?: string
	/** Where the component is defined and which files render it. */
	source?: string
	children: ReactNode
}) => (
	<section className="section">
		<h2 className="section__title">{title}</h2>
		<p className="section__note">{note}</p>
		{(api || source) && (
			<div className="section__api">
				{api && (
					<div>
						<span className="k">props</span>
						{api}
					</div>
				)}
				{source && (
					<div>
						<span className="k">source</span>
						{source}
					</div>
				)}
			</div>
		)}
		<div className="grid">{children}</div>
	</section>
)

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			// .tl-container is the editor's flex, full-height, overflow-hidden layout root.
			// Override it so this dev page is a normal scrollable block.
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Button inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Button inventory</h1>
					<p className="page__lede">
						Every button in the dotcom app, rendered together. The point is to see where the styling
						diverges — height, radius, weight, fill mechanism, and hover token are annotated under
						each. Real components and real CSS classes, so divergences are real.
					</p>
				</header>

				{/* The punchline: the divergence matrix. */}
				<section className="section">
					<h2 className="section__title">Divergence matrix</h2>
					<p className="section__note">
						An &ldquo;accent solid button&rdquo; exists in three different geometries (rows 1–3).
					</p>
					<table className="matrix">
						<thead>
							<tr>
								<th>button</th>
								<th>height</th>
								<th>radius</th>
								<th>weight</th>
								<th>fill</th>
								<th>hover</th>
							</tr>
						</thead>
						<tbody>
							{MATRIX.map((r) => (
								<tr key={r[0]} data-accent={r[6] === 'accent' || undefined}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
									<td>{r[3]}</td>
									<td>{r[4]}</td>
									<td>{r[5]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<Section
					title="TlaButton — the app primitive"
					note="One component, prop axes: variant (primary / secondary / cta) × ghost × big. Note that variant='cta' here is the stub: identical to primary except font-weight 600."
					api="variant?: 'primary' | 'secondary' | 'cta', ghost?, big?, isLoading?, icon? (UNUSED — no call site passes it), iconRight? (2 uses), iconRightClassName? (1 use) — plus all native <button> attributes (onClick, disabled, type, …)"
					source="defined in tla/components/TlaButton/TlaButton.tsx · used in ~10 files: WorkspaceSettingsDialog, TlaInviteExpiredDialog, TlaFileShareMenu (export / publish tabs), ErrorPage, StoreErrorScreen, admin, MaybeForceUserRefresh, TlaRootProviders"
				>
					<Specimen
						label="variant='primary'"
						code={`<TlaButton variant="primary">`}
						meta="h32 · r4 · w500 · fill primary · hover primary-hover"
					>
						<TlaButton variant="primary">Continue</TlaButton>
					</Specimen>
					<Specimen
						label="variant='secondary'"
						code={`<TlaButton variant="secondary">`}
						meta="h32 · r4 · w500 · secondary bg + border · hover secondary-hover"
					>
						<TlaButton variant="secondary">Cancel</TlaButton>
					</Specimen>
					<Specimen
						label="variant='cta' (stub)"
						code={`<TlaButton variant="cta">`}
						meta="h32 · r4 · w600 · fill primary · hover primary-hover ⚠ = primary + bold"
					>
						<TlaButton variant="cta">Get started</TlaButton>
					</Specimen>
					<Specimen
						label="variant='primary' big"
						code={`<TlaButton variant="primary" big>`}
						meta="h36 · r6 · w500 — note radius jumps 4→6"
					>
						<TlaButton variant="primary" big>
							Continue
						</TlaButton>
					</Specimen>
					<Specimen
						label="variant='primary' ghost"
						code={`<TlaButton variant="primary" ghost>`}
						meta="transparent · text primary · hover muted halo"
					>
						<TlaButton variant="primary" ghost>
							Continue
						</TlaButton>
					</Specimen>
					<Specimen
						label="variant='secondary' ghost"
						code={`<TlaButton variant="secondary" ghost>`}
						meta="transparent · text secondary · no border"
					>
						<TlaButton variant="secondary" ghost>
							Cancel
						</TlaButton>
					</Specimen>
					<Specimen
						label="isLoading"
						code={`<TlaButton variant="primary" isLoading>`}
						meta="spinner swaps in; onClick suppressed"
					>
						<TlaButton variant="primary" isLoading>
							Saving
						</TlaButton>
					</Specimen>
				</Section>

				<Section
					title="TlaCtaButton — the separate CTA component (#9194)"
					note="A whole second component for the prominent call-to-action. Fills via a ::before pseudo-element (not background-color) so it can layer over the canvas. This is the real CTA — bigger and heavier than TlaButton's cta stub above."
					api="canvas?, secondary? — plus all native <button> attributes. Note: no variant/size/icon props — a different, smaller API than TlaButton, for overlapping intent."
					source="defined in tla/components/TlaCtaButton/TlaCtaButton.tsx · used in 5 files: TlaSignInDialog, TlaLegalAcceptance, TlaEditorTopRightPanel, TlaHistorySnapshotEditor, TlaFileError"
				>
					<Specimen
						label="<TlaCtaButton>"
						code={`<TlaCtaButton>`}
						meta="h36 · r6 (::before) · w600 · pad 0 16 · hover primary-hover"
					>
						<TlaCtaButton>
							<span>Get started</span>
						</TlaCtaButton>
					</Specimen>
					<Specimen
						label="canvas"
						code={`<TlaCtaButton canvas>`}
						meta="+ ::after background halo so it reads over the infinite canvas"
					>
						<TlaCtaButton canvas>
							<span>Share</span>
						</TlaCtaButton>
					</Specimen>
					<Specimen
						label="secondary"
						code={`<TlaCtaButton secondary>`}
						meta="muted ::before + border · text-0 · hover muted-1"
					>
						<TlaCtaButton secondary>
							<span>Maybe later</span>
						</TlaCtaButton>
					</Specimen>
				</Section>

				<Section
					title="Bespoke raw <button>s (#9193 / #9190)"
					note="Hand-styled buttons that never adopted a component, each with its own module CSS. Heights and hover treatments diverge from both TlaButton and each other."
					api="none — these are raw <button> elements with a CSS-module class. No component, no variant/loading/icon props; only native <button> attributes. The styling lives in CSS, not a shared API."
				>
					<Specimen
						label=".sidebarActionButton"
						code={`<button className={styles.sidebarActionButton}>`}
						meta="h36 · no border · gap6 · hover ::after muted-2"
						source="sidebar.module.css · rendered by TlaSidebarSearch, TlaSidebarWorkspaceActions"
					>
						<button className={sidebarStyles.sidebarActionButton}>New file</button>
					</Specimen>
					<Specimen
						label=".sidebarLinkButton"
						code={`<button className={styles.sidebarLinkButton}>`}
						meta="h36 · pad 0 8 · text-0"
						source="sidebar.module.css · rendered by TlaSidebarFeedbackButton"
					>
						<button className={sidebarStyles.sidebarLinkButton}>Give feedback</button>
					</Specimen>
					<Specimen
						label=".sidebarWorkspaceSwitcherTrigger"
						code={`<button className={styles.sidebarWorkspaceSwitcherTrigger}>`}
						meta="h36 · full width"
						source="sidebar.module.css · rendered by TlaSidebarWorkspaceSwitcher"
					>
						<button className={sidebarStyles.sidebarWorkspaceSwitcherTrigger}>Workspace</button>
					</Specimen>
					<Specimen
						label=".inlineButton"
						code={`<button className={styles.inlineButton}>`}
						meta="text · pad 4 0 · w500 · hover UNDERLINE (no fill/height)"
						source="dialogs.module.css · rendered by WorkspaceSettingsDialog"
					>
						<button className={dialogStyles.inlineButton}>Regenerate link</button>
					</Specimen>
					<Specimen
						label=".inlineButton .inlineButtonDanger"
						code={`<button className={cn(styles.inlineButton, styles.inlineButtonDanger)}>`}
						meta="text · color danger · hover underline"
						source="dialogs.module.css · rendered by WorkspaceSettingsDialog"
					>
						<button className={`${dialogStyles.inlineButton} ${dialogStyles.inlineButtonDanger}`}>
							Delete workspace
						</button>
					</Specimen>
					<Specimen
						label=".menuTabsTab"
						code={`<button className={styles.menuTabsTab} data-active>`}
						meta="h40 · tab style · active underline"
						source="tla-menu/menu.module.css · rendered by tla-menu.tsx (TlaMenuTabs)"
					>
						<button className={menuStyles.menuTabsTab} data-active>
							Export
						</button>
					</Specimen>
					<Specimen
						label=".acceptButton"
						code={`<button className={styles.acceptButton}>`}
						meta="width 100% · w500 · cta-hover token (a 4th hover treatment)"
						source="dialogs/TlaInviteDialog.module.css · rendered by TlaInviteDialog"
					>
						<button className={inviteStyles.acceptButton}>Accept invite</button>
					</Specimen>
					<Specimen
						label="global .tla-button-text"
						code={`<button className="tla-button-text">`}
						meta="shared text-button class (cookie consent, etc.)"
						source="global class in tla/styles/tla.css · e.g. rendered by TlaCookieConsent"
					>
						<button className="tla-button-text">Opt out</button>
					</Specimen>
				</Section>

			</div>
		</div>
	)
}

const MATRIX: ReadonlyArray<readonly [string, string, string, string, string, string, string]> = [
	['TlaButton primary', '32px', 'r1 / 4px', '500', 'background-color', 'primary-hover', 'accent'],
	[
		'TlaButton cta (stub)',
		'32px',
		'r1 / 4px',
		'600',
		'background-color',
		'primary-hover',
		'accent',
	],
	['TlaCtaButton', '36px', '6px (::before)', '600', '::before pseudo', 'primary-hover', 'accent'],
	['TlaButton secondary', '32px', 'r1 / 4px', '500', 'background-color', 'secondary-hover', ''],
	['TlaButton big', '36px', 'r2 / 6px', '500', 'background-color', 'primary-hover', 'accent'],
	['TlaCtaButton secondary', '36px', '6px (::before)', '600', '::before pseudo', 'muted-1', ''],
	['.sidebarActionButton', '36px', '—', '—', 'none (::after hover)', 'muted-2 halo', ''],
	['.inlineButton', 'auto', '—', '500', 'none (text)', 'underline', ''],
	['.menuTabsTab', '40px', '—', '—', 'none (text)', 'active underline', ''],
	['.acceptButton', 'auto', '—', '500', 'background-color', 'cta-hover', ''],
]

const PAGE_CSS = `
.page {
	min-height: 100vh;
	background: var(--tl-color-background);
	color: var(--tl-color-text);
	font-family: var(--tla-font-ui);
	padding: 48px 40px 80px;
	box-sizing: border-box;
}
.page__header { max-width: 720px; margin-bottom: 40px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.section { margin-bottom: 56px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 720px; }
.section__api { font-size: 11px; font-family: ui-monospace, monospace; line-height: 1.6; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 6px; padding: 10px 12px; margin: 0 0 24px; max-width: 820px; }
.section__api > div { display: flex; gap: 8px; }
.section__api > div + div { margin-top: 4px; }
.section__api .k { color: var(--tl-color-text-3); flex: 0 0 48px; }
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 20px;
}
.specimen {
	position: relative;
	border: 1px solid var(--tl-color-divider);
	border-radius: 8px;
	padding: 20px 16px 14px;
	background: var(--tl-color-panel);
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.specimen__badge { position: absolute; top: 8px; right: 8px; font-size: 9px; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.04em; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--tl-color-success, #2a9d3c) 16%, transparent); color: var(--tl-color-success, #2a9d3c); }
.specimen__badge[data-mock] { background: color-mix(in srgb, var(--tl-color-text-3) 18%, transparent); color: var(--tl-color-text-3); }
.specimen__stage {
	min-height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--tl-color-low);
	border-radius: 6px;
	padding: 12px;
}
.specimen__label { font-size: 12px; font-weight: 600; font-family: ui-monospace, monospace; }
.specimen__code { font-size: 11px; line-height: 1.4; color: var(--tl-color-text-1); font-family: ui-monospace, monospace; background: var(--tl-color-low); border-radius: 4px; padding: 5px 7px; white-space: pre-wrap; word-break: break-word; }
.specimen__meta { font-size: 11px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; }
.specimen__source { font-size: 10px; line-height: 1.5; color: var(--tl-color-text-3); font-family: ui-monospace, monospace; border-top: 1px dashed var(--tl-color-divider); padding-top: 8px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 14px 6px 0; border-bottom: 1px solid var(--tl-color-divider); }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-accent] td:first-child { color: var(--tl-color-primary); font-weight: 600; }
.page__footer { max-width: 720px; font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
