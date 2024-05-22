import {
	Combobox,
	ComboboxCancel,
	ComboboxGroup,
	ComboboxGroupLabel,
	ComboboxItem,
	ComboboxItemValue,
	ComboboxPopover,
	ComboboxProvider,
} from '@ariakit/react'
import { ComponentType, ForwardedRef, forwardRef, startTransition, useState } from 'react'
import './Autocomplete.css'
import { Icon } from './Icon'
import { Spinner } from './Spinner'

export interface DropdownOption {
	label: string
	value: string
	group?: string
}

interface AutocompleteProps {
	customUI?: React.ReactNode
	groups?: string[]
	groupsToIcon?: {
		[key: string]: ComponentType<{
			className?: string
		}>
	}
	groupsToLabel?: { [key: string]: string }
	isLoading: boolean
	options: DropdownOption[]
	onChange: (value: string) => void
	onInputChange: (value: string) => void
}

const DEFAULT_GROUP = 'autocomplete-default'

const Autocomplete = forwardRef(function Autocomplete(
	{
		customUI,
		groups = [DEFAULT_GROUP],
		groupsToIcon,
		groupsToLabel,
		isLoading,
		options,
		onInputChange,
		onChange,
	}: AutocompleteProps,
	ref: ForwardedRef<HTMLInputElement>
) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState('')

	const renderedGroups = groups.map((group) => {
		const filteredOptions = options.filter(
			({ group: optionGroup }) => optionGroup === group || group === DEFAULT_GROUP
		)
		if (filteredOptions.length === 0) return null

		return (
			<ComboboxGroup key={group}>
				{groupsToLabel?.[group] && (
					<ComboboxGroupLabel key={`${group}-group`} className="autocomplete__group">
						{groupsToLabel[group]}
					</ComboboxGroupLabel>
				)}
				{filteredOptions.map(({ label, value }) => {
					const Icon = groupsToIcon?.[group]
					return (
						<ComboboxItem key={`${label}-${value}`} className="autocomplete__item" value={value}>
							{Icon && <Icon className="autocomplete__item__icon" />}
							<ComboboxItemValue value={label} />
						</ComboboxItem>
					)
				})}
			</ComboboxGroup>
		)
	})

	return (
		<ComboboxProvider<string>
			defaultSelectedValue=""
			open={open}
			setOpen={setOpen}
			resetValueOnHide
			includesBaseElement={false}
			setValue={(newValue) => {
				startTransition(() => setValue(newValue))
				onInputChange(newValue)
			}}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div className="autocomplete__wrapper">
				{isLoading ? (
					<Spinner className="autocomplete__icon" />
				) : (
					<Icon className="autocomplete__icon" icon="search" small />
				)}

				<Combobox placeholder="Search…" ref={ref} className="autocomplete__input" value={value} />

				{value && <ComboboxCancel className="autocomplete__cancel" />}

				{value && options.length !== 0 && (
					<ComboboxPopover sameWidth className="autocomplete__popover">
						{customUI}
						{renderedGroups}
					</ComboboxPopover>
				)}
			</div>
		</ComboboxProvider>
	)
})

export { Autocomplete }
