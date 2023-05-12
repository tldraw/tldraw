import { preventDefault, useApp } from '@tldraw/editor'
import classNames from 'classnames'
import React from 'react'
import { track, useValue } from 'signia-react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useReadonly } from '../../hooks/useReadonly'
import { ToolbarItem, useToolbarSchema } from '../../hooks/useToolbarSchema'
import { ToolItem } from '../../hooks/useTools'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { ActionsMenu } from '../ActionsMenu'
import { DuplicateButton } from '../DuplicateButton'
import { MobileStylePanel } from '../MobileStylePanel'
import { RedoButton } from '../RedoButton'
import { TrashButton } from '../TrashButton'
import { UndoButton } from '../UndoButton'
import { Button } from '../primitives/Button'
import * as M from '../primitives/DropdownMenu'
import { kbdStr } from '../primitives/shared'
import { ToggleToolLockedButton } from './ToggleToolLockedButton'

/** @public */
export const Toolbar = function Toolbar() {
	const app = useApp()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	const rMostRecentlyActiveDropdownItem = React.useRef<ToolbarItem | undefined>(undefined)

	const isReadOnly = useReadonly()
	const toolbarItems = useToolbarSchema()

	const activeToolId = useValue('current tool id', () => app.currentToolId, [app])

	const isHandTool = activeToolId === 'hand'
	const geoState = useValue('geo', () => (app.props ? app.props.geo : undefined), [app])

	const showEditingTools = !isReadOnly
	const showExtraActions = !(isReadOnly || isHandTool)

	const getTitle = (item: ToolItem) =>
		item.label ? `${msg(item.label)} ${item.kbd ? kbdStr(item.kbd) : ''}` : ''

	const activeToolbarItem = toolbarItems.find((item) => {
		return isActiveToolItem(item.toolItem, activeToolId, geoState)
	})

	const { itemsInPanel, itemsInDropdown, dropdownFirstItem } = React.useMemo(() => {
		const itemsInPanel: ToolbarItem[] = []
		const itemsInDropdown: ToolbarItem[] = []
		let dropdownFirstItem: ToolbarItem | undefined

		const overflowIndex = Math.min(8, 5 + breakpoint)

		for (let i = 4; i < toolbarItems.length; i++) {
			const item = toolbarItems[i]
			if (i < overflowIndex) {
				// Items below the overflow index will always be in the panel
				itemsInPanel.push(item)
			} else {
				// Items above will be in the dropdown menu unless the item
				// is active (or was the most recently selected active item)
				if (item === activeToolbarItem) {
					// If the dropdown item is active, make it the dropdownFirstItem
					dropdownFirstItem = item
				}
				// Otherwise, add it to the items in dropdown menu
				itemsInDropdown.push(item)
			}
		}

		if (dropdownFirstItem) {
			// noop
		} else {
			// If we don't have a currently active dropdown item, use the most
			// recently active dropdown item as the current dropdown first item.

			// If haven't ever had a most recently active dropdown item, then
			// make the first item in the dropdown menu the most recently
			// active dropdown item.
			if (!rMostRecentlyActiveDropdownItem.current) {
				rMostRecentlyActiveDropdownItem.current = itemsInDropdown[0]
			}

			dropdownFirstItem = rMostRecentlyActiveDropdownItem.current

			// If the most recently active dropdown item is no longer in the
			// dropdown (because the breakpoint has changed) then make the
			// first item in the dropdown menu the most recently active
			// dropdown item.
			if (!itemsInDropdown.includes(dropdownFirstItem)) {
				dropdownFirstItem = itemsInDropdown[0]
			}
		}

		// We want this ref set to remember which item from the current
		// set of dropdown items was most recently active
		rMostRecentlyActiveDropdownItem.current = dropdownFirstItem

		if (itemsInDropdown.length <= 2) {
			itemsInPanel.push(...itemsInDropdown)
			itemsInDropdown.length = 0
		}

		return { itemsInPanel, itemsInDropdown, dropdownFirstItem }
	}, [toolbarItems, activeToolbarItem, breakpoint])

	return (
		<div className="tlui-toolbar">
			<div className="tlui-toolbar__inner">
				<div className="tlui-toolbar__left">
					{!isReadOnly && (
						<div
							className={classNames('tlui-toolbar__extras', {
								'tlui-toolbar__extras__hidden': !showExtraActions,
							})}
						>
							{breakpoint < 5 && (
								<div className="tlui-toolbar__extras__controls">
									<UndoButton />
									<RedoButton />
									<TrashButton />
									<DuplicateButton />
									<ActionsMenu />
								</div>
							)}
							<ToggleToolLockedButton activeToolId={activeToolId} />
						</div>
					)}
					<div
						className={classNames('tlui-toolbar__tools', {
							'tlui-toolbar__tools__mobile': breakpoint < 5,
						})}
					>
						{/* Select / Hand */}
						{toolbarItems.slice(0, 2).map(({ toolItem }) => {
							return (
								<ToolbarButton
									key={toolItem.id}
									item={toolItem}
									title={getTitle(toolItem)}
									isSelected={isActiveToolItem(toolItem, activeToolId, geoState)}
								/>
							)
						})}
						{showEditingTools && (
							<>
								{/* Draw / Eraser */}
								<div className="tlui-toolbar__divider" />
								{toolbarItems.slice(2, 4).map(({ toolItem }) => (
									<ToolbarButton
										key={toolItem.id}
										item={toolItem}
										title={getTitle(toolItem)}
										isSelected={isActiveToolItem(toolItem, activeToolId, geoState)}
									/>
								))}
								{/* Everything Else */}
								<div className="tlui-toolbar__divider" />
								{itemsInPanel.map(({ toolItem }) => (
									<ToolbarButton
										key={toolItem.id}
										item={toolItem}
										title={getTitle(toolItem)}
										isSelected={isActiveToolItem(toolItem, activeToolId, geoState)}
									/>
								))}
								{/* Overflowing Shapes */}
								{itemsInDropdown.length ? (
									<>
										{/* Last selected (or first) item from the overflow */}
										<ToolbarButton
											key={dropdownFirstItem.toolItem.id}
											item={dropdownFirstItem.toolItem}
											title={getTitle(dropdownFirstItem.toolItem)}
											isSelected={isActiveToolItem(
												dropdownFirstItem.toolItem,
												activeToolId,
												geoState
											)}
										/>
										{/* The dropdown to select everything else */}
										<M.Root id="toolbar overflow" modal={false}>
											<M.Trigger>
												<Button
													className="tlui-toolbar__tools__button tlui-toolbar__overflow"
													icon="chevron-up"
													data-wd="tools.more"
													title={msg('tool-panel.more')}
												/>
											</M.Trigger>
											<M.Content side="top" align="center">
												<OverflowToolsContent toolbarItems={itemsInDropdown} />
											</M.Content>
										</M.Root>
									</>
								) : null}
							</>
						)}
					</div>
				</div>
				{breakpoint < 5 && !isReadOnly && (
					<div className="tlui-toolbar__tools">
						<MobileStylePanel />
					</div>
				)}
			</div>
		</div>
	)
}

const OverflowToolsContent = track(function OverflowToolsContent({
	toolbarItems,
}: {
	toolbarItems: ToolbarItem[]
}) {
	const msg = useTranslation()

	return (
		<div className="tlui-button-grid__four tlui-button-grid__reverse">
			{toolbarItems.map(({ toolItem: { id, meta, kbd, label, onSelect, icon } }) => {
				return (
					<M.Item
						key={id}
						className="tlui-button-grid__button"
						data-wd={`tools.${id}`}
						data-tool={id}
						data-geo={meta?.geo ?? ''}
						aria-label={label}
						onClick={() => onSelect('toolbar')}
						title={label ? `${msg(label)} ${kbd ? kbdStr(kbd) : ''}` : ''}
						icon={icon}
					/>
				)
			})}
		</div>
	)
})

function ToolbarButton({
	item,
	title,
	isSelected,
}: {
	item: ToolItem
	title: string
	isSelected: boolean
}) {
	return (
		<Button
			className="tlui-toolbar__tools__button"
			data-wd={`tools.${item.id}`}
			data-tool={item.id}
			data-geo={item.meta?.geo ?? ''}
			aria-label={item.label}
			title={title}
			icon={item.icon}
			data-state={isSelected ? 'selected' : undefined}
			onClick={() => item.onSelect('toolbar')}
			onTouchStart={(e) => {
				preventDefault(e)
				item.onSelect('toolbar')
			}}
		/>
	)
}

const isActiveToolItem = (
	item: ToolItem,
	activeToolId: string | undefined,
	geoState: string | null | undefined
) => {
	return item.meta?.geo
		? activeToolId === 'geo' && geoState === item.meta?.geo
		: activeToolId === item.id
}
