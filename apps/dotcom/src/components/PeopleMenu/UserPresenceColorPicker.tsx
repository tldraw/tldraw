import * as Popover from '@radix-ui/react-popover'
import {
	Button,
	USER_COLORS,
	track,
	useContainer,
	useEditor,
	useTranslation,
	useUiEvents,
} from '@tldraw/tldraw'
import React, { useCallback, useRef, useState } from 'react'
import { UI_OVERRIDE_TODO_EVENT } from '../../utils/useHandleUiEvent'

export const UserPresenceColorPicker = track(function UserPresenceColorPicker() {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const rPointing = useRef(false)

	const [isOpen, setIsOpen] = useState(false)
	const handleOpenChange = useCallback((isOpen: boolean) => {
		setIsOpen(isOpen)
	}, [])

	const value = editor.user.getColor()

	const onValueChange = useCallback(
		(item: string) => {
			editor.user.updateUserPreferences({ color: item })
			trackEvent('set-color' as UI_OVERRIDE_TODO_EVENT, { source: 'people-menu' })
		},
		[editor, trackEvent]
	)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
	} = React.useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			window.removeEventListener('pointerup', handlePointerUp)
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return
			if (value === id) return

			onValueChange(id)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return

			onValueChange(id)

			rPointing.current = true
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			if (!id) return
			onValueChange(id)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return
			onValueChange(id)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
		}
	}, [value, onValueChange])

	return (
		<Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
			<Popover.Trigger dir="ltr" asChild>
				<Button
					type="icon"
					className="tlui-people-menu__user__color"
					icon="color"
					style={{ color: editor.user.getColor() }}
					title={msg('people-menu.change-color')}
				/>
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Content
					dir="ltr"
					className="tlui-menu tlui-people-menu__user__color-picker"
					align="start"
					side="left"
					sideOffset={8}
				>
					<div className={'tlui-buttons__grid'}>
						{USER_COLORS.map((item: string) => (
							<Button
								type="icon"
								key={item}
								data-id={item}
								data-wd={item}
								aria-label={item}
								data-state={value === item ? 'hinted' : undefined}
								title={item}
								className={'tlui-button-grid__button'}
								style={{ color: item }}
								onPointerEnter={handleButtonPointerEnter}
								onPointerDown={handleButtonPointerDown}
								onPointerUp={handleButtonPointerUp}
								onClick={handleButtonClick}
								icon={'color'}
							/>
						))}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})
