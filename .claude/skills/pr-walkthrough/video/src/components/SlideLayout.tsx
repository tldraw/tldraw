import { AbsoluteFill } from 'remotion'
import { slideBase } from '../styles'

export const SlideLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <AbsoluteFill style={slideBase}>{children}</AbsoluteFill>
}
