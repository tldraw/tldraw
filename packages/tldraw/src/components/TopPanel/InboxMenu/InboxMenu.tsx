import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {EnvelopeClosedIcon, EnvelopeOpenIcon} from '@radix-ui/react-icons'
import * as React from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {Divider} from '~components/Primitives/Divider'
import {
  DMContent,
  DMTriggerIcon,
} from '~components/Primitives/DropdownMenu'
import {useTldrawApp} from '~hooks'
import {TDSnapshot} from '~types'
import {styled} from "~styles";
import EdubreakService from "~state/services/EdubreakService";
import {stopPropagation} from "~components/stopPropagation";

interface InboxMenuProps {
  readOnly: boolean
}

const openInboxSelector = (s: TDSnapshot) => s.settings.openInbox

export const InboxMenu = React.memo(function InboxMenu({readOnly}: InboxMenuProps) {
  const app = useTldrawApp()
  const openInbox = app.useStore(openInboxSelector)

  const [inbox, _setInbox] = React.useState([{
    id: 0,
    title: ''
  }]);

  const inboxRef = React.useRef(inbox);

  function setInbox(inbox: any) {
    inboxRef.current = inbox; // Updates the ref
    _setInbox(inbox);
  }

  const onDeleteInboxItem = (e: any) => {
    // use the ref here so you have the access to the up-to-date inbox
    const newInbox = inboxRef.current.filter((item) => item.id !== e.detail)
    setInbox(newInbox)
  }

  React.useEffect(() => {
    EdubreakService.getInbox().then((items) => {
      if (items.length > 0) {
        app.setSetting('openInbox', true)
        setInbox(items)
        window.addEventListener('onDeleteInboxItem', onDeleteInboxItem);
      }
    })
  }, [])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )

  const dragStart = (e: any, campusURL: string, type: string) => {
    const parsedLink = EdubreakService.parseEdubreakLink(campusURL.replace('node', type))
    e.dataTransfer.setData("text/plain", JSON.stringify(parsedLink));
  }

  return (
    <>
      <DropdownMenu.Root dir="ltr"
                         open={openInbox}
                         onOpenChange={handleMenuOpenChange}
                         modal={false}
      >
        <DMTriggerIcon id="TD-InboxMenuIcon"
                       onClick={() => {
                         app.setSetting('openInbox', !openInbox)
                       }}>
          {openInbox ?
            <EnvelopeOpenIcon
              onPointerDown={stopPropagation}/> :
            <EnvelopeClosedIcon
              onPointerDown={stopPropagation}/>
          }
        </DMTriggerIcon>
        <DMContent
          variant="menu"
          id="TD-InboxMenu"
          side="bottom"
          align="end"
          sideOffset={4}
          alignOffset={4}
        >
          <StyledRow>
            <span>
              <FormattedMessage id="inbox.title"/>
            </span>
          </StyledRow>
          <Divider/>
          {inbox.map((artefact: any, i: number) => (
            <StyledRow id={'Edubreak-Artefact-' + artefact.id} key={i} draggable
                       onDragStart={(e) => dragStart(e, artefact.campusURL, artefact.type)}>
              <div>{artefact.title}</div>
            </StyledRow>
          ))}
        </DMContent>
      </DropdownMenu.Root>
    </>
  )
})

export const StyledRow = styled('div', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  padding: '$2 0 $2 $3',
  borderRadius: 4,
  userSelect: 'none',
  margin: 0,
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  variants: {
    variant: {
      tall: {
        alignItems: 'flex-start',
        padding: '0 0 0 $3',
        '& > span': {
          paddingTop: '$4',
        },
      },
    },
  },
})

const StyledGroup = styled(DropdownMenu.DropdownMenuRadioGroup, {
  display: 'flex',
  flexDirection: 'row',
  gap: '$1',
})
