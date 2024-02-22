import Link from 'next/link'

export default async function HomePage() {
	return (
		<div className="landing">
			<div className="landing__inner">
				<Link className="landing__logo" href="/introduction">
					<img className="logo-dark" src="/tldraw_dev_dark.png" />
					<img className="logo-light" src="/tldraw_dev_light.png" />
				</Link>
				<ul className="landing__links">
					<li>
						<Link href="/introduction">Docs</Link>
					</li>
					<li>
						<Link href="/examples">Examples</Link>
					</li>
					<li>
						<a href="https://github.com/tldraw/tldraw">GitHub</a>
					</li>
				</ul>
			</div>
		</div>
	)
}
