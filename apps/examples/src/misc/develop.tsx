import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import {
	DefaultHelperButtons,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TLTimerShapeProps,
	TLUiComponents,
	Timer,
	Tldraw,
	atom,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

const showTimer = atom('timer', false)

const HelperButtons = track(function HelperButtons() {
	const editor = useEditor()
	const props = editor.getDocumentSettings().meta
	const store = useCallback(
		(newProps: TLTimerShapeProps) => {
			editor.updateDocumentSettings({
				meta: { ...props, ...newProps },
			})
		},
		[editor, props]
	)
	if (!props || !props.initialTime) return

	return (
		<>
			{showTimer.get() && (
				<div
					style={{
						margin: '5px',
					}}
				>
					<Timer props={props as any} editor={editor} store={store} />
				</div>
			)}
			<DefaultHelperButtons />
		</>
	)
})

const QuickActions = track(function QuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<div
				style={{
					backgroundColor: showTimer.get() ? '#ddd' : '',
				}}
			>
				<div
					style={{
						margin: '0 5px',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						pointerEvents: 'all',
					}}
					onClick={() => {
						showTimer.set(!showTimer.get())
					}}
				>
					<div>🕝</div>
				</div>
			</div>
		</DefaultQuickActions>
	)
})

const components: TLUiComponents = {
	HelperButtons,
	QuickActions,
}

export default function Develop() {
	const performanceOverrides = usePerformance()
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				overrides={[performanceOverrides]}
				persistenceKey="example"
				initialState="timer"
				components={components}
				onMount={(editor) => {
					let meta = editor.getDocumentSettings().meta
					if (!meta.initialTime) {
						meta = {
							initialTime: 30 * 1000,
							remainingTime: 30 * 1000,
							state: { state: 'stopped' },
						}
						editor.updateDocumentSettings({
							meta,
						})
					}
					;(window as any).app = editor
					;(window as any).editor = editor
				}}
			/>
		</div>
	)
}
