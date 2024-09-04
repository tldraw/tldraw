import { Editor, track } from '@tldraw/editor'
import { useState } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { Time } from './Time'
import {
	CollapseButton,
	DecreaseTimeButton,
	IncreaseTimeButton,
	PauseButton,
	PlayButton,
	ResetButton,
} from './TimerButtons'

/** @public */
export interface TLTimerProps {
	initialTime: number
	remainingTime: number
	state:
		| { state: 'running'; lastStartTime: number }
		| { state: 'stopped' }
		| { state: 'paused' }
		| { state: 'completed' }
}

/** @internal */
export type TLTimerState = TLTimerProps['state']['state']

/** @public */
export interface TimerProps {
	props: TLTimerProps
	editor: Editor
}

/** @public @react */
export const Timer = track(function Timer() {
	const { timerProps } = useTimer()
	const [isExpanded, setIsExpanded] = useState(true)
	if (!timerProps || timerProps.initialTime === undefined) return null
	return (
		<div className="tlui-timer__wrapper">
			{isExpanded ? (
				<ExpandedTimerView props={timerProps} onCollapse={() => setIsExpanded(false)} />
			) : (
				<Time props={timerProps} onClick={() => setIsExpanded(true)} />
			)}
		</div>
	)
})

function ExpandedTimerView({ props, onCollapse }: { props: TLTimerProps; onCollapse(): void }) {
	const state = props.state.state
	const showPlay = ['stopped', 'paused', 'completed'].includes(state)

	return (
		<>
			<CollapseButton onClick={onCollapse} />
			<DecreaseTimeButton props={props} />
			<Time props={props} />
			<IncreaseTimeButton props={props} />
			<ResetButton props={props} />
			{showPlay ? <PlayButton props={props} /> : <PauseButton props={props} />}
		</>
	)
}
