export function SidebarNewDocumentButton({ id, onSelect }: { id: string; onSelect: () => void }) {
	return (
		<button
			onClick={onSelect}
			data-testid={`create-document-${id}`}
			className="w-full px-2 py-1 text-sm text-left rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground flex items-center gap-1"
		>
			<span className="text-xs">+</span> New Document
		</button>
	)
}
