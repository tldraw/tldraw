import { usePathname } from 'next/navigation'

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

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const Heading = ({ level, ...props }: { level: HeadingTag; [key: string]: any }) => {
	const pathname = usePathname()
	const Element = level
	if (props.id) {
		return (
			<Element {...props}>
				<a href={`${pathname}#${props.id}`}>{props.children}</a>
			</Element>
		)
	}

	return <Element {...props} />
}

export const Heading1 = (props: any) => {
	return <Heading level="h1" {...props} />
}

export const Heading2 = (props: any) => {
	return <Heading level="h2" {...props} />
}

export const Heading3 = (props: any) => {
	return <Heading level="h3" {...props} />
}

export const Heading4 = (props: any) => {
	return <Heading level="h4" {...props} />
}

export const Heading5 = (props: any) => {
	return <Heading level="h5" {...props} />
}

export const Heading6 = (props: any) => {
	return <Heading level="h6" {...props} />
}

export const Paragraph = (props: any) => {
	return <p {...props} />
}

export const A = (props: any) => {
	return <a {...props} />
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
		<span className="artcle__image">
			<img alt={props.title} {...props} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</span>
	)
}

export const Video = (props: any) => {
	return (
		<span className="artcle__video">
			<video alt={props.title} {...props} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</span>
	)
}

/* ------------------- Code Blocks ------------------ */

export const Pre = (props: any) => {
	return <pre {...props} />
}

export const Code = (props: any) => {
	return <code {...props} />
}

export const Footnotes = (props: any) => {
	return <div {...props} />
}
