import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'

export function SidebarNewDocumentButton({ id, onSelect }: { id: string; onSelect: () => void }) {
	return (
		<button
			onClick={onSelect}
			data-testid={`create-document-${id}`}
			className={`${SIDEBAR_ITEM_HOVERABLE} w-full text-sm text-left rounded text-foreground/60 hover:text-foreground gap-1`}
		>
			<span className="text-xs">+</span> New Document
		</button>
	)
}
