export type Streaming<T> = (Partial<T> & { complete: false }) | (T & { complete: true })
