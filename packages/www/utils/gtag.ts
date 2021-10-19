/* eslint-disable @typescript-eslint/no-explicit-any */
export const GA_TRACKING_ID = process.env.GA_MEASUREMENT_ID

type GTagEvent = {
  action: string
  category: string
  label: string
  value: number
}

export const pageview = (url: URL): void => {
  if ('gtag' in window) {
    const win = window as any
    win?.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

export const event = ({ action, category, label, value }: GTagEvent): void => {
  if ('gtag' in window) {
    const win = window as any
    win?.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}
