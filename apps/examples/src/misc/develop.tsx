import { getLicenseKey } from '@tldraw/dotcom-shared'
import {
	DefaultHelperButtons,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TLTimerShape,
	TLUiComponents,
	Timer,
	Tldraw,
	TldrawUiMenuItem,
	atom,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

const showTimer = atom('timer', false)

const HelperButtons = track(function HelperButtons() {
	const editor = useEditor()
	const shape = editor.getCurrentPageShapes().filter((s) => s.type === 'timer')[0] as TLTimerShape

	return (
		<>
			{showTimer.get() && (
				<div
					style={{
						margin: '5px',
					}}
				>
					<Timer shape={shape} editor={editor} />
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
				<TldrawUiMenuItem
					id="code"
					icon="code"
					isSelected={showTimer.get()}
					onSelect={() => {
						showTimer.set(!showTimer.get())
					}}
				/>
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
					;(window as any).app = editor
					;(window as any).editor = editor
				}}
			/>
		</div>
	)
}
