import { staticFile } from 'remotion'

export const Logo: React.FC<{ height?: number }> = ({ height = 72 }) => {
	return <img src={staticFile('tldraw.svg')} style={{ height }} alt="tldraw" />
}
