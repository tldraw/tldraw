import styled from 'styles'

export const Root = styled('div', {
  position: 'relative',
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '1px solid $border',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  boxShadow: '0px 2px 25px rgba(0,0,0,.16)',

  variants: {
    isOpen: {
      true: {
        width: 'auto',
        minWidth: 300,
      },
      false: {
        height: 34,
        width: 34,
      },
    },
  },
})

export const Layout = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gridTemplateRows: 'auto 1fr',
  gridAutoRows: '28px',
  height: '100%',
  width: 'auto',
  minWidth: '100%',
  maxWidth: 560,
  overflow: 'hidden',
  userSelect: 'none',
  pointerEvents: 'all',
})

export const Header = styled('div', {
  pointerEvents: 'all',
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid $border',
  position: 'relative',

  '& h3': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '13px',
    pointerEvents: 'none',
    userSelect: 'none',
  },

  variants: {
    side: {
      left: {
        flexDirection: 'row',
      },
      right: {
        flexDirection: 'row-reverse',
      },
    },
  },
})

export const ButtonsGroup = styled('div', {
  display: 'flex',
})

export const Content = styled('div', {
  position: 'relative',
  pointerEvents: 'all',
  overflowY: 'scroll',
})

export const Footer = styled('div', {
  overflowX: 'scroll',
  color: '$text',
  font: '$debug',
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  borderTop: '1px solid $border',
})
