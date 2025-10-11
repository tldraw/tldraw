import { PlusIcon } from 'lucide-react'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'
import { SidebarDepthIndicator } from './SidebarDepthIndicator'

export function SidebarNewDocumentButton({ id, onSelect }: { id: string; onSelect: () => void }) {
	return (
		<button
			onClick={onSelect}
			data-testid={`create-document-${id}`}
			className={`${SIDEBAR_ITEM_HOVERABLE} w-full text-left rounded text-foreground/60 hover:text-foreground`}
		>
			<SidebarDepthIndicator depth={0} />
			New document
			<PlusIcon className="size-4 ml-1.5" />
		</button>
	)
}
