import { useApp } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { track } from 'signia-react'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'
import { Input } from './primitives/Input'

export const RoomName = track(function RoomName() {
	const app = useApp()

	const name = app.documentName

	const [isEditing, setIsEditing] = useState(false)
	const toggleEditing = useCallback(() => {
		setIsEditing((prev) => !prev)
	}, [])

	return (
		<div
			style={{
				pointerEvents: 'all',
				//backgroundColor: 'var(--color-low)',
				width: '150px',
				marginLeft: 'var(--space-2)',
				display: 'flex',
				alignItems: 'center',
			}}
		>
			{isEditing ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 'var(--space-4)',
						paddingLeft: 'calc(var(--space-4) + 1px)',
					}}
				>
					<Icon icon="file" small={true} />
					<Input
						className="tlui-room-name__input"
						defaultValue={name}
						onValueChange={(value) => {
							app.setDocumentName(value)
						}}
						onComplete={toggleEditing}
						onCancel={toggleEditing}
						shouldManuallyMaintainScrollPositionWhenFocused
						autofocus
						autoselect
					/>
				</div>
			) : (
				<Button className="tlui-room-name__button" iconLeft="file" onClick={toggleEditing}>
					{name}
				</Button>
			)}
		</div>
	)
})
