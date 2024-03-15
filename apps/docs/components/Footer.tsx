import dynamic from 'next/dynamic'
import { Icon } from './Icon'

const FancyBox = dynamic(async () => await import('./FancyBox'), { ssr: false })

export function Footer() {
	return (
		<div className="footer">
			<FancyBox />
			<a className="footer__lockup" href="https://tldraw.com">
				<span
					className="footer__lockup__icon"
					style={{
						mask: `url(/tldraw-icon.svg) center 100% / 100% no-repeat`,
						WebkitMask: `url(/tldraw-icon.svg) center 100% / 100% no-repeat`,
					}}
				/>
				<p>tldraw © {new Date().getFullYear()}</p>
			</a>
			<div className="footer__socials">
				<a href="https://x.com/tldraw" className="sidebar__button icon-button" title="x">
					<Icon icon="twitter" />
				</a>
				<a
					href="https://github.com/tldraw/tldraw"
					className="sidebar__button icon-button"
					title="github"
				>
					<Icon icon="github" />
				</a>
				<a
					href="https://discord.com/invite/SBBEVCA4PG"
					className="sidebar__button icon-button"
					title="discord"
				>
					<Icon icon="discord" />
				</a>
			</div>
		</div>
	)
}
