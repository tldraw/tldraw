import useKeyboardEvents from 'hooks/useKeyboardEvents'
import useLoadOnMount from 'hooks/useLoadOnMount'
import Canvas from './canvas/canvas'
import StatusBar from './status-bar'
import ToolsPanel from './tools-panel/tools-panel'
import StylePanel from './style-panel/style-panel'
import styled from 'styles'
import PagePanel from './page-panel/page-panel'
import CodePanel from './code-panel/code-panel'
import ControlsPanel from './controls-panel/controls-panel'

export default function Editor({ roomId }: { roomId?: string }): JSX.Element {
  useKeyboardEvents()
  useLoadOnMount(roomId)

  return (
    <Layout>
      <CodePanel />
      <PagePanel />
      <ControlsPanel />
      <Spacer />
      <StylePanel />
      <Canvas />
      <ToolsPanel />
      <StatusBar />
    </Layout>
  )
}

const Spacer = styled('div', {
  flexGrow: 2,
})

const Layout = styled('main', {
  position: 'fixed',
  overflow: 'hidden',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  height: '100%',
  width: '100%',
  padding: '8px 8px 0 8px',
  zIndex: 200,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  pointerEvents: 'none',
  '& > *': {
    PointerEvent: 'all',
  },
})
