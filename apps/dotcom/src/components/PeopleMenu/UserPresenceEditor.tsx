import { useCallback, useRef, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiInput,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { UI_OVERRIDE_TODO_EVENT } from '../../utils/useHandleUiEvent'
import { UserPresenceColorPicker } from './UserPresenceColorPicker'

export function UserPresenceEditor() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const userName = useValue('userName', () => editor.user.getName(), [])
	const msg = useTranslation()

	const rOriginalName = useRef(userName)
	const rCurrentName = useRef(userName)

	// Whether the user is editing their name or not
	const [isEditingName, setIsEditingName] = useState(false)
	const toggleEditingName = useCallback(() => {
		setIsEditingName((s) => !s)
	}, [])

	const handleValueChange = useCallback(
		(value: string) => {
			rCurrentName.current = value
			editor.user.updateUserPreferences({ name: value })
		},
		[editor]
	)

	const handleBlur = useCallback(() => {
		if (rOriginalName.current === rCurrentName.current) return
		trackEvent('change-user-name' as UI_OVERRIDE_TODO_EVENT, { source: 'people-menu' })
		rOriginalName.current = rCurrentName.current
	}, [trackEvent])

	return (
		<div className="tlui-people-menu__user">
			<UserPresenceColorPicker />
			{isEditingName ? (
				<TldrawUiInput
					className="tlui-people-menu__user__input"
					defaultValue={userName}
					onValueChange={handleValueChange}
					onComplete={toggleEditingName}
					onCancel={toggleEditingName}
					onBlur={handleBlur}
					shouldManuallyMaintainScrollPositionWhenFocused
					autoFocus
					autoSelect
				/>
			) : (
				<>
					<div
						className="tlui-people-menu__user__name"
						onDoubleClick={() => {
							if (!isEditingName) setIsEditingName(true)
						}}
					>
						{userName}
					</div>
					{userName === 'New User' ? (
						<div className="tlui-people-menu__user__label">{msg('people-menu.user')}</div>
					) : null}
				</>
			)}
			<TldrawUiButton
				type="icon"
				className="tlui-people-menu__user__edit"
				data-testid="people-menu.change-name"
				title={msg('people-menu.change-name')}
				onClick={toggleEditingName}
			>
				<TldrawUiButtonIcon icon={isEditingName ? 'check' : 'edit'} />
			</TldrawUiButton>
		</div>
	)
}
