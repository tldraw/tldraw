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
		<div
			style={{
				pointerEvents: 'all',
				//backgroundColor: 'var(--color-low)',
				width: '150px',
				marginLeft: 'var(--space-2)',
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
				</div>
			) : (
				<Button
					className="tlui-room-name__button"
					iconLeft="file"
					onClick={toggleEditing}
					style={{
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						//backgroundColor: 'var(--color-low)',
					}}
				>
					Home Project
				</Button>
			)}
		</div>
	)
})
