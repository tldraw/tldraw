import styled from 'styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { IconWrapper, RowButton } from 'components/shared'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import * as Panel from '../panel'
import state, { useSelector } from 'state'
import { getPage } from 'utils/utils'

export default function PagePanel() {
  const currentPageId = useSelector((s) => s.data.currentPageId)
  const documentPages = useSelector((s) => s.data.document.pages)

  const sorted = Object.values(documentPages).sort(
    (a, b) => a.childIndex - b.childIndex
  )

  return (
    <OuterContainer>
      <DropdownMenu.Root>
        <PanelRoot>
          <DropdownMenu.Trigger as={RowButton}>
            <span>{documentPages[currentPageId].name}</span>
            <IconWrapper size="small">
              <ChevronDownIcon />
            </IconWrapper>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content sideOffset={8}>
            <PanelRoot>
              <DropdownMenu.RadioGroup
                as={Content}
                value={currentPageId}
                onValueChange={(id) =>
                  state.send('CHANGED_CURRENT_PAGE', { id })
                }
              >
                {sorted.map(({ id, name }) => (
                  <StyledRadioItem key={id} value={id}>
                    <span>{name}</span>
                    <DropdownMenu.ItemIndicator as={IconWrapper} size="small">
                      <CheckIcon />
                    </DropdownMenu.ItemIndicator>
                  </StyledRadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </PanelRoot>
          </DropdownMenu.Content>
        </PanelRoot>
      </DropdownMenu.Root>
    </OuterContainer>
  )
}

const PanelRoot = styled('div', {
  minWidth: 1,
  width: 184,
  maxWidth: 184,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'all',
  padding: '2px',
  borderRadius: '4px',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
})

const Content = styled(Panel.Content, {
  width: '100%',
})

const StyledRadioItem = styled(DropdownMenu.RadioItem, {
  height: 32,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 6px 0 12px',
  cursor: 'pointer',
  borderRadius: '4px',
  backgroundColor: 'transparent',
  outline: 'none',
  '&:hover': {
    backgroundColor: '$hover',
  },
})

const OuterContainer = styled('div', {
  position: 'fixed',
  top: 8,
  left: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  zIndex: 200,
  height: 44,
})
