import styled from 'styles'

export const Root = styled('div', {
  position: 'relative',
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  font: '$ui',

  variants: {
    bp: {
      mobile: {},
      small: {},
    },
    variant: {
      code: {},
      controls: {
        position: 'absolute',
        right: 156,
      },
    },
    isOpen: {
      true: {},
      false: {
        padding: 2,
        height: 38,
        width: 38,
      },
    },
  },
  compoundVariants: [
    {
      isOpen: true,
      variant: 'code',
      css: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        bottom: 48,
        maxWidth: 680,
        zIndex: 1000,
      },
    },
    {
      isOpen: true,
      variant: 'code',
      bp: 'small',
      css: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        bottom: 128,
        maxWidth: 720,
        zIndex: 1000,
      },
    },
  ],
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
  padding: 2,
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
})
