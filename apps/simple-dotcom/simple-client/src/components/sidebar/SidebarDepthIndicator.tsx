export function SidebarDepthIndicator({ depth }: { depth: number }) {
	return Array.from({ length: depth }).map((_, i) => (
		<div key={i} className="depth-indicator block ml-2 mr-2 h-full">
			<div className="h-full w-[1px] bg-foreground/10 " />
		</div>
	))
}
