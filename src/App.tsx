import { useEffect, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { ArrowLeft, Play, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  formatDuration,
  loadCatalog,
  mediaUrl,
  type ShelfVideo,
} from "@/lib/catalog"
import { cn } from "@/lib/utils"

type ShelfStatus =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; videos: ShelfVideo[] }

const catalogExample = `{
  "id": "dock-at-dusk",
  "title": "Dock at dusk",
  "file": "videos/dock-at-dusk.mp4",
  "description": "A quiet pan across the harbor."
}`

function sitePrefix(): string {
  const base = import.meta.env.BASE_URL
  if (!base.startsWith("/")) {
    return "/"
  }

  return base.endsWith("/") ? base : `${base}/`
}

function readVideoId() {
  const pathId = videoIdFromPath(window.location.pathname)
  if (pathId) {
    return pathId
  }

  return new URLSearchParams(window.location.search).get("v")
}

function videoIdFromPath(pathname: string): string | null {
  const prefix = sitePrefix()
  let rest: string

  if (prefix === "/") {
    rest = pathname.replace(/^\/+/, "")
  } else {
    const root = prefix.slice(0, -1)
    if (pathname === root || pathname === prefix) {
      return null
    }
    if (!pathname.startsWith(prefix)) {
      return null
    }
    rest = pathname.slice(prefix.length)
  }

  rest = rest.replace(/\/+$/, "")
  if (!rest || rest === "index.html" || rest.includes("/")) {
    return null
  }

  try {
    return decodeURIComponent(rest)
  } catch {
    return null
  }
}

function writeVideoId(id: string | null, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href)
  const prefix = sitePrefix()

  url.searchParams.delete("v")
  url.hash = ""
  url.pathname = id ? `${prefix}${encodeURIComponent(id)}` : prefix

  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`

  if (next !== current) {
    window.history[mode === "replace" ? "replaceState" : "pushState"](
      null,
      "",
      next
    )
  }
}

export function App() {
  const [status, setStatus] = useState<ShelfStatus>({ state: "loading" })
  const [reloadKey, setReloadKey] = useState(0)
  const [videoId, setVideoId] = useState<string | null>(() => readVideoId())

  useEffect(() => {
    const onPopState = () => {
      setVideoId(readVideoId())
    }

    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [])

  useEffect(() => {
    const id = readVideoId()
    const hasQuery = new URLSearchParams(window.location.search).has("v")
    const trailingSlash = id != null && window.location.pathname.endsWith("/")

    if (hasQuery || trailingSlash) {
      writeVideoId(id, "replace")
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    loadCatalog()
      .then((videos) => {
        if (!cancelled) {
          setStatus({ state: "ready", videos })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            state: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load the video list.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [videoId])

  function openVideo(id: string | null) {
    flushSync(() => {
      writeVideoId(id)
      setVideoId(id)
    })

    if (!id) {
      return
    }

    const player = document.querySelector("[data-player]")
    if (player instanceof HTMLVideoElement) {
      void player.play().catch(() => {})
    }
  }

  const current =
    status.state === "ready"
      ? status.videos.find((video) => video.id === videoId)
      : undefined

  useEffect(() => {
    if (status.state !== "ready") {
      document.title = "Videos"
      return
    }

    document.title = current ? current.title : "Videos"
  }, [current, status.state])

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => openVideo(null)}
            className="flex items-center gap-2 rounded-lg text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Play className="size-3.5 fill-current" />
            </span>
            Videos
          </button>
          <div className="ml-auto">
            <AddVideoDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {status.state === "loading" && <ShelfSkeleton />}
        {status.state === "error" && (
          <StatusPanel
            title="The video list didn't load"
            body={status.message}
            action={
              <Button onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </Button>
            }
          />
        )}
        {status.state === "ready" && videoId && !current && (
          <StatusPanel
            title="That video isn't in the list"
            body="The link doesn't match an id in videos.json."
            action={<Button onClick={() => openVideo(null)}>Back home</Button>}
          />
        )}
        {status.state === "ready" && !videoId && (
          <Library videos={status.videos} onOpen={openVideo} />
        )}
        {status.state === "ready" && current && (
          <Watch
            video={current}
            others={status.videos.filter((video) => video.id !== current.id)}
            onOpen={openVideo}
          />
        )}
      </main>
    </div>
  )
}

function Library({
  videos,
  onOpen,
}: {
  videos: ShelfVideo[]
  onOpen: (id: string) => void
}) {
  if (videos.length === 0) {
    return (
      <StatusPanel
        title="No videos yet"
        body="Put an MP4 in public/videos, list it in public/videos.json, then refresh."
        action={<AddVideoDialog />}
      />
    )
  }

  const countLabel = videos.length === 1 ? "1 video" : `${videos.length} videos`

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Videos</h1>
        <p className="mt-1 text-sm text-muted-foreground">{countLabel}</p>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function VideoCard({
  video,
  onOpen,
}: {
  video: ShelfVideo
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(video.id)}
      className="group w-full text-left outline-none"
    >
      <Thumbnail video={video} />
      <h2 className="mt-3 line-clamp-2 text-sm font-medium group-focus-visible:underline">
        {video.title}
      </h2>
      {video.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {video.description}
        </p>
      )}
    </button>
  )
}

function Watch({
  video,
  others,
  onOpen,
}: {
  video: ShelfVideo
  others: ShelfVideo[]
  onOpen: (id: string | null) => void
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          onClick={() => onOpen(null)}
        >
          <ArrowLeft />
          Home
        </Button>
        <div className="overflow-hidden rounded-xl bg-black">
          <Player key={video.id} video={video} />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {video.title}
        </h1>
        {video.description && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {video.description}
          </p>
        )}
      </section>
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <h2 className="mb-3 text-sm font-medium">Up next</h2>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other videos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {others.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onOpen(other.id)}
                className="flex w-full gap-3 text-left outline-none focus-visible:rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="w-40 shrink-0">
                  <Thumbnail video={other} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="line-clamp-2 text-sm font-medium">
                    {other.title}
                  </p>
                  {other.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {other.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function Player({ video }: { video: ShelfVideo }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="grid aspect-video place-items-center bg-black px-6 text-center text-sm text-white">
        This file didn't load. Check that the MP4 is in public/videos and that
        videos.json points at it.
      </div>
    )
  }

  return (
    <video
      key={video.id}
      src={mediaUrl(video.file)}
      poster={video.poster ? mediaUrl(video.poster) : undefined}
      data-player
      controls
      autoPlay
      playsInline
      preload="auto"
      className="aspect-video w-full bg-black object-contain"
      onError={() => setFailed(true)}
    />
  )
}

function Thumbnail({ video }: { video: ShelfVideo }) {
  const [duration, setDuration] = useState<number | null>(
    video.duration ?? null
  )
  const [ready, setReady] = useState(Boolean(video.poster))
  const src = mediaUrl(video.file)

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black ring-ring group-focus-visible:ring-2">
      {video.poster ? (
        <img
          src={mediaUrl(video.poster)}
          alt=""
          className="size-full object-cover transition-opacity group-hover:opacity-90"
        />
      ) : (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className={cn(
            "size-full object-cover transition-opacity group-hover:opacity-90",
            ready ? "opacity-100" : "opacity-0"
          )}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget
            if (duration == null && Number.isFinite(element.duration)) {
              setDuration(element.duration)
            }

            const target =
              element.duration > 0 ? Math.min(1, element.duration * 0.15) : 0

            if (target > 0) {
              element.currentTime = target
            } else {
              setReady(true)
            }
          }}
          onSeeked={() => setReady(true)}
        />
      )}
      {video.poster && duration == null && (
        <video
          src={src}
          muted
          preload="metadata"
          className="hidden"
          onLoadedMetadata={(event) => {
            const next = event.currentTarget.duration
            if (Number.isFinite(next)) {
              setDuration(next)
            }
          }}
        />
      )}
      {duration != null && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}

function ShelfSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-video rounded-xl bg-muted" />
          <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function StatusPanel({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-3 rounded-xl border border-dashed px-6 py-10">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

function AddVideoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          Add a video
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a video</DialogTitle>
          <DialogDescription>
            Put the file in this project and commit it. GitHub Pages can only
            serve files that are in the repo, so there is no upload button.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-3 pl-4 text-sm leading-relaxed">
          <li>
            Copy the MP4 into <code>public/videos/</code>. GitHub rejects a file
            over 100 MB.
          </li>
          <li>
            Add an entry to <code>public/videos.json</code>:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {catalogExample}
            </pre>
          </li>
          <li>Commit and push. Refresh after the site rebuilds.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          The published site is public. Don't commit a video you don't want
          other people to watch.
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default App
