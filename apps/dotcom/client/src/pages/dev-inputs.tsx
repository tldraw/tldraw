/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { TldrawUiInput } from 'tldraw'
import 'tldraw/tldraw.css'
import { TlaMenuSwitch } from '../tla/components/tla-menu/tla-menu'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of every text-input surface in the dotcom app. Inputs
 * diverge by SCARCITY: TldrawUiInput is one narrow editable-text field, so raw
 * <input>/<textarea> appear wherever a native capability it lacks is needed.
 * Every call site is shown — nothing filtered.
 *
 * Serves tldraw/tldraw#9191. Route: /dev/components/inputs.
 */

const Section = ({
	title,
	note,
	children,
}: {
	title: string
	note: string
	children: ReactNode
}) => (
	<section className="section">
		<h2 className="section__title">{title}</h2>
		<p className="section__note">{note}</p>
		<div className="grid">{children}</div>
	</section>
)

/** Renders a raw input element faithfully by kind. */
const RawInput = ({ el, placeholder }: { el: RawKind; placeholder?: string }): ReactNode => {
	// The sharing toggle is a real TlaMenuSwitch (a styled switch), not a bare
	// checkbox — render the actual component so the preview matches the app.
	if (el === 'switch') return <TlaMenuSwitch id="inp-sharing-switch" checked onChange={() => {}} />
	// The admin toggles are genuinely plain, unstyled checkboxes.
	if (el === 'checkbox') return <input type="checkbox" defaultChecked />
	if (el === 'textarea')
		return (
			<textarea
				placeholder={placeholder}
				className="rawInput"
				style={{ minHeight: 44, resize: 'vertical' }}
			/>
		)
	return (
		<input
			type={el === 'email' ? 'email' : 'text'}
			inputMode={el === 'numeric' ? 'numeric' : undefined}
			placeholder={placeholder}
			className="rawInput"
		/>
	)
}

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Input inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Input inventory</h1>
					<p className="page__lede">
						Every text-input surface in the dotcom app. Inputs diverge by capability, not pixels:
						TldrawUiInput is one narrow editable-text field, so raw inputs appear wherever a native
						attribute it can&rsquo;t express is needed. Each raw card flags that missing capability.
					</p>
				</header>

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
					title={`TldrawUiInput — all ${SDK_INPUTS.length} call sites`}
					note="The SDK's editable single-line text field (custom Enter=onComplete / Escape=onCancel, not native onChange). Rendered live."
				>
					{SDK_INPUTS.map((i) => (
						<Specimen key={i.source} label={i.label} code={i.code} meta={i.meta} source={i.source}>
							<TldrawUiInput
								defaultValue={i.defaultValue}
								placeholder={i.placeholder}
								className="demoInput"
							/>
						</Specimen>
					))}
				</Section>

				<Section
					title={`Raw <input> / <textarea> — all ${RAW_INPUTS.length}`}
					note="Each is raw because it needs exactly what TldrawUiInput lacks. Rendered with real native attributes; meta names the missing capability."
				>
					{RAW_INPUTS.map((i) => (
						<Specimen key={i.source} label={i.label} code={i.code} meta={i.meta} source={i.source}>
							<RawInput el={i.el} placeholder={i.placeholder} />
						</Specimen>
					))}
				</Section>
			</div>
		</div>
	)
}

type RawKind = 'text' | 'email' | 'numeric' | 'checkbox' | 'switch' | 'textarea'

const SDK_INPUTS: ReadonlyArray<{
	label: string
	code: string
	meta: string
	source: string
	placeholder?: string
	defaultValue?: string
}> = [
	{
		label: 'sidebar search',
		code: 'placeholder · onValueChange · autoFocus · autoSelect',
		meta: 'search box',
		source: 'TlaSidebarSearch:87',
		placeholder: 'Search files…',
	},
	{
		label: 'inline file rename',
		code: 'defaultValue · onComplete · onCancel',
		meta: 'inline rename',
		source: 'TlaSidebarInlineInput:53',
		defaultValue: 'My file',
	},
	{
		label: 'create workspace',
		code: 'value · onValueChange · onComplete · placeholder',
		meta: 'workspace name',
		source: 'CreateWorkspaceDialog:65',
		placeholder: 'Workspace name',
	},
	{
		label: 'rename workspace',
		code: 'defaultValue · onValueChange',
		meta: 'settings rename',
		source: 'WorkspaceSettingsDialog:342',
		defaultValue: 'Acme Inc',
	},
	{
		label: 'rename current file',
		code: 'value · onValueChange · autoFocus · autoSelect',
		meta: 'editor file name',
		source: 'TlaEditorTopLeftPanel:407',
		defaultValue: 'Untitled',
	},
]

const RAW_INPUTS: ReadonlyArray<{
	label: string
	el: RawKind
	code: string
	meta: string
	source: string
	placeholder?: string
}> = [
	{
		label: 'sharing toggle',
		el: 'switch',
		code: '<TlaMenuSwitch> (wraps type="checkbox" role="switch")',
		meta: 'real TlaMenuSwitch — not a text field',
		source: 'tla-menu.tsx:260',
	},
	{
		label: 'sign-in email',
		el: 'email',
		code: 'type="email" name="identifier"',
		meta: 'needs type + name (Clerk form)',
		source: 'TlaSignInDialog:244',
		placeholder: 'you@example.com',
	},
	{
		label: 'verification code',
		el: 'numeric',
		code: 'type="text" inputMode="numeric"',
		meta: 'needs inputMode',
		source: 'TlaSignInDialog:449',
		placeholder: '123456',
	},
	{
		label: 'admin: user lookup',
		el: 'text',
		code: 'type="text" ref placeholder="Email or ID"',
		meta: 'imperative ref + Enter',
		source: 'admin.tsx:175',
		placeholder: 'Email or ID',
	},
	{
		label: 'admin: published file',
		el: 'text',
		code: 'type="text" ref placeholder="Published file ID"',
		meta: 'ref read',
		source: 'admin.tsx:367',
		placeholder: 'Published file ID',
	},
	{
		label: 'admin: toggle',
		el: 'checkbox',
		code: 'type="checkbox"',
		meta: 'admin toggle',
		source: 'admin.tsx:509',
	},
	{
		label: 'admin: toggle',
		el: 'checkbox',
		code: 'type="checkbox"',
		meta: 'admin toggle',
		source: 'admin.tsx:574',
	},
	{
		label: 'admin: text field',
		el: 'text',
		code: 'type="text"',
		meta: 'admin field',
		source: 'admin.tsx:586',
		placeholder: '…',
	},
	{
		label: 'admin: file ID',
		el: 'text',
		code: 'type="text" ref .searchInput',
		meta: 'Enter-to-search',
		source: 'admin.tsx:666',
		placeholder: 'File ID',
	},
	{
		label: 'admin: file ID',
		el: 'text',
		code: 'type="text" ref .searchInput',
		meta: 'Enter-to-search',
		source: 'admin.tsx:766',
		placeholder: 'File ID',
	},
	{
		label: 'admin: user lookup',
		el: 'text',
		code: 'type="text" ref placeholder="User ID or Email"',
		meta: 'ref read',
		source: 'admin.tsx:844',
		placeholder: 'User ID or Email',
	},
	{
		label: 'feedback',
		el: 'textarea',
		code: '<textarea defaultValue · onInput · ref>',
		meta: 'multi-line — TldrawUiInput is input-only',
		source: 'SubmitFeedbackDialog:159',
		placeholder: 'Tell us more…',
	},
]

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
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 24px; max-width: 720px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-gap] td:last-child { color: var(--tl-color-warning, #cb4b16); }
.page__footer { max-width: 720px; font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
.demoInput, .rawInput { font-family: var(--tla-font-ui); font-size: 13px; padding: 6px 8px; border: 1px solid var(--tl-color-muted-1); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); color: var(--tl-color-text); width: 100%; box-sizing: border-box; }
.rawSwitch { width: 36px; height: 20px; }
`
