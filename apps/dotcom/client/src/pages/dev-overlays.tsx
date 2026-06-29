/* eslint-disable tldraw/jsx-no-literals */
import { Tooltip as RadixTooltip } from 'radix-ui'
import { ReactNode, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import {
	DefaultToasts,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useToasts,
} from 'tldraw'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders } from './dev-editor-harness'

/**
 * Dev-only inventory of the dotcom app's transient feedback & overlay UI:
 * toasts, tooltips, popovers. These show the DELEGATION mode — the app owns no
 * implementation, it calls the SDK. Toasts especially: the app renders nothing,
 * it just calls addToast(); the SDK owns the toast UI entirely. The opposite
 * pole from TlaButton (own + diverge). Every toast call site is shown.
 *
 * Route: /dev/components/overlays.
 */

const FireToast = ({
	toast,
}: {
	toast: { title: string; sev: Sev; keepOpen?: boolean; source: string }
}): ReactNode => {
	const { addToast, toasts } = useToasts()
	useEffect(() => {
		if (toasts.get().length > 0) return
		addToast({
			id: toast.source,
			title: toast.title,
			severity: toast.sev === 'default' ? undefined : toast.sev,
			keepOpen: true,
		})
	}, [addToast, toasts, toast])
	return null
}

/**
 * One real toast per card. The SDK owns the toast UI (DefaultToasts is the real
 * viewport). Each card gets its OWN TldrawUiContextProvider so its toast state is
 * isolated — TldrawUiToastsProvider reuses a parent context if one exists, so the
 * card must not sit under a page-level provider (hence the toast section is
 * outside the page IsolationProviders). The stage's transform is a containing
 * block so the viewport's fixed positioning stays in the card.
 */
const ToastCard = ({
	toast,
}: {
	toast: { title: string; sev: Sev; keepOpen?: boolean; source: string }
}): ReactNode => (
	<IsolationProviders>
		<div className="toastCardStage">
			<FireToast toast={toast} />
			<DefaultToasts />
		</div>
	</IsolationProviders>
)

/**
 * TldrawUiTooltip has no `open` prop (its open state is internal hover), so we
 * compose the same Radix Tooltip primitives it uses, with the SDK .tlui-tooltip
 * styling, forced open. Real tooltip UI, no hover.
 */
const LiveTooltip = ({ label, content }: { label: string; content: string }): ReactNode => (
	<RadixTooltip.Root open delayDuration={0}>
		<RadixTooltip.Trigger asChild>
			<button className="tipTrigger" type="button">
				{label}
			</button>
		</RadixTooltip.Trigger>
		<RadixTooltip.Content className="tlui-tooltip" side="top" sideOffset={6}>
			{content}
			<RadixTooltip.Arrow className="tlui-tooltip__arrow" />
		</RadixTooltip.Content>
	</RadixTooltip.Root>
)

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Feedback & overlays — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Feedback &amp; overlays</h1>
						<p className="page__lede">
							Toasts, tooltips, popovers — transient UI the app <strong>delegates</strong> to the
							SDK. A new mode: not "own and diverge" (buttons) but "call and render nothing." For
							toasts the app owns <em>no</em> component at all — it calls <code>addToast()</code>{' '}
							and the SDK draws it.
						</p>
					</header>

					<section className="section">
						<h2 className="section__title">Toasts — all {TOASTS.length}, each live</h2>
						<p className="section__note">
							Every <code>addToast(&#123; title, severity?, keepOpen? &#125;)</code> call site,
							rendered as a real toast. Each card has its own <code>TldrawUiToastsProvider</code> and
							fires its one toast <code>keepOpen</code> on mount — real SDK toast UI, no trigger.
						</p>
						<div className="grid grid--toasts">
							{TOASTS.map((t) => (
								<Specimen
									key={t.source}
									label={t.title}
									code={`severity: ${t.sev}${t.keepOpen ? ' · keepOpen' : ''}`}
									meta={t.keepOpen ? 'manual dismiss' : 'auto-dismiss'}
									source={t.source}
								>
									<ToastCard toast={t} />
								</Specimen>
							))}
						</div>
					</section>

					<IsolationProviders>
					<section className="section">
						<h2 className="section__title">Tooltips — live (forced open)</h2>
						<p className="section__note">
							<code>TldrawUiTooltip</code> exposes no <code>open</code> prop (its state is internal
							hover), so these compose the same Radix <code>Tooltip</code> primitives it uses with
							the SDK <code>.tlui-tooltip</code> styling, forced open. Real tooltip UI, no hover.
						</p>
						<div className="tipStage">
							<LiveTooltip label="Rename" content="Rename this file" />
							<LiveTooltip label="ⓘ" content="More information about this setting" />
							<LiveTooltip label="Copy" content="Copy link" />
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Popover — live (forced open)</h2>
						<p className="section__note">
							The real <code>TldrawUiPopover</code> (Root / Trigger / Content), forced open via its{' '}
							<code>open</code> prop — the share menu&rsquo;s one popover consumer.
						</p>
						<div className="popStage">
							<TldrawUiPopover id="dev-popover" open>
								<TldrawUiPopoverTrigger>
									<TldrawUiButton type="normal">
										<TldrawUiButtonLabel>Share</TldrawUiButtonLabel>
									</TldrawUiButton>
								</TldrawUiPopoverTrigger>
								<TldrawUiPopoverContent side="bottom" align="start">
									<div className="popoverDemo">Anyone with the link can view this file.</div>
								</TldrawUiPopoverContent>
							</TldrawUiPopover>
						</div>
					</section>
					</IsolationProviders>
				</div>
		</div>
	)
}

type Sev = 'error' | 'warning' | 'info' | 'success' | 'default'

const TOASTS: ReadonlyArray<{ title: string; sev: Sev; keepOpen?: boolean; source: string }> = [
	{ title: 'Shared document open error', sev: 'error', source: 'SneakyOnDropOverride:28' },
	{ title: 'Unsupported mermaid diagram', sev: 'warning', source: 'SneakyMermaidHandler:55' },
	{ title: 'Mutation error', sev: 'default', source: 'TldrawApp:391' },
	{ title: 'Max files reached', sev: 'default', keepOpen: true, source: 'TldrawApp:696' },
	{ title: 'Uploading .tldr files…', sev: 'info', source: 'TldrawApp:1111' },
	{ title: 'Unknown error', sev: 'error', keepOpen: true, source: 'TldrawApp:1149' },
	{ title: 'Adding .tldr files', sev: 'success', source: 'TldrawApp:1176' },
	{ title: 'Copied invite link', sev: 'default', source: 'TldrawApp:1280' },
	{ title: 'Error accepting invite', sev: 'error', source: 'TldrawApp:1298' },
	{ title: 'Error accepting invite', sev: 'error', source: 'TldrawApp:1313' },
	{ title: 'Copied link', sev: 'default', source: 'TlaFileMenu:147' },
	{
		title: 'Workspace invite error',
		sev: 'error',
		keepOpen: true,
		source: 'WorkspaceInviteHandler:122',
	},
	{ title: 'Already a member', sev: 'default', source: 'WorkspaceInviteHandler:155' },
	{ title: 'Feedback submitted', sev: 'success', source: 'SubmitFeedbackDialog:107' },
	{ title: 'Debug mode', sev: 'default', keepOpen: true, source: 'SneakyDebugModeToast:26' },
	{ title: 'Import failed', sev: 'error', keepOpen: true, source: 'local.tsx:54' },
]

const PAGE_CSS = `
.page {
	min-height: 100vh;
	background: var(--tl-color-background);
	color: var(--tl-color-text);
	font-family: var(--tla-font-ui);
	padding: 24px 40px 80px;
	box-sizing: border-box;
}
.page__header { max-width: 760px; margin-bottom: 40px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.page__lede strong, .page__footer strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede code, .section__note code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 14px 18px; min-width: 130px; background: var(--tl-color-panel); }
.stat__n { font-size: 24px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat__label { font-size: 11px; color: var(--tl-color-text-1); margin-top: 4px; }
.grid--toasts { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
.toastCardStage { position: relative; transform: translateZ(0); width: 100%; min-height: 150px; overflow: hidden; }
.toastStage { position: relative; transform: translateZ(0); min-height: 320px; border: 1px solid var(--tl-color-divider); border-radius: 8px; background: var(--tl-color-low); overflow: hidden; }
.toastMock { padding: 9px 11px; border-radius: 6px; font-size: 12px; background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); border-left: 3px solid var(--tl-color-text-3); width: 100%; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.toastMock[data-sev=error] { border-left-color: var(--tl-color-danger, #dc322f); }
.toastMock[data-sev=warning] { border-left-color: var(--tl-color-warning, #cb4b16); }
.toastMock[data-sev=info] { border-left-color: var(--tl-color-primary); }
.toastMock[data-sev=success] { border-left-color: var(--tl-color-success, #2a9d3c); }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 760px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.tipStage { display: flex; gap: 64px; align-items: center; padding: 56px 32px 28px; border: 1px solid var(--tl-color-divider); border-radius: 8px; background: var(--tl-color-low); }
.tipTrigger { font-size: 13px; padding: 6px 12px; border: 1px solid var(--tl-color-divider); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); color: var(--tl-color-text); cursor: default; }
.popStage { position: relative; min-height: 180px; padding: 20px; border: 1px solid var(--tl-color-divider); border-radius: 8px; background: var(--tl-color-low); }
.popoverDemo { padding: 12px 14px; font-size: 13px; max-width: 240px; line-height: 1.5; }
.tipMock { font-size: 12px; color: var(--tl-color-panel-contrast, #fff); background: var(--tl-color-tooltip, #1d1d1d); padding: 5px 9px; border-radius: 5px; }
.popMock { display: inline-block; }
.popMock__trigger { font-size: 13px; padding: 6px 12px; border: 1px solid var(--tl-color-divider); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
