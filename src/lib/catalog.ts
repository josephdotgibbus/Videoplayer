export type ShelfVideo = {
  id: string
  title: string
  file: string
  description: string
  poster?: string
  duration?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSafeRelativePath(value: string): boolean {
  if (value.startsWith("/") || value.includes("\\") || value.includes(":")) {
    return false
  }

  const parts = value.split("/")
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..")
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseVideo(entry: unknown): ShelfVideo | null {
  if (!isRecord(entry)) {
    return null
  }

  const id = readString(entry.id)
  const title = readString(entry.title)
  const file = readString(entry.file)

  if (!id || !title || !file) {
    return null
  }

  if (
    id.length > 200 ||
    !isSafeRelativePath(file) ||
    !file.toLowerCase().endsWith(".mp4")
  ) {
    return null
  }

  const description =
    typeof entry.description === "string" ? entry.description.trim() : ""
  const poster = readString(entry.poster)
  const duration =
    typeof entry.duration === "number" &&
    Number.isFinite(entry.duration) &&
    entry.duration >= 0
      ? entry.duration
      : undefined

  if (poster && !isSafeRelativePath(poster)) {
    return null
  }

  return {
    id,
    title,
    file,
    description,
    poster: poster ?? undefined,
    duration,
  }
}

export function parseCatalog(data: unknown): ShelfVideo[] {
  if (!isRecord(data) || !Array.isArray(data.videos)) {
    throw new Error("videos.json needs a videos array.")
  }

  const seen = new Set<string>()
  const videos: ShelfVideo[] = []

  for (const entry of data.videos) {
    const video = parseVideo(entry)
    if (!video || seen.has(video.id)) {
      continue
    }

    seen.add(video.id)
    videos.push(video)
  }

  return videos
}

export function mediaUrl(file: string): string {
  const encoded = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")

  return `${import.meta.env.BASE_URL}${encoded}`
}

export async function loadCatalog(): Promise<ShelfVideo[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}videos.json`)

  if (!response.ok) {
    throw new Error(`Could not load videos.json (${response.status}).`)
  }

  return parseCatalog(await response.json())
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainder = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`
}
