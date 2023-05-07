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

export const Heading1 = (props: any) => {
	return <h1 {...props} />
}

export const Heading2 = (props: any) => {
	return <h2 {...props} />
}

export const Heading3 = (props: any) => {
	return <h3 {...props} />
}

export const Heading4 = (props: any) => {
	return <h4 {...props} />
}

export const Heading5 = (props: any) => {
	return <h5 {...props} />
}

export const Heading6 = (props: any) => {
	return <h6 {...props} />
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
