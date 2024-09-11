import { track, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { TimeInputs } from './TimeInputs'
import { TLTimerProps } from './Timer'
import { useGetRemainingTime } from './useGetRemainingTime'
import { useTimerCounter } from './useTimerCounter'

export const TimeDisplay = track(function TimeDisplay({
	props,
	onClick,
}: {
	props: TLTimerProps
	onClick?(): void
}) {
	const editor = useEditor()
	const remainingTime = useGetRemainingTime(props)

	const state = props.state.state
	const _counter = useTimerCounter(state)

	if (remainingTime <= 0) {
		// Might be a better way to do this
		editor.timers.setTimeout(() => {
			editor.updateDocumentSettings({
				meta: {
					timer: {
						initialTime: props.initialTime,
						remainingTime: 0,
						state: { state: 'completed' },
					},
				},
			})
		}, 0)
	}

	const active = state === 'running' || state === 'paused'

	return (
		<div
			className={classNames('tlui-timer__time-wrapper', {
				'tlui-timer__time-wrapper-clickable': onClick,
				'tlui-timer__time-wrapper-active': active && !onClick,
			})}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={() => {
				onClick?.()
			}}
		>
			<TimeInputs active={active} remainingTime={remainingTime} props={props} />
		</div>
	)
})
