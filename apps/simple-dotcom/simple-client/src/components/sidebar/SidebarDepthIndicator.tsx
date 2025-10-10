export function SidebarDepthIndicator({ depth }: { depth: number }) {
	return Array.from({ length: depth + 1 }).map((_, i) => (
		<span key={i} className="block ml-2 mr-2 h-full w-[1px] bg-foreground/10 rounded-xs" />
	))
}
