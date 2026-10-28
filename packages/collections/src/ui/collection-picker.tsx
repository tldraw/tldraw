import {
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
} from 'tldraw'

/** @public */
export interface CollectionPickerProps<Id extends string = string> {
	collections: { id: Id; name: string }[]
	value: Id
	onValueChange(id: Id): void
	label: string
}

/** @public @react */
export function CollectionPicker<Id extends string>({
	collections,
	value,
	onValueChange,
	label,
}: CollectionPickerProps<Id>) {
	const current = collections.find((collection) => collection.id === value)

	return (
		<TldrawUiSelect
			id="collections-picker"
			className="tlui-collections-picker"
			value={value}
			// The select only reports values it was given, which are all collection ids.
			onValueChange={(value) => onValueChange(value as Id)}
			aria-label={label}
		>
			<TldrawUiSelectTrigger>
				<TldrawUiSelectValue>{current?.name}</TldrawUiSelectValue>
			</TldrawUiSelectTrigger>
			<TldrawUiSelectContent>
				{collections.map((collection) => (
					<TldrawUiSelectItem key={collection.id} value={collection.id} label={collection.name} />
				))}
			</TldrawUiSelectContent>
		</TldrawUiSelect>
	)
}
