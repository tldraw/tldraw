import * as React from 'react'
import {styled} from '~styles'
import {ArrowLeftIcon, ArrowRightIcon, Cross1Icon} from '@radix-ui/react-icons'
import {IconButton} from "~components/Primitives/IconButton";
import {Panel} from "~components/Primitives/Panel";
import {useTldrawApp} from "~hooks";
import {TDShape} from "~types";

interface PresentationMenuProps {
  onSelect: () => void
  shapes: any
}

export function PresentationMenu({onSelect, shapes}: PresentationMenuProps) {
  const app = useTldrawApp()

  const viewzones = shapes.filter((shape: TDShape) => shape.type === 'viewzone')

  const currentSlide = localStorage.getItem('currentSlide')
  let slideCounter = 1

  if (!currentSlide) {
    localStorage.setItem('currentSlide', '0');
    app.zoomToViewzone(viewzones[0])
  } else {
    slideCounter = Number(currentSlide) + 1
  }

  const lastSlide = () => {
    let currentSlide = localStorage.getItem('currentSlide')
    if (!currentSlide || Number(currentSlide) <= 0) return
    let slide = Number(currentSlide) - 1
    localStorage.setItem('currentSlide', slide.toString())
    app.zoomToViewzone(viewzones[slide])
  }

  const nextSlide = async () => {
    let currentSlide = localStorage.getItem('currentSlide')
    if (!currentSlide || Number(currentSlide) >= viewzones.length - 1) return
    let slide = Number(currentSlide) + 1
    localStorage.setItem('currentSlide', slide.toString())
    app.zoomToViewzone(viewzones[slide])
  }

  return (
    <>
      <StyledCrossButton onClick={onSelect}><Cross1Icon/></StyledCrossButton>
      <StyledPanelContainer>
        <Panel side="center" id="TD-Presentation-Panel" style={{paddingTop: '10px', paddingBottom: '10px'}}>
          <StyledIconButton style={{
          }} onClick={lastSlide}><ArrowLeftIcon/></StyledIconButton>
          <div style={{fontSize: '1.5em'}}>{slideCounter} of {viewzones.length}</div>
          <StyledIconButton style={{
          }} onClick={nextSlide}><ArrowRightIcon/></StyledIconButton>
        </Panel>
      </StyledPanelContainer>
    </>
  )
}

const StyledPanelContainer = styled('div', {
  margin: 'auto',
  width: 'auto',
  bottom: 0,
  marginBottom: '5%'
})

const StyledIconButton = styled(IconButton, {
  zoom: 2,
  width: 'auto',
  height: 'auto',
  marginRight: '5px',
  marginLeft: '5px',
  '&:hover': {
    backgroundColor: '$hover',
  }
})

const StyledCrossButton = styled(IconButton, {
  zoom: 1.75,
  width: 'auto',
  height: 'auto',
  padding: '2px',
  '&:hover': {
    backgroundColor: '$hover',
  }
})
