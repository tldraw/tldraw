/* eslint-disable tldraw/jsx-no-literals */
import {
	Avatar,
	Byline,
	CommentAuthor,
	CommentCard,
	CommentComposer,
	CommentListItemProps,
	CommentPin,
	CommentsList,
	CommentThread,
	CountBadge,
	EmojiPicker,
	ReactionSummary,
	Reactions,
	SendButton,
} from '@tldraw/commenting'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders } from './dev-editor-harness'

/**
 * Dev-only inventory of @tldraw/commenting as dotcom consumes it: a component
 * family that arrived after the rest of the gallery (#9471), with its own
 * tokens, type sizes and icons. Components render live from fake authors and
 * comments under IsolationProviders; tokens, sizes, icons and buttons are
 * catalogued as data.
 *
 * Route: /dev/components/commenting.
 */

const noop = () => {}

const ADA: CommentAuthor = { name: 'Ada Lovelace', color: '#e85d75' }
const GRACE: CommentAuthor = { name: 'Grace Hopper', color: '#4465e9' }
const HOURS_AGO = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

const REACTIONS: ReactionSummary[] = [
	{
		emoji: '👍',
		count: 2,
		active: true,
		reactors: [
			{ name: 'You', you: true },
			{ name: 'Grace Hopper', you: false },
		],
	},
	{ emoji: '🎉', count: 1, active: false, reactors: [{ name: 'Ada Lovelace', you: false }] },
]

const LIST_ITEMS: CommentListItemProps[] = [
	{
		id: 'a',
		author: ADA,
		preview: 'Can we line these two frames up?',
		date: HOURS_AGO(2),
		count: 3,
		reactions: REACTIONS,
	},
	{
		id: 'b',
		author: GRACE,
		preview: 'Moved the legend under the chart.',
		date: HOURS_AGO(26),
		resolved: true,
	},
]

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Commenting inventory — dev</title>
			</Helmet>
			<style>{SPECIMEN_CSS + PAGE_CSS}</style>

			<IsolationProviders>
				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Commenting</h1>
						<p className="page__lede">
							<code>@tldraw/commenting</code> is a third component family next to the SDK&rsquo;s{' '}
							<code>TldrawUi*</code> and dotcom&rsquo;s <code>Tla*</code>. It builds its menus,
							tooltips and dialogs from the SDK parts, and brings its own tokens, type sizes, icons
							and a handful of raw buttons. dotcom mounts it on the canvas (
							<code>CommentsOnCanvas</code>) and reuses its list for notifications.
						</p>
					</header>

					<section className="section">
						<div className="stats">
							<Stat n={String(TOKENS.length)} label="--tlui-cmt-* tokens" />
							<Stat n={String(TYPE_SIZES.length)} label="distinct type sizes" accent />
							<Stat n={String(ICONS.length)} label="inline SVG icons" accent />
							<Stat
								n={String(BUTTONS.reduce((sum, b) => sum + b.count, 0))}
								label="raw <button>s"
								accent
							/>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Components (live)</h2>
						<p className="section__note">
							The presentational exports, rendered with fake authors and comments. They need only
							the SDK UI context (tooltips, translations), not an editor.
						</p>
						<div className="grid">
							<Specimen
								label="Avatar"
								code={`<Avatar author={{ name, color }} />`}
								meta="coloured initial · image when author.image is set"
								source="@tldraw/mentions (re-exported)"
							>
								<div className="row">
									<Avatar author={ADA} />
									<Avatar author={GRACE} />
								</div>
							</Specimen>
							<Specimen
								label="Byline"
								code={`<Byline author date edited />`}
								meta="relative time · full date in a TldrawUiTooltip"
								source="ui/byline.tsx"
							>
								<Byline author={GRACE} date={HOURS_AGO(2)} edited />
							</Specimen>
							<Specimen
								label="CommentPin"
								code={`<CommentPin open? resolved?>`}
								meta="default · open · resolved"
								source="ui/comment-pin.tsx"
							>
								<div className="row">
									<CommentPin>
										<Avatar author={ADA} />
									</CommentPin>
									<CommentPin open>
										<Avatar author={ADA} />
									</CommentPin>
									<CommentPin resolved />
								</div>
							</Specimen>
							<Specimen
								label="CountBadge"
								code={`<CountBadge count open? />`}
								meta="cluster and stack markers · same size as a pin"
								source="ui/count-badge.tsx"
							>
								<div className="row">
									<CountBadge count={3} />
									<CountBadge count={12} open />
								</div>
							</Specimen>
							<Specimen
								label="SendButton"
								code={`<SendButton label disabled? />`}
								meta="raw <button> · grey while empty, black once there's text"
								source="ui/send-button.tsx"
							>
								<div className="row">
									<SendButton label="Send" disabled />
									<SendButton label="Send" onClick={noop} />
								</div>
							</Specimen>
							<Specimen
								label="Reactions"
								code={`<Reactions reactions canReact />`}
								meta="active state for your own · reactors in a tooltip"
								source="ui/reactions.tsx"
							>
								<Reactions reactions={REACTIONS} canReact onToggle={noop} />
							</Specimen>
							<Specimen
								label="EmojiPicker"
								code={`<EmojiPicker selected={['👍']} />`}
								meta="the default reaction set"
								source="ui/emoji-picker.tsx"
							>
								<EmojiPicker selected={['👍']} onSelect={noop} />
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Composed (live)</h2>
						<p className="section__note">
							Cards, threads and lists assembled from the parts above. The composer is a tiptap
							editor with @-mentions.
						</p>
						<div className="grid grid--wide">
							<Specimen
								label="CommentCard"
								code={`<CommentCard author body date you footer />`}
								meta="byline + body + reactions footer"
								source="ui/comment-card.tsx"
							>
								<div className="panelStage">
									<CommentCard
										author={ADA}
										body="Can we line these two frames up?"
										date={HOURS_AGO(2)}
										you={false}
										footer={<Reactions reactions={REACTIONS} canReact onToggle={noop} />}
									/>
								</div>
							</Specimen>
							<Specimen
								label="CommentThread"
								code={`<CommentThread comments composer />`}
								meta="the thread popover's body"
								source="ui/comment-thread.tsx"
							>
								<div className="panelStage">
									<CommentThread
										comments={[
											{
												author: ADA,
												body: 'Can we line these two frames up?',
												date: HOURS_AGO(2),
												you: false,
											},
											{
												author: GRACE,
												body: 'Done — snapped to the grid.',
												date: HOURS_AGO(1),
												you: true,
											},
										]}
										composer={{ author: GRACE, placeholder: 'Reply' }}
									/>
								</div>
							</Specimen>
							<Specimen
								label="CommentsList"
								code={`<CommentsList items header />`}
								meta="also the shell of dotcom's notifications panel"
								source="ui/comments-list.tsx"
							>
								<div className="panelStage">
									<CommentsList items={LIST_ITEMS} header="Comments" onSelect={noop} />
								</div>
							</Specimen>
							<Specimen
								label="CommentComposer"
								code={`<CommentComposer author placeholder />`}
								meta="tiptap · @-mentions · Enter sends"
								source="ui/comment-composer.tsx"
							>
								<div className="panelStage">
									<CommentComposer author={GRACE} placeholder="Add a comment" />
								</div>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Tokens</h2>
						<p className="section__note">
							Declared on <code>.tl-container</code>, so every commenting surface inside the editor
							shares them. Pin geometry is one number that the markers, preview bridge and draft
							composer all derive from.
						</p>
						<table className="matrix">
							<thead>
								<tr>
									<th>token</th>
									<th>value</th>
								</tr>
							</thead>
							<tbody>
								{TOKENS.map(([name, value]) => (
									<tr key={name}>
										<td>{name}</td>
										<td>{value}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">Type sizes</h2>
						<p className="section__note">
							Literal <code>font-size</code> declarations across the package&rsquo;s CSS. Like
							dotcom, 12px carries most of it; 10, 21 and 28px are sizes dotcom doesn&rsquo;t use.
						</p>
						<table className="matrix">
							<thead>
								<tr>
									<th>size</th>
									<th>declarations</th>
								</tr>
							</thead>
							<tbody>
								{TYPE_SIZES.map(([px, count]) => (
									<tr key={px}>
										<td>{px}px</td>
										<td>{count}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">Icons</h2>
						<p className="section__note">
							Where the SDK asset set has an icon, commenting uses <code>TldrawUiIcon</code>. These
							seven are inline SVG components in <code>ui/icons.tsx</code>, internal to the package.
						</p>
						<table className="matrix">
							<thead>
								<tr>
									<th>icon</th>
									<th>why inline</th>
								</tr>
							</thead>
							<tbody>
								{ICONS.map(([name, why]) => (
									<tr key={name}>
										<td>{name}</td>
										<td>{why}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">Buttons</h2>
						<p className="section__note">
							Menus and toolbars build on <code>TldrawUiButton</code> and the SDK menu parts (
							<code>thread-view</code> alone references <code>TldrawUi*</code> 25 times). The raw{' '}
							<code>&lt;button&gt;</code>s are the canvas markers, the send and emoji controls, and
							two hand-rolled menu rows (<code>.tlui-cmt-menu-item</code>) inside otherwise
							SDK-built menus.
						</p>
						<table className="matrix">
							<thead>
								<tr>
									<th>file</th>
									<th>raw &lt;button&gt;</th>
									<th>what it is</th>
								</tr>
							</thead>
							<tbody>
								{BUTTONS.map((b) => (
									<tr key={b.file}>
										<td>{b.file}</td>
										<td>{b.count}</td>
										<td>{b.what}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">Against the dotcom pages</h2>
						<div className="callout">
							Two findings from elsewhere in the gallery show up here independently. The icons page
							explains <code>TlaIcon</code> by <code>TldrawUiIcon</code> needing the editor&rsquo;s
							asset context; commenting inlines its eye icons for the same reason, since it renders
							without an <code>AssetUrlsProvider</code>. And the shadows page traces dotcom&rsquo;s
							copied scale to <code>--tl-shadow-N</code> bundling an inset ring; commenting&rsquo;s{' '}
							<code>--tlui-cmt-marker-shadow</code> exists to drop that same ring.
						</div>
					</section>
				</div>
			</IsolationProviders>
		</div>
	)
}

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }) => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const TOKENS: ReadonlyArray<readonly [string, string]> = [
	['--tlui-cmt-pin-size', '28px'],
	['--tlui-cmt-marker-size', 'var(--tlui-cmt-pin-size)'],
	['--tlui-cmt-marker-shadow', '0 1px 2px hsl(0 0% 0% / 28%), 0 2px 6px hsl(0 0% 0% / 14%)'],
	['--tlui-cmt-marker-shadow-hover', 'var(--tlui-cmt-marker-shadow)'],
	['--tlui-cmt-marker-hover-scale', '1.08'],
	['--tlui-cmt-marker-transition', '0.08s ease'],
	['--tlui-cmt-thread-padding', '12px'],
	['--tlui-cmt-thread-gap', '0px'],
	['--tlui-cmt-thread-action-size', '40px'],
	['--tlui-cmt-pill-shadow', '0 0 0 1px var(--tl-color-divider), 0 1px 3px hsl(0 0% 0% / 0.05)'],
	['--tlui-cmt-preview-bridge', 'calc(var(--tlui-cmt-preview-offset) - marker size)'],
	['--tlui-cmt-preview-hover-surface', 'color-mix(low 50%, panel)'],
	['--tlui-cmt-draft-avatar-centre', 'calc(4px + var(--tlui-cmt-pin-size) / 2)'],
]

const TYPE_SIZES: ReadonlyArray<readonly [number, number]> = [
	[10, 1],
	[11, 1],
	[12, 16],
	[13, 1],
	[14, 2],
	[16, 1],
	[21, 1],
	[28, 1],
]

const ICONS: ReadonlyArray<readonly [string, string]> = [
	['PinCheckIcon', 'the asset check reads too light on a 28px pin'],
	['CheckIcon', 'drawn to match a 12px label'],
	['SmileyIcon', 'no counterpart in the asset set'],
	['SendIcon', 'no counterpart in the asset set'],
	['EyeOpenIcon', 'asset exists (follow), but no AssetUrlsProvider'],
	['EyeClosedIcon', 'asset exists (closed), but no AssetUrlsProvider'],
	['MoreMenuIcon', 'asset exists (dots-vertical), but no AssetUrlsProvider'],
]

const BUTTONS: ReadonlyArray<{ file: string; count: number; what: string }> = [
	{ file: 'canvas/thread-pin.tsx', count: 1, what: 'the pin on the canvas' },
	{
		file: 'canvas/thread-stack.tsx',
		count: 2,
		what: 'stack badge · a card action in the stack list',
	},
	{ file: 'canvas/cluster-badge.tsx', count: 1, what: 'cluster count badge' },
	{ file: 'canvas/thread-view.tsx', count: 1, what: 'a menu row (.tlui-cmt-menu-item)' },
	{ file: 'canvas/comments-overflow-menu.tsx', count: 1, what: 'a menu row (.tlui-cmt-menu-item)' },
	{ file: 'ui/send-button.tsx', count: 1, what: 'the send arrow' },
	{ file: 'ui/emoji-picker.tsx', count: 1, what: 'each emoji cell' },
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
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.stats { display: flex; gap: 32px; flex-wrap: wrap; }
.stat__n { font-size: 28px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-3); }
.grid--wide { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
.row { display: flex; gap: 12px; align-items: center; }
.panelStage { width: 100%; background: var(--tl-color-panel); border-radius: 6px; text-align: left; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 820px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
`
