import { useEditor } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { TLUiActionItem, unwrapLabel } from '../../context/actions'
import { useCommandBarActions } from '../../hooks/useCommandBarActions'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'

export const COMMAND_BAR_ID = 'command bar'

export function DefaultCommmandBar() {
	const editor = useEditor()
	const [isOpen] = useMenuIsOpen(COMMAND_BAR_ID)
	const [selected, setSelected] = useState(-1)
	const [search, setSearch] = useState('')
	const actions = useCommandBarActions(search)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'Escape':
					editor.deleteOpenMenu(COMMAND_BAR_ID)
					break
				case 'Tab':
					if (e.shiftKey) {
						e.preventDefault()
						const next = selected - 1
						setSelected(next < 0 ? actions.length - 1 : next)
					} else {
						e.preventDefault()
						setSelected((selected + 1) % actions.length)
					}
					break
				case 'ArrowUp':
					{
						e.preventDefault()
						const next = selected - 1
						setSelected(next < 0 ? actions.length - 1 : next)
					}
					break
				case 'ArrowDown':
					e.preventDefault()
					setSelected((selected + 1) % actions.length)
					break

				case 'Enter': {
					const action = actions[selected]
					if (!action || !action.enabled?.()) return
					setSearch('')
					setSelected(-1)
					editor.deleteOpenMenu(COMMAND_BAR_ID)
					action.onSelect('command-bar')
					break
				}
			}
		},
		[editor, actions, selected]
	)

	if (!isOpen) return null

	return (
		<div className="tlui-command-bar__wrapper">
			<div className="tlui-command-bar__inner">
				<div className="tlui-command-bar__content">
					<div className="tlui-command-bar__content-inner" onKeyDown={handleKeyDown}>
						<input
							autoFocus
							type="text"
							value={search}
							placeholder="Search..."
							className="tlui-command-bar__input"
							onChange={(e) => {
								const value = e.target.value
								setSearch(value)
								if (selected === -1) {
									setSelected(0)
								}
								if (value === '') setSelected(-1)
							}}
						/>
						{actions.length !== 0 && <CommandBarItems actions={actions} selected={selected} />}
					</div>
				</div>
			</div>
		</div>
	)
}
function CommandBarItems({
	actions,
	selected,
}: {
	actions: TLUiActionItem<string, string>[]
	selected: number
}) {
	return (
		<div>
			{actions.slice(0, 6).map((action, index) => {
				return <CommandBarItem key={action.id} action={action} index={index} selected={selected} />
			})}
		</div>
	)
}

function CommandBarItem({
	action,
	index,
	selected,
}: {
	action: TLUiActionItem<string, string>
	index: number
	selected: number
}) {
	const msg = useTranslation()
	const { label, kbd } = action
	const enabled = action.enabled?.()

	const labelToUse = unwrapLabel(label, 'default')

	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	return (
		<div
			className="tlui-command-bar__item-wrapper"
			style={{
				color: enabled ? 'var(--color-text-1)' : '#aaa',
			}}
		>
			<div
				className="tlui-command-bar__item"
				style={{
					background: index === selected ? 'var(--color-hint)' : 'var(--color-background)',
				}}
			>
				<TldrawUiButton type="menu" disabled={!enabled}>
					<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
				</TldrawUiButton>
			</div>
			{selected === index && !enabled && action.disabledDescription && (
				<span className="tlui-command-bar__item-disabled-description">
					{action.disabledDescription}
				</span>
			)}
		</div>
	)
}
