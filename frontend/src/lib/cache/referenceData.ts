import { systemSetupService } from '@/lib/api'

type Region = { id: string; name: string }
type District = { id: string; name: string; regionId: string }

let regionsCache: Region[] | null = null
let districtsCache: District[] | null = null
let regionsPromise: Promise<Region[]> | null = null
let districtsPromise: Promise<District[]> | null = null

export function getCachedRegions() {
  return regionsCache
}

export function getCachedDistricts() {
  return districtsCache
}

export async function loadRegions(force = false): Promise<Region[]> {
  if (!force && regionsCache) return regionsCache
  if (!force && regionsPromise) return regionsPromise
  regionsPromise = systemSetupService.getRegions().then((data) => {
    regionsCache = data ?? []
    return regionsCache
  })
  return regionsPromise
}

export async function loadDistricts(force = false): Promise<District[]> {
  if (!force && districtsCache) return districtsCache
  if (!force && districtsPromise) return districtsPromise
  districtsPromise = systemSetupService.getDistricts().then((data) => {
    districtsCache = data ?? []
    return districtsCache
  })
  return districtsPromise
}

export async function loadLocationReferenceData(force = false) {
  const [regions, districts] = await Promise.all([loadRegions(force), loadDistricts(force)])
  return { regions, districts }
}
