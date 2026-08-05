import { StyledThread } from './StyledThread'
import { BRAND_THEMES, isDarkTheme } from './themes'

/**
 * The style grid: the same demo thread rendered once per style so the range is visible side by
 * side, each on a checkerboard floor that shows the export's transparency at a glance. The tiles
 * are presentational — the parent owns the stage refs (for rasterizing) and the export buttons'
 * behavior.
 */
export function GalleryView({
	registerStage,
	onExport,
}: {
	/** Called with each tile's stage node (and null on unmount) — the node that gets rasterized. */
	registerStage(themeId: string, node: HTMLDivElement | null): void
	onExport(themeId: string): void
}) {
	return (
		<div className="bcg-gallery">
			{BRAND_THEMES.map((theme) => (
				<div key={theme.id} className="bcg-tile">
					<div className="bcg-tile__head">
						<span className="bcg-tile__name">{theme.name}</span>
						<span className="bcg-tile__tagline">{theme.tagline}</span>
						<button className="bcg-btn" onClick={() => onExport(theme.id)}>
							PNG
						</button>
					</div>
					<div className="bcg-tile__floor" data-dark={isDarkTheme(theme)}>
						<div
							className="brand-stage"
							data-comment-theme={theme.id}
							ref={(node) => registerStage(theme.id, node)}
						>
							<StyledThread />
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
