import { FormattedMessage } from 'react-intl'
import { ToolButton } from '~components/Primitives/ToolButton'
import { ZoomMenu } from '~components/TopPanel/ZoomMenu'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'

export const CustomZoomButton = () => {
  const app = useTldrawApp()

  return (
    <StyledCustomZoomButton>
      <ToolButton variant="text" onClick={app.zoomOut}>
        <FormattedMessage id="zoom.out" />
      </ToolButton>
      <ZoomMenu />
      <ToolButton variant="text" onClick={app.zoomIn}>
        <FormattedMessage id="zoom.in" />
      </ToolButton>
    </StyledCustomZoomButton>
  )
}

const StyledCustomZoomButton = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 8,
  gap: 8,
  background: '$panelContrast',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
  borderRadius: 6,

  button: {
    height: 20,
  },
})
