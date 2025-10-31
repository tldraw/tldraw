import { useEditor, useValue } from '@tldraw/editor'
import { useCallback, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'
import { UserPresenceColorPicker } from './UserPresenceColorPicker'

export interface UserPresenceEditorProps {
	/** Whether users can change their color. Defaults to true. */
	allowChangeColor?: boolean
	/** Whether users can change their username. Defaults to true. */
	allowChangeName?: boolean
}

export function UserPresenceEditor({
	allowChangeColor = true,
	allowChangeName = true,
}: UserPresenceEditorProps) {
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
		trackEvent('change-user-name', { source: 'people-menu' })
		rOriginalName.current = rCurrentName.current
	}, [trackEvent])

	const handleCancel = useCallback(() => {
		setIsEditingName(false)
		editor.user.updateUserPreferences({ name: rOriginalName.current })
		editor.menus.clearOpenMenus()
	}, [editor])

	return (
		<div className="tlui-people-menu__user">
			{allowChangeColor && <UserPresenceColorPicker />}
			{allowChangeName && isEditingName ? (
				<TldrawUiInput
					className="tlui-people-menu__user__input"
					defaultValue={userName}
					onValueChange={handleValueChange}
					onComplete={toggleEditingName}
					onCancel={handleCancel}
					onBlur={handleBlur}
					shouldManuallyMaintainScrollPositionWhenFocused
					autoFocus
					autoSelect
				/>
			) : allowChangeName ? (
				<>
					<div
						className="tlui-people-menu__user__name"
						onDoubleClick={() => {
							if (!isEditingName) setIsEditingName(true)
						}}
					>
						{userName || msg('people-menu.anonymous-user')}
					</div>
					{!userName ? (
						<div className="tlui-people-menu__user__label">{msg('people-menu.user')}</div>
					) : null}
				</>
			) : (
				<div className="tlui-people-menu__user__name">
					{userName || msg('people-menu.anonymous-user')}
				</div>
			)}
			{allowChangeName && (
				<TldrawUiButton
					type="icon"
					className="tlui-people-menu__user__edit"
					data-testid="people-menu.change-name"
					title={msg('people-menu.change-name')}
					onClick={toggleEditingName}
				>
					<TldrawUiButtonIcon icon={isEditingName ? 'check' : 'edit'} />
				</TldrawUiButton>
			)}
		</div>
	)
}
