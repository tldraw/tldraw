/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { TldrawUiInput } from 'tldraw'
import 'tldraw/tldraw.css'
import dialogStyles from '../tla/components/dialogs/dialogs.module.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of every text-input surface in the dotcom app. Unlike
 * buttons (which diverge by redundancy — many ways to do one thing), inputs
 * diverge by SCARCITY: TldrawUiInput is a single narrow editable-text field, so
 * raw <input>/<textarea> appear wherever a native capability it lacks is needed.
 * Each raw card flags the exact attribute the component can't express.
 *
 * Serves tldraw/tldraw#9191 (replace raw inputs with shared input components).
 * Route: /dev/components/inputs.
 */

const Specimen = ({
	label,
	code,
	meta,
	source,
	children,
}: {
	label: string
	/** The literal JSX / props used to render this specimen. */
	code?: string
	/** For raw inputs: the native capability TldrawUiInput cannot express. */
	meta: string
	/** Where this input lives and which component renders it. */
	source?: string
	children: ReactNode
}): ReactNode => (
	<div className="specimen">
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
	api?: string
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
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Input inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Input inventory</h1>
					<p className="page__lede">
						Every text-input surface in the dotcom app. Inputs diverge by capability, not pixels:
						TldrawUiInput is one narrow editable-text field, so raw inputs appear wherever a native
						attribute it can't express is needed. Each raw card flags that missing capability.
					</p>
				</header>

				{/* The punchline: a coverage table, not a styling one. */}
				<section className="section">
					<h2 className="section__title">Coverage matrix</h2>
					<p className="section__note">
						Where TldrawUiInput suffices, and where the app drops to a raw element — and why.
					</p>
					<table className="matrix">
						<thead>
							<tr>
								<th>case</th>
								<th>native need</th>
								<th>TldrawUiInput?</th>
							</tr>
						</thead>
						<tbody>
							{MATRIX.map((r) => (
								<tr key={r[0]} data-gap={r[2].startsWith('✗') || undefined}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<Section
					title="TldrawUiInput — the SDK primitive (well adopted)"
					note="An editable single-line text field with a custom Enter=onComplete / Escape=onCancel model (not native onChange). Adopted across the app for inline rename and search."
					api="value/defaultValue, placeholder, label, icon/iconLeft, autoFocus, autoSelect, maxLength, disabled, onComplete(value), onValueChange(value), onCancel(value), onBlur, onFocus, className. NO type / name / required / readOnly / inputMode / pattern; no <textarea>; no native onChange."
					source="from 'tldraw' (packages/tldraw) · used in TlaSidebarSearch, TlaSidebarInlineInput, WorkspaceSettingsDialog, CreateWorkspaceDialog, TlaEditorTopLeftPanel"
				>
					<Specimen
						label="text"
						code={`<TldrawUiInput placeholder="Rename" />`}
						meta="editable text · Enter → onComplete, Esc → onCancel"
					>
						<TldrawUiInput placeholder="Rename file" className="demoInput" />
					</Specimen>
					<Specimen
						label="label"
						code={`<TldrawUiInput label="Name" />`}
						meta="label resolves via translation (passthrough for non-keys)"
					>
						<TldrawUiInput label="Workspace name" placeholder="Acme" className="demoInput" />
					</Specimen>
					<Specimen
						label="defaultValue + maxLength"
						code={`<TldrawUiInput defaultValue="Untitled" maxLength={32} />`}
						meta="seeded value, capped length"
					>
						<TldrawUiInput defaultValue="Untitled" maxLength={32} className="demoInput" />
					</Specimen>
					<Specimen
						label="disabled"
						code={`<TldrawUiInput disabled />`}
						meta="non-interactive"
					>
						<TldrawUiInput placeholder="Disabled" disabled className="demoInput" />
					</Specimen>
				</Section>

				<Section
					title="Raw inputs — the escapes (#9191)"
					note="Each of these is raw because it needs exactly what TldrawUiInput lacks. Rendered with their real native attributes (the divergence axis), styled minimally — the gap is capability, not appearance."
					api="native <input> / <textarea> attributes only — no shared component"
				>
					<Specimen
						label="email (sign-in)"
						code={`<input type="email" name="identifier" required>`}
						meta="needs type + name + required → TldrawUiInput has none (it's a Clerk form field)"
						source="TlaSignInDialog.tsx"
					>
						<input type="email" name="identifier" required placeholder="you@example.com" className="rawInput" />
					</Specimen>
					<Specimen
						label="verification code"
						code={`<input type="text" inputMode="numeric" autoFocus>`}
						meta="needs inputMode='numeric' to get the numeric keypad → not exposed"
						source="TlaSignInDialog.tsx (hidden OTP input behind digit boxes)"
					>
						<input type="text" inputMode="numeric" placeholder="123456" className="rawInput" />
					</Specimen>
					<Specimen
						label="feedback (multi-line)"
						code={`<textarea defaultValue=… onInput=…>`}
						meta="needs a <textarea> → TldrawUiInput is single-line <input> only"
						source="SubmitFeedbackDialog.tsx · dialogs.module.css .feedbackDialogTextArea"
					>
						<textarea
							placeholder="Tell us more…"
							className={dialogStyles.feedbackDialogTextArea}
							style={{ minHeight: 56 }}
						/>
					</Specimen>
					<Specimen
						label="sharing toggle"
						code={`<input type="checkbox" role="switch">`}
						meta="not a text field at all — a different control (TlaMenuSwitch)"
						source="tla-menu.tsx (TlaMenuSwitch)"
					>
						<input type="checkbox" role="switch" defaultChecked className="rawSwitch" />
					</Specimen>
					<Specimen
						label="admin file lookup"
						code={`<input type="text" ref={inputRef} /> + Enter`}
						meta="internal tool: imperative ref reads + Enter-to-search; raw by choice"
						source="admin.tsx (×9 inputs) · admin.module.css .searchInput"
					>
						<input type="text" placeholder="File ID" className="rawInput" />
					</Specimen>
				</Section>

				<footer className="page__footer">
					The shape of the gap: TldrawUiInput is a great <em>editable-text</em> field but not a
					general input — it can't be a typed/native form field, a numeric input, a textarea, or a
					toggle. So #9191 isn't a mechanical swap; it's blocked on richer shared form components
					(a typed/controlled input, a textarea, a toggle). See tldraw/tldraw#9191.
				</footer>
			</div>
		</div>
	)
}

const MATRIX: ReadonlyArray<readonly [string, string, string]> = [
	['inline rename / file name', 'editable text + Enter/Esc', '✓ TldrawUiInput'],
	['search box', 'editable text', '✓ TldrawUiInput'],
	['email (sign-in)', 'type=email · name · required', '✗ no type / name / required'],
	['verification code', 'inputMode=numeric', '✗ no inputMode'],
	['feedback', '<textarea> (multi-line)', '✗ single-line input only'],
	['sharing toggle', 'type=checkbox · role=switch', '✗ not a text field'],
	['admin file lookup', 'imperative ref + Enter', '— raw by choice (internal)'],
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
.page__header { max-width: 720px; margin-bottom: 40px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.section { margin-bottom: 56px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 720px; }
.section__api { font-size: 11px; font-family: ui-monospace, monospace; line-height: 1.6; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 6px; padding: 10px 12px; margin: 0 0 24px; max-width: 880px; }
.section__api > div { display: flex; gap: 8px; }
.section__api > div + div { margin-top: 4px; }
.section__api .k { color: var(--tl-color-text-3); flex: 0 0 48px; }
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 20px;
}
.specimen {
	border: 1px solid var(--tl-color-divider);
	border-radius: 8px;
	padding: 20px 16px 14px;
	background: var(--tl-color-panel);
	display: flex;
	flex-direction: column;
	gap: 12px;
}
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
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-gap] td:last-child { color: var(--tl-color-warning, #cb4b16); }
.page__footer { max-width: 720px; font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
.demoInput, .rawInput { font-family: var(--tla-font-ui); font-size: 13px; padding: 6px 8px; border: 1px solid var(--tl-color-muted-1); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); color: var(--tl-color-text); width: 100%; box-sizing: border-box; }
.rawSwitch { width: 36px; height: 20px; }
`
