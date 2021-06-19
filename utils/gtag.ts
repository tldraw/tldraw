export const GA_TRACKING_ID = process.env.GA_MEASUREMENT_ID

type GTagEvent = {
  action: string
  category: string
  label: string
  value: number
}

export const pageview = (url: URL) => {
  // @ts-ignore
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  })
}

export const event = ({ action, category, label, value }: GTagEvent) => {
  // @ts-ignore
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}
