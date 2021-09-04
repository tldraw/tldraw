import styled from '~styles'

/* -------------------------------------------------- */
/*                       Dialog                       */
/* -------------------------------------------------- */

export const DialogContent = styled('div', {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 240,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  padding: '$0',
  boxShadow: '$4',
  borderRadius: '4px',
  font: '$ui',

  '&:focus': {
    outline: 'none',
  },
})

export const DialogOverlay = styled('div', {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

export const DialogInputWrapper = styled('div', {
  padding: '$4 $2',
})

export const DialogTitleRow = styled('div', {
  display: 'flex',
  padding: '0 0 0 $4',
  alignItems: 'center',
  justifyContent: 'space-between',

  h3: {
    fontSize: '$1',
  },
})
