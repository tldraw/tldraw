import { exhaustiveSwitchError } from '@tldraw/editor'
import { useTimer } from '../../hooks/useTimer'
import { TLTimerProps } from './Timer'

/** @public @react */
export function useGetRemainingTime(props: TLTimerProps) {
	const { getElapsedTime } = useTimer()
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
