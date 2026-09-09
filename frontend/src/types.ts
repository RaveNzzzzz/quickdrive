export type Task = {
  id: number
  title: string
  description: string
  done: boolean
  created_at: string
}

export type Paginated<T> = {
  items: T[]
  count: number
}

export type TokenPair = {
  access: string
  refresh: string
  username: string
}
