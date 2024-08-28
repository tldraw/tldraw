import { useEditor } from '@tldraw/editor'
import classNames from 'classnames'
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
const MAX_ITEMS = 6

function getNext(current: number, max: number) {
	const next = current - 1
	return next < 0 ? max - 1 : next
}

function getPrevious(current: number, max: number) {
	return (current + 1) % max
}

/** @public @react */
export function DefaultCommmandBar() {
	const editor = useEditor()
	const msg = useTranslation()
	const [isOpen] = useMenuIsOpen(COMMAND_BAR_ID)
	const [selected, setSelected] = useState(-1)
	const [search, setSearch] = useState('')
	const actions = useCommandBarActions(search)
	const numItems = Math.min(actions.length, MAX_ITEMS)

	const close = useCallback(() => {
		setSelected(-1)
		setSearch('')
		editor.deleteOpenMenu(COMMAND_BAR_ID)
	}, [editor])

	const onSelect = useCallback(
		(index: number) => {
			const action = actions[index]
			if (!action || !action.enabled?.()) return
			close()
			action.onSelect('command-bar')
		},
		[actions, close]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'Escape':
					close()
					break
				case 'Tab':
					if (e.shiftKey) {
						e.preventDefault()
						setSelected(getNext(selected, numItems))
					} else {
						e.preventDefault()
						setSelected(getPrevious(selected, numItems))
					}
					break
				case 'ArrowUp':
					e.preventDefault()
					setSelected(getNext(selected, numItems))
					break
				case 'ArrowDown':
					e.preventDefault()
					setSelected(getPrevious(selected, numItems))
					break
				case 'Enter': {
					onSelect(selected)
					break
				}
			}
		},
		[close, selected, numItems, onSelect]
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
							placeholder={msg('command-bar.placeholder')}
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
						{actions.length !== 0 && (
							<CommandBarItems actions={actions} selected={selected} onSelect={onSelect} />
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
function CommandBarItems({
	actions,
	selected,
	onSelect,
}: {
	actions: TLUiActionItem<string, string>[]
	selected: number
	onSelect(index: number): void
}) {
	return (
		<>
			{actions.slice(0, MAX_ITEMS).map((action, index) => {
				return (
					<CommandBarItem
						key={action.id}
						action={action}
						index={index}
						selected={selected}
						onSelect={onSelect}
					/>
				)
			})}
		</>
	)
}

function CommandBarItem({
	action,
	index,
	selected,
	onSelect,
}: {
	action: TLUiActionItem<string, string>
	index: number
	selected: number
	onSelect(index: number): void
}) {
	const msg = useTranslation()
	const { label, kbd } = action
	const enabled = action.enabled?.()

	const labelToUse = unwrapLabel(label, 'command-bar')

	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined
	const isSelected = selected === index
	const showDisabledDescription = isSelected && !enabled && action.disabledDescription

	return (
		<div className="tlui-command-bar__item-wrapper">
			<div
				className={classNames('tlui-command-bar__item', {
					'tlui-command-bar__item-selected': isSelected,
				})}
			>
				<TldrawUiButton type="menu" disabled={!enabled} onClick={() => onSelect(index)}>
					<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
					{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
				</TldrawUiButton>
			</div>
			{showDisabledDescription && (
				<span className="tlui-command-bar__item-disabled-description">
					{action.disabledDescription}
				</span>
			)}
		</div>
	)
}
