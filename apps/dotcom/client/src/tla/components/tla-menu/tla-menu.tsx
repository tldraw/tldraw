import {
	TldrawUiMenuControl,
	TldrawUiMenuControlGroup,
	TldrawUiMenuControlInfoTooltip,
	TldrawUiMenuControlLabel,
	TldrawUiMenuDetail,
	TldrawUiMenuSection,
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
	TldrawUiSwitch,
	TldrawUiTabsPage,
	TldrawUiTabsRoot,
	TldrawUiTabsTab,
	TldrawUiTabsTabs,
	TldrawUiTooltip,
} from '@tldraw/ui'
import { HTMLAttributes, ReactNode, useCallback } from 'react'
import styles from './menu.module.css'

/**
 * Shared positioning for tla dropdowns, popovers, and selects so they sit consistently
 * relative to their triggers. Spread onto a Radix/SDK content element (e.g.
 * `{...TLA_MENU_POSITION}`); tweak here to adjust every tla menu at once. `side` and
 * `align` stay per-menu since they depend on the trigger's placement.
 */
export const TLA_MENU_POSITION = {
	sideOffset: 4,
	alignOffset: -4,
	collisionPadding: 4,
} as const

// Used to section areas of the menu, ie links vs snapshots
export { TldrawUiMenuSection as TlaMenuSection }

// Used to group together adjacent controls, ie switches or selects
export { TldrawUiMenuControlGroup as TlaMenuControlGroup }

// A row for a single control, usually label + input
export { TldrawUiMenuControl as TlaMenuControl }

// An info button for a single control
export { TldrawUiMenuControlInfoTooltip as TlaMenuControlInfoTooltip }

// A label for a control
export { TldrawUiMenuControlLabel as TlaMenuControlLabel }

// A detail
export { TldrawUiMenuDetail as TlaMenuDetail }

/* --------------------- Select --------------------- */

export function TlaMenuSelect<T extends string>({
	id,
	label,
	value,
	disabled,
	onChange,
	options,
	actions,
	'data-testid': dataTestId,
}: {
	id: string
	label: string
	value: T
	disabled?: boolean
	onChange(value: T): void
	options: { value: T; label: ReactNode; disabled?: boolean }[]
	// Extra actions shown in their own section below the options (e.g. a
	// destructive "remove"). Selecting one runs its onSelect instead of onChange.
	actions?: {
		id: string
		label: ReactNode
		onSelect(): void
		destructive?: boolean
		disabled?: boolean
		// Shown on hover when the action is disabled (e.g. why it can't be used).
		tooltip?: ReactNode
	}[]
	'data-testid'?: string
}) {
	const handleChange = useCallback(
		(value: string) => {
			const action = actions?.find((a) => a.id === value)
			if (action) {
				if (!action.disabled) action.onSelect()
				return
			}
			onChange(value as T)
		},
		[actions, onChange]
	)

	return (
		<div className={styles.menuSelectWrapper}>
			<TldrawUiSelect
				id={`${id}-menu`}
				value={value}
				onValueChange={handleChange}
				disabled={disabled}
				aria-label={label}
			>
				<TldrawUiSelectTrigger
					id={id}
					className={styles.menuSelectTrigger}
					data-testid={dataTestId}
				>
					<TldrawUiSelectValue>{label}</TldrawUiSelectValue>
				</TldrawUiSelectTrigger>
				<TldrawUiSelectContent className={styles.menuSelectContent} side="bottom" align="end">
					{options.map((option) => (
						<TldrawUiSelectItem
							key={option.value}
							value={option.value}
							label={option.label}
							disabled={option.disabled}
							className={styles.menuSelectOption}
						/>
					))}
					{actions && actions.length > 0 && (
						<>
							<div className={styles.menuSelectSeparator} role="separator" />
							{actions.map((action) => {
								const item = (
									<TldrawUiSelectItem
										key={action.id}
										value={action.id}
										label={action.label}
										disabled={action.disabled}
										destructive={action.destructive}
										className={styles.menuSelectOption}
									/>
								)
								if (!action.tooltip) return item
								return (
									<TldrawUiTooltip key={action.id} content={action.tooltip}>
										{item}
									</TldrawUiTooltip>
								)
							})}
						</>
					)}
				</TldrawUiSelectContent>
			</TldrawUiSelect>
		</div>
	)
}

/* --------------------- Switch --------------------- */

interface TlaMenuSwitchProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
	id: string
	checked: boolean
	onChange?(checked: boolean): void
	disabled?: boolean
}

export function TlaMenuSwitch({
	id,
	checked,
	onChange,
	disabled,
	'aria-label': ariaLabel,
	...props
}: TlaMenuSwitchProps) {
	return (
		<TldrawUiSwitch
			{...props}
			id={id}
			checked={checked}
			onCheckedChange={onChange}
			disabled={disabled}
			label={ariaLabel}
		/>
	)
}

/* ---------------------- Tabs ---------------------- */

/*
This is a set of primitives for creating tabs in the UI. Structure is:

<Root>
	<Tabs>
		<Tab/>
		...
	</Tabs>
	<Page/>
	...
</Root>
*/

export { TldrawUiTabsRoot as TlaMenuTabsRoot }
export { TldrawUiTabsTabs as TlaMenuTabsTabs }
export { TldrawUiTabsTab as TlaMenuTabsTab }
export { TldrawUiTabsPage as TlaMenuTabsPage }
