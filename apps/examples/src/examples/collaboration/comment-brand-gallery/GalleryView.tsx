import { StyledThread } from './StyledThread'
import { BrandTheme, isDarkTheme } from './themes'

/**
 * The style grid: the same demo thread rendered once per style so the range is visible side by
 * side, each on a checkerboard floor that shows the export's transparency at a glance. The tiles
 * are presentational — the parent owns the theme list (including the live custom style), the
 * stage refs (for rasterizing), and the export buttons' behavior.
 */
export function GalleryView({
	themes,
	registerStage,
	onExport,
	onCustomize,
}: {
	themes: BrandTheme[]
	/** Called with each tile's stage node (and null on unmount) — the node that gets rasterized. */
	registerStage(themeId: string, node: HTMLDivElement | null): void
	onExport(themeId: string): void
	/** Opens the custom style's configurator (shown on the custom tile only). */
	onCustomize(): void
}) {
	return (
		<div className="bcg-gallery">
			{themes.map((theme) => (
				<div key={theme.id} className="bcg-tile">
					<div className="bcg-tile__head">
						<span className="bcg-tile__name">{theme.name}</span>
						<span className="bcg-tile__tagline">{theme.tagline}</span>
						{theme.id === 'custom' && (
							<button className="bcg-btn" onClick={onCustomize}>
								Edit
							</button>
						)}
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
