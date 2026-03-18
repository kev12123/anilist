import { getCached, setCached, CACHE_TTL } from './redis'

const ANILIST_URL = 'https://graphql.anilist.co'

async function query<T>(gql: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

export async function searchAnime(search: string, page = 1, perPage = 20, genre?: string, year?: number) {
  const cacheKey = `anime:search:${search}:${page}:${genre ?? ''}:${year ?? ''}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const data = await query<any>(`
    query ($search: String, $page: Int, $perPage: Int, $genre: String, $year: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          search: $search
          type: ANIME
          genre: $genre
          seasonYear: $year
          sort: POPULARITY_DESC
        ) {
          id title { romaji english native } coverImage { large medium }
          averageScore episodes status description(asHtml: false)
          genres startDate { year } season seasonYear
        }
      }
    }
  `, {
    search: search || undefined,
    page,
    perPage,
    genre: genre || undefined,
    year: year || undefined,
  })

  await setCached(cacheKey, data, CACHE_TTL.ANIME_LIST)
  return data
}

export async function getAnime(id: number) {
  const cacheKey = `anime:${id}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const data = await query<any>(`
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id title { romaji english native }
        coverImage { extraLarge large medium }
        bannerImage averageScore popularity
        episodes status description(asHtml: false)
        genres studios(isMain: true) { nodes { name } }
        startDate { year month day } endDate { year month day }
        season seasonYear format
        characters(sort: ROLE, perPage: 12) {
          nodes { id name { full } image { medium } }
        }
        staff(perPage: 8) {
          nodes { id name { full } primaryOccupations }
        }
        relations {
          edges {
            relationType(version: 2)
            node {
              id type title { english romaji }
              coverImage { large medium }
              averageScore episodes status format
            }
          }
        }
        recommendations(perPage: 6, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id title { english romaji }
              coverImage { large medium }
              averageScore episodes status
            }
          }
        }
      }
    }
  `, { id })

  await setCached(cacheKey, data, CACHE_TTL.ANIME)
  return data
}

export async function getAnimeSchedule(from: number, to: number, page = 1, perPage = 50) {
  const cacheKey = `schedule:${from}:${to}:${page}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const data = await query<any>(`
    query ($page: Int, $perPage: Int, $from: Int, $to: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          id
          airingAt
          episode
          media {
            id title { romaji english } coverImage { medium large }
            averageScore episodes status
          }
        }
      }
    }
  `, { page, perPage, from, to })

  await setCached(cacheKey, data, 60 * 15)
  return data
}

export async function getAnimeAiringSchedule(anilistId: number) {
  const cacheKey = `airing:${anilistId}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const data = await query<any>(`
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        airingSchedule(notYetAired: false) {
          nodes { episode airingAt }
        }
      }
    }
  `, { id: anilistId })

  await setCached(cacheKey, data, CACHE_TTL.EPISODE)
  return data
}

export async function getTrendingAnime(page = 1, perPage = 20) {
  const cacheKey = `anime:trending:${page}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const data = await query<any>(`
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(sort: TRENDING_DESC, type: ANIME) {
          id title { romaji english } coverImage { large medium }
          averageScore episodes status genres
        }
      }
    }
  `, { page, perPage })

  await setCached(cacheKey, data, CACHE_TTL.ANIME_LIST)
  return data
}
