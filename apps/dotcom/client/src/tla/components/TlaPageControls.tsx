import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useFlags } from '../hooks/useFlags'
import { TldrawAppViewState } from '../utils/schema/TldrawAppSessionState'
import { TlaIcon } from './TlaIcon'

const LABELS: Record<string, string> = {
	recent: 'Recent',
	newest: 'Newest',
	oldest: 'Oldest',
	atoz: 'A-z',
	ztoa: 'Z-a',
	grid: 'Grid',
	list: 'List',
}

export function TlaPageControls({ viewName }: { viewName: string }) {
	const flags = useFlags()
	const app = useApp()
	const { sort, view, search } = useValue<TldrawAppViewState>(
		'controls view',
		() => {
			const sessionState = app.getSessionState()
			const currentView = sessionState.views[viewName]
			return (
				currentView ?? {
					sort: 'recent',
					view: 'grid',
					search: '',
				}
			)
		},
		[app, viewName]
	)

	return (
		<div className="tla-page_controls">
			<div className="tla-page_controls__search">
				<input
					className="tla-page_controls__search_input tla-text_ui__regular"
					placeholder="Search..."
					value={search}
					onChange={(e) => {
						const { value } = e.currentTarget
						const sessionState = app.getSessionState()
						app.setSessionState({
							...sessionState,
							views: {
								...sessionState.views,
								[viewName]: {
									sort,
									view,
									search: value,
								},
							},
						})
					}}
				/>
				{search.length ? (
					<button
						className="tla-button tla-page_controls__search_clear"
						onClick={() => {
							const sessionState = app.getSessionState()
							app.setSessionState({
								...sessionState,
								views: {
									...sessionState.views,
									[viewName]: {
										sort,
										view,
										search: '',
									},
								},
							})
						}}
					>
						<TlaIcon icon="close-strong" />
					</button>
				) : null}
			</div>
			<div className="tla-page_controls__right">
				<div className="tla-page_controls__control">
					<div className="tla-page_controls__control_label">
						<span className="tla-text_ui__regular">{LABELS[sort]}</span>
						<TlaIcon icon="chevron-down-strong" />
					</div>
					<select
						className="tla-page_controls__control_select"
						value={sort}
						onChange={(e) => {
							const sessionState = app.getSessionState()
							app.setSessionState({
								...sessionState,
								views: {
									...sessionState.views,
									[viewName]: {
										...sessionState.views[viewName],
										sort: e.currentTarget.value as 'recent' | 'newest' | 'oldest',
									},
								},
							})
						}}
					>
						<option value="recent">{LABELS['recent']}</option>
						<option value="newest">{LABELS['newest']}</option>
						<option value="oldest">{LABELS['oldest']}</option>
						<option value="atoz">{LABELS['atoz']}</option>
						<option value="ztoa">{LABELS['ztoa']}</option>
					</select>
				</div>
				{flags.listView && (
					<div className="tla-page_controls__control">
						<div className="tla-page_controls__control_label">
							<span className="tla-text_ui__regular">{LABELS[view]}</span>
							<TlaIcon icon="chevron-down-strong" />
						</div>
						<select
							className="tla-page_controls__control_select"
							value={view}
							onChange={(e) => {
								const sessionState = app.getSessionState()
								app.setSessionState({
									...sessionState,
									views: {
										...sessionState.views,
										[viewName]: {
											...sessionState.views[viewName],
											view: e.currentTarget.value as 'grid' | 'list',
										},
									},
								})
							}}
						>
							<option value="grid">{LABELS['grid']}</option>
							<option value="list">{LABELS['list']}</option>
						</select>
					</div>
				)}
			</div>
		</div>
	)
}
