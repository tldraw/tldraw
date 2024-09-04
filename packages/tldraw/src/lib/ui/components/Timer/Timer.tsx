import { Editor, TLTimerShapeProps, exhaustiveSwitchError, track } from '@tldraw/editor'
import { useState } from 'react'
import { Time } from './Time'
import {
	CollapseButton,
	DecreaseTimeButton,
	IncreaseTimeButton,
	PlayButton,
	ResetPauseButton,
	StopButton,
	getElapsedTime,
} from './TimerButtons'

/** @public */
export interface TimerProps {
	props: TLTimerShapeProps
	editor: Editor
}

export function getTimeRemaining(props: TLTimerShapeProps) {
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
export const Timer = track(function Timer({ props }: { props: TLTimerShapeProps }) {
	const [isExpanded, setIsExpanded] = useState(true)
	const remainingTime = getTimeRemaining(props)

	const state = props.state
	// eslint-disable-next-line @typescript-eslint/no-unused-vars

	const showPlay = (state.state === 'stopped' || state.state === 'paused') && remainingTime > 0
	return (
		<div className="tlui-timer__wrapper">
			{isExpanded && (
				<>
					<CollapseButton onClick={() => setIsExpanded(false)} />
					<StopButton props={props} />
					<DecreaseTimeButton props={props} />
				</>
			)}
			<Time props={props} isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
			{isExpanded && (
				<>
					<IncreaseTimeButton props={props} />
					{showPlay && <PlayButton props={props} />}
					{!showPlay && <ResetPauseButton props={props} />}
				</>
			)}
		</div>
	)
})
