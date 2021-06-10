import useKeyboardEvents from 'hooks/useKeyboardEvents'
import useLoadOnMount from 'hooks/useLoadOnMount'
import Canvas from './canvas/canvas'
import StatusBar from './status-bar'
import CodePanel from './code-panel/code-panel'
import ControlsPanel from './controls-panel/controls-panel'
import ToolsPanel from './tools-panel/tools-panel'
import StylePanel from './style-panel/style-panel'
import { useSelector } from 'state'
import styled from 'styles'
import PagePanel from './page-panel/page-panel'
import ContextMenu from './context-menu'

export default function Editor() {
  useKeyboardEvents()
  useLoadOnMount()

  const hasControls = useSelector(
    (s) => Object.keys(s.data.codeControls).length > 0
  )

  return (
    <Layout>
      <CodePanel />
      <PagePanel />
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
