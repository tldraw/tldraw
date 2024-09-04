import { Editor, exhaustiveSwitchError, track } from '@tldraw/editor'
import { useState } from 'react'
import { Time } from './Time'
import {
	CollapseButton,
	DecreaseTimeButton,
	IncreaseTimeButton,
	PauseButton,
	PlayButton,
	ResetButton,
	getElapsedTime,
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

export type TLTimerState = TLTimerProps['state']['state']

/** @public */
export interface TimerProps {
	props: TLTimerProps
	editor: Editor
}

export function getTimeRemaining(props: TLTimerProps) {
	switch (props.state.state) {
		case 'running':
			return props.remainingTime - getElapsedTime(props)
		case 'stopped':
			return props.initialTime
		case 'paused':
			return props.remainingTime
		case 'completed':
			return 0
		default:
			exhaustiveSwitchError(props.state)
	}
}

/** @public @react */
export const Timer = track(function Timer({ props }: { props: TLTimerProps }) {
	const [isExpanded, setIsExpanded] = useState(true)
	return (
		<div className="tlui-timer__wrapper">
			{isExpanded ? (
				<ExpandedTimerView props={props} onCollapse={() => setIsExpanded(false)} />
			) : (
				<Time props={props} onClick={() => setIsExpanded(true)} />
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
