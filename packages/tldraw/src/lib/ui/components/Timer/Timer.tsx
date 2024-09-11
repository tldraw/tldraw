import { Editor } from '@tldraw/editor'
import { useState } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { TimeDisplay } from './TimeDisplay'
import {
	CollapseButton,
	DecreaseTimeButton,
	IncreaseTimeButton,
	PauseButton,
	PlayButton,
	ResetButton,
} from './TimerButtons'

export const ONE_SECOND = 1000
export const FIVE_SECONDS = 5 * ONE_SECOND
export const TEN_SECONDS = 10 * ONE_SECOND
export const THIRTY_SECONDS = 30 * 1000
export const ONE_MINUTE = 60 * 1000
export const FIVE_MINUTES = 5 * ONE_MINUTE

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
export function Timer() {
	const { timerProps } = useTimer()
	const [isExpanded, setIsExpanded] = useState(true)
	if (!timerProps || timerProps.initialTime === undefined) return null
	return (
		<div className="tlui-timer__wrapper">
			{isExpanded ? (
				<ExpandedTimerView props={timerProps} onCollapse={() => setIsExpanded(false)} />
			) : (
				<TimeDisplay props={timerProps} onClick={() => setIsExpanded(true)} />
			)}
		</div>
	)
}

function ExpandedTimerView({ props, onCollapse }: { props: TLTimerProps; onCollapse(): void }) {
	const state = props.state.state
	const showPlay = ['stopped', 'paused', 'completed'].includes(state)

	return (
		<>
			<CollapseButton onClick={onCollapse} />
			<DecreaseTimeButton props={props} />
			<TimeDisplay props={props} />
			<IncreaseTimeButton props={props} />
			<ResetButton props={props} />
			{showPlay ? <PlayButton props={props} /> : <PauseButton props={props} />}
		</>
	)
}
