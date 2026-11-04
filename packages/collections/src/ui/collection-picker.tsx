import {
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
} from 'tldraw'

/** @public */
export interface CollectionPickerProps<Id extends string = string> {
	/** `detail`, when given, follows the name in the list, e.g. the collection's group. */
	collections: { id: Id; name: string; detail?: string }[]
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
			<TldrawUiSelectContent className="tlui-collections-picker__content">
				{collections.map((collection) => (
					<TldrawUiSelectItem
						key={collection.id}
						value={collection.id}
						label={
							collection.detail ? `${collection.name} · ${collection.detail}` : collection.name
						}
					/>
				))}
			</TldrawUiSelectContent>
		</TldrawUiSelect>
	)
}
