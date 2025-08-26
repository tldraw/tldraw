import { PromptTag } from './PromptTag'

export function SelectionTag({ count, onClick }: { count: number; onClick?: () => void }) {
	if (count === 0) {
		return null
	}

	return (
		<PromptTag
			text={`${count} ${count === 1 ? 'shape' : 'shapes'}`}
			icon="cursor"
			onClick={onClick}
		/>
	)
}
