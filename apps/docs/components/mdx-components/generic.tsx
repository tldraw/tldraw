import React from 'react'

/* ---------------------- Lists --------------------- */

export const UnorderedList = (props: any) => {
	return <ul {...props} />
}

export const OrderedList = (props: any) => {
	return <ol {...props} />
}

export const ListItem = (props: any) => {
	return <li {...props} />
}

/* ------------------- Typography ------------------- */

type Heading = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

function heading(heading: Heading, props: any) {
	const Element = ({ ...props }) => React.createElement(heading, props)
	if (props.id) {
		return (
			<Element {...props}>
				<a className="anchor" href={`#${props.id}`}>
					{props.children}
				</a>
			</Element>
		)
	}

	return <Element {...props} />
}

export const Heading1 = (props: any) => {
	return heading('h1', props)
}

export const Heading2 = (props: any) => {
	return heading('h2', props)
}

export const Heading3 = (props: any) => {
	return heading('h3', props)
}

export const Heading4 = (props: any) => {
	return heading('h4', props)
}

export const Heading5 = (props: any) => {
	return heading('h5', props)
}

export const Heading6 = (props: any) => {
	return heading('h6', props)
}

export const Paragraph = (props: any) => {
	return <p {...props} />
}

export const A = (props: any) => {
	const isLocalUrl = props.href.startsWith('/') || props.href.startsWith('#')
	let maybeParsedUrl
	try {
		maybeParsedUrl = isLocalUrl ? null : new URL(props.href)
	} catch (e) {
		console.error(`Invalid URL: ${props.href}`)
	}
	const derivedTarget =
		isLocalUrl ||
		maybeParsedUrl?.host.includes('tldraw.com') ||
		maybeParsedUrl?.host.includes('localhost')
			? undefined
			: '_blank'
	const target = props.target ?? derivedTarget
	return <a {...props} target={target} />
}

export const Divider = (props: any) => {
	return <hr {...props} />
}

export const Blockquote = (props: any) => {
	return <blockquote {...props} />
}

export const Small = (props: any) => {
	return (
		<p className="article__small">
			<small {...props} />
		</p>
	)
}

/* --------------------- Tables --------------------- */

export const Table = (props: any) => {
	return <table {...props} />
}

export const THead = (props: any) => {
	return <thead {...props} />
}

export const TR = (props: any) => {
	return <tr {...props} />
}

export const TD = (props: any) => {
	return <td {...props} />
}

/* --------------------- Media --------------------- */

export const Image = (props: any) => {
	return (
		<a className="article__image" href={props.href ?? props.src}>
			<img alt={props.title} {...props} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</a>
	)
}

export const Video = (props: any) => {
	return (
		<span className="article__video">
			<video alt={props.title} {...props} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</span>
	)
}

/* ------------------- Code Blocks ------------------ */

export const Pre = (props: any) => {
	if (props.children?.props?.className.startsWith('language-')) {
		return props.children
	}

	return <pre {...props} />
}

export const Footnotes = (props: any) => {
	return <div {...props} />
}

/* -------------------- API docs -------------------- */

export const ApiHeading = (props: any) => {
	return <div className="article__api-heading uppercase_title" {...props} />
}

export const Embed = (props: any) => {
	return (
		<div className={props.className || 'article__embed'}>
			<iframe className="iframe" src={props.src} width="100%" height={600} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</div>
	)
}

/* -------------------- Callouts -------------------- */

export const Callout = ({ icon, children }: any) => {
	return (
		<div className="article__callout">
			<span>{icon}</span>
			<p>{children}</p>
		</div>
	)
}
