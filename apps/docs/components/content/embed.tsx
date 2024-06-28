export const Embed = (props: any) => {
	return (
		<div className={props.className || 'article__embed'}>
			<iframe className="iframe" src={props.src} width="100%" height={600} />
			{props.caption && <span className="article__caption">{props.caption}</span>}
		</div>
	)
}
