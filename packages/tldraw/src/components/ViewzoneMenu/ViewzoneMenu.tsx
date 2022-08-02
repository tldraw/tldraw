import * as React from 'react'
import {styled} from '~styles'
import {ArrowLeftIcon} from '@radix-ui/react-icons'
import {IconButton} from "~components/Primitives/IconButton";
import {Panel} from "~components/Primitives/Panel";
import {Divider} from "~components/Primitives/Divider";
import {useTldrawApp} from "~hooks";
import {TDShape} from "~types";

interface ViewzoneMenuProps {
  onSelect: () => void
  shapes: any
}

export function ViewzoneMenu({onSelect, shapes}: ViewzoneMenuProps) {
  const app = useTldrawApp()

  let viewzones = shapes.filter((shape: TDShape) => shape.type === 'viewzone');

  const switchToViewzone = (e: React.MouseEvent) => {
    const viewzone = viewzones.filter((element: TDShape) => element.id === e.currentTarget.id)
    app.zoomToViewzone(viewzone[0])
  }

  return (
    <Panel side="left" id="TD-Viewzone-Panel">
      <StyledListContainer>
          <IconButton style={{
            zoom: 1.5,
            width: 'auto',
            height: 'auto',
            marginBottom: '10px'
          }} onClick={onSelect}><ArrowLeftIcon/></IconButton>
        <Divider/>
        {viewzones.map((viewzone: TDShape, index: number) => (
          <StyledListElementContainer id={viewzone.id} key={viewzone.id} onClick={switchToViewzone}>
            <div>Viewzone {index+1}</div>
          </StyledListElementContainer>
        ))}
      </StyledListContainer>
    </Panel>
  )
}

const StyledListContainer = styled('ul', {
  width: '100%',
  top: 0,
  left: 0,
  right: 0,
  pointerEvents: 'all',
  listStyleType: 'none',
  '& > *': {
    pointerEvents: 'all',
  },
  paddingInlineStart: '15px',
  paddingInlineEnd: '15px'
})
const StyledListElementContainer = styled('li', {
  fontSize: '1em',
  paddingBottom: '15px',
  paddingTop: '15px',
  paddingLeft: '5px',
  paddingRight: '5px',
  cursor: 'pointer',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: '$hover',
  },
})
