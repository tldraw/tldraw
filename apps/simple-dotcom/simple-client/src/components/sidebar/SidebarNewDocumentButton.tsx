import { PlusIcon } from 'lucide-react'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'
import { SidebarDepthIndicator } from './SidebarDepthIndicator'

export function SidebarNewDocumentButton({
	id,
	onSelect,
	depth,
}: {
	id: string
	onSelect: () => void
	depth: number
}) {
	return (
		<button
			onClick={onSelect}
			data-testid={`create-document-${id}`}
			className={`${SIDEBAR_ITEM_HOVERABLE} pl-2 w-full text-left text-foreground/60 hover:text-foreground`}
		>
			<SidebarDepthIndicator depth={depth} />
			New document
			<PlusIcon className="size-3 ml-1.5" />
		</button>
	)
}
