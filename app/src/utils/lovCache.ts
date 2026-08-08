import { apiService } from '@/api/apiService'

export interface LookupOption { lookup_code: string; lookup_name: string }

// In-memory store that survives component re-mounts for the lifetime of the session.
const cache: Record<string, LookupOption[]> = {}

// Tracks in-flight requests so concurrent callers for the same type share one fetch.
const inflight: Record<string, Promise<LookupOption[]>> = {}

export async function getLov(type: string): Promise<LookupOption[]> {
  if (cache[type]) return cache[type]

  if (!inflight[type]) {
    inflight[type] = apiService
      .get(`/common/lookup/${type}`)
      .then((res) => {
        const data: LookupOption[] = res.data?.data ?? []
        cache[type] = data
        return data
      })
      .finally(() => {
        delete inflight[type]
      })
  }

  return inflight[type]
}

export async function getLovMany<T extends string>(
  types: readonly T[]
): Promise<Record<T, LookupOption[]>> {
  const results = await Promise.all(types.map((t) => getLov(t)))
  const map = {} as Record<T, LookupOption[]>
  types.forEach((t, i) => { map[t] = results[i] })
  return map
}
