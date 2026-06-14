// Renders the pre-dithered hey.png (`/desktop/hey-dithered.png`) as a
// CSS mask over a foreground-coloured fill. The PNG is already 1-bit
// black-on-transparent with an ordered Bayer dither, so the result
// scales with the desktop colour theme and reads as a classic-Mac
// dithered watermark without any inline SVG trickery.
export function Wallpaper() {
	return (
		<div className="desktop__wallpaper" aria-hidden="true">
			<div className="desktop__wallpaper-ink" />
		</div>
	)
}
