import { useApp } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { track } from 'signia-react'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'
import { Input } from './primitives/Input'

export const RoomName = track(function RoomName() {
	const app = useApp()

	const [isEditing, setIsEditing] = useState(false)
	const toggleEditing = useCallback(() => {
		setIsEditing((v) => !v)
	}, [])

	return (
		<div className="tlui-room-zone">
			{isEditing ? (
				<>
					<Icon icon="file" small={true} />
					<Input
						className="tlui-people-menu__user__input"
						defaultValue={'Home Project'}
						onValueChange={(value) => {
							//TODO
						}}
						onComplete={toggleEditing}
						onCancel={toggleEditing}
						shouldManuallyMaintainScrollPositionWhenFocused
						autofocus
						autoselect
					/>
				</>
			) : (
				<Button iconLeft="file" onClick={toggleEditing} style={{ pointerEvents: 'all' }}>
					Home Project
				</Button>
			)}
		</div>
	)
})
