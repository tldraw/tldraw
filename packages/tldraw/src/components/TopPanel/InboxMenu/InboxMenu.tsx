import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChatBubbleIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  FileIcon,
  ReaderIcon,
  VideoIcon
} from '@radix-ui/react-icons'
import * as React from 'react'
import {FormattedMessage} from 'react-intl'
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

const openInboxSelector = (s: TDSnapshot) => s.settings.openInbox

export const InboxMenu = React.memo(function InboxMenu() {
  const app = useTldrawApp()
  const openInbox = app.useStore(openInboxSelector)
  const [badgeCount, setBadgeCount] = React.useState(0);

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
    setBadgeCount(newInbox.length)
  }

  React.useEffect(() => {
    EdubreakService.getInbox().then((items) => {
      if (items != undefined) {
        if (items.length > 0) {
          setInbox(items)
          setBadgeCount(items.length)
          window.addEventListener('onDeleteInboxItem', onDeleteInboxItem);
        }
      } else {
        app.setSetting('openInbox', false)
      }
    })
  }, [])

  const dragStart = (e: any, campusURL: string, type: string) => {
    const parsedLink = EdubreakService.parseEdubreakLink(campusURL.replace('node', type))
    e.dataTransfer.setData("text/plain", JSON.stringify(parsedLink));
  }

  const ArtefactIcon = (type: any) => {
    switch (type.type) {
      case 'blog':
        return <ReaderIcon style={{width: 20, height: 20}}/>
      case 'cmap':
        return <FileIcon style={{width: 20, height: 20}}/>
      case 'videocomment':
        return <ChatBubbleIcon style={{width: 20, height: 20}}/>
      case 'video':
        return <VideoIcon style={{width: 20, height: 20}}/>
      default:
        return null;
    }
  }

  const NoItemInInbox = (key: any) => {
    return <StyledInboxText key={key}>
                <span>
                  <FormattedMessage id="inbox.noItemText"/>
                </span>
    </StyledInboxText>
  }

  return (
    <>
      <DropdownMenu.Root dir="ltr"
                         open={openInbox}
                         modal={false}
      >
        <DMTriggerIcon id="TD-InboxMenuIcon"
                       onClick={() => {
                         app.setSetting('openInbox', !openInbox)
                         app.setMenuOpen(!openInbox)
                       }}>
          {openInbox ?
            <EnvelopeOpenIcon
              onPointerDown={stopPropagation}/> :
            <><EnvelopeClosedIcon
              onPointerDown={stopPropagation}/>
              {badgeCount > 0 ? <ButtonBadge>{badgeCount}</ButtonBadge>
                : null
              }
            </>
          }
        </DMTriggerIcon>
        <DMContent
          variant="menu"
          id="TD-InboxMenu"
          side="bottom"
          align="end"
          sideOffset={8}
          alignOffset={8}
          overflow={true}
        >
          <StyledInboxTitle>
            <span>
              <FormattedMessage id="inbox.title"/>
            </span>
          </StyledInboxTitle>
          <Divider/>
          {badgeCount > 0 ?
            inbox.map((artefact: any, i: number) => (
              artefact.id != 0 ?
                <StyledInboxRow id={'Edubreak-Artefact-' + artefact.id} key={i} draggable
                           onDragStart={(e) => dragStart(e, artefact.campusURL, artefact.type)}>
                  <div style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{artefact.title}</div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    display: 'flex',
                    color: 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0.25em',
                    backgroundColor: '#E20000',
                    borderRadius: '0 2px 0 0'
                  }}>
                    <ArtefactIcon
                      type={artefact.type}
                    />
                  </div>
                </StyledInboxRow>
                :
                <NoItemInInbox key={i}/>
            )) : <NoItemInInbox key={0}/>
          }
        </DMContent>
      </DropdownMenu.Root>
    </>
  )
})

export const ButtonBadge = styled('span', {
  backgroundColor: '#fa3e3e',
  borderRadius: '2px',
  color: 'white',
  padding: '1px 3px',
  fontSize: '10px',
  position: 'absolute', /* Position the badge within the relatively positioned button */
  top: 0,
  right: 0,
})

export const StyledInboxRow = styled('div', {
  position: 'relative',
  width: '250px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: '2px',
  userSelect: 'none',
  margin: '6px 0 6px 0',
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  boxShadow: '0 0 2px 1px lightgrey',
  // borderStyle: 'solid',
  // borderWidth: '.5px',
  padding: '12px 0 20px 8px',
  '&:hover': {
    backgroundColor: '$hover',
  }
})

export const StyledInboxTitle = styled('div', {
  position: 'relative',
  width: 'auto',
  background: 'none',
  border: 'none',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: 0,
  userSelect: 'none',
  margin: 0,
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '$2 0 $2 $3'
})

export const StyledInboxText = styled('div', {
  position: 'relative',
  width: '250px',
  background: 'none',
  border: 'none',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: 0,
  userSelect: 'none',
  margin: 0,
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '$2 0 $2 $3'
})
