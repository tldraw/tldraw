import { assetUrl } from '@/utils/asset-url'

/**
 * Hero image with CSS mask — MDX cannot run `assetUrl` inside inline `style` strings, so paths in
 * `mask: url(/images/…)` would stay root-relative and break when docs use `ASSET_PREFIX`.
 */
export function MaskedArticleImage(props: { gifSrc: string; maskSrc: string; alt: string }) {
	const gif = assetUrl(props.gifSrc)
	const mask = assetUrl(props.maskSrc)
	const maskCss = `url(${mask}) luminance center 100% / 100% no-repeat`

	return (
		<div className="article__image" style={{ border: 'none' }}>
			<img alt={props.alt} src={gif} style={{ mask: maskCss, WebkitMask: maskCss }} />
		</div>
	)
}
