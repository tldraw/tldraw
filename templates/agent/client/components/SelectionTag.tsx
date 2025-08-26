import { PromptTag } from './PromptTag'

export function SelectionTag({ onClick }: { onClick?: () => void }) {
	return <PromptTag text="Selection" icon="cursor" onClick={onClick} />
}
