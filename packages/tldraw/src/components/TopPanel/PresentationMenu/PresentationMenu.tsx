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

  const [currentSlide, setSlide] = React.useState(1);

  let viewzones = shapes.filter((shape: TDShape) => shape.type === 'viewzone');

  const lastSlide = () => {
    if (currentSlide <= 1) return
    setSlide(currentSlide - 1)
  }

  const nextSlide = () => {
    if (currentSlide >= viewzones.length) return
    setSlide(currentSlide + 1)
  }

  React.useEffect(() => {
    console.log('viewzones: ', viewzones);
    console.log('currentSlide is: ', currentSlide);
    if (currentSlide >= 1 && currentSlide <= viewzones.length) {
      // TODO: fix infinite loop.
      // 02.08.2022 - 14:15 - MK: Don't know why, but normally useEffect should only be called when currentSlide changes, but it's called everytime the page updates...
      // app.zoomToViewzone(viewzones[currentSlide])
    }
  }, [currentSlide])

  return (
    <>
      <IconButton style={{
        zoom: 1.5,
        width: 'auto',
        height: 'auto',
        marginBottom: '10px'
      }} onClick={onSelect}><Cross1Icon/></IconButton>
      <Panel side="center" id="TD-Presentation-Panel">
        <IconButton style={{
          zoom: 1.5,
          width: 'auto',
          height: 'auto',
          marginBottom: '10px'
        }} onClick={lastSlide}><ArrowLeftIcon/></IconButton>
        <div>{currentSlide} of {viewzones.length}</div>
        <IconButton style={{
          zoom: 1.5,
          width: 'auto',
          height: 'auto',
          marginBottom: '10px'
        }} onClick={nextSlide}><ArrowRightIcon/></IconButton>
      </Panel>
    </>
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
