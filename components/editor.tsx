import useKeyboardEvents from 'hooks/useKeyboardEvents'
import useLoadOnMount from 'hooks/useLoadOnMount'
import useStateTheme from 'hooks/useStateTheme'
import Menu from './menu/menu'
import Canvas from './canvas/canvas'
import ToolsPanel from './tools-panel/tools-panel'
import StylePanel from './style-panel/style-panel'
import styled from 'styles'
import PagePanel from './page-panel/page-panel'
import CodePanel from './code-panel/code-panel'
import DebugPanel from './debug-panel/debug-panel'
import ControlsPanel from './controls-panel/controls-panel'

export default function Editor({ roomId }: { roomId?: string }): JSX.Element {
  useKeyboardEvents()
  useLoadOnMount(roomId)
  useStateTheme()

  return (
    <Layout>
      <MenuButtons>
        <Menu />
        <DebugPanel />
        <CodePanel />
        <PagePanel />
      </MenuButtons>
      <ControlsPanel />
      <Spacer />
      <StylePanel />
      <Canvas />
      <ToolsPanel />
    </Layout>
  )
}

const Spacer = styled('div', {
  flexGrow: 2,
})

const MenuButtons = styled('div', {
  display: 'flex',
  gap: 8,
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
  boxSizing: 'border-box',

  pointerEvents: 'none',
  '& > *': {
    PointerEvent: 'all',
  },
})
