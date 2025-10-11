import { PlusIcon } from 'lucide-react'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'

export function SidebarNewWorkspaceButton({ id, onSelect }: { id: string; onSelect: () => void }) {
	return (
		<button
			onClick={onSelect}
			data-testid={`create-workspace-${id}`}
			className={`${SIDEBAR_ITEM_HOVERABLE} pl-3 w-full text-left text-foreground/60 hover:text-foreground`}
		>
			New workspace
			<PlusIcon className="size-3 ml-1.5" />
		</button>
	)
}
