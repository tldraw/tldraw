import { track } from 'signia-react'
import { Button } from './primitives/Button'

export const RoomName = track(function RoomName() {
	const handleClick = () => {
		//TODO
	}

	return (
		<Button iconLeft="file" onClick={handleClick} style={{ pointerEvents: 'all' }}>
			Home Project
		</Button>
	)
})
