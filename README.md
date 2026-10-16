# Matinee

A small video shelf for GitHub Pages. Put MP4 files in this repo, list them in a catalog, and watch them in the browser: a grid of clips, a player, and an Up next list.

GitHub Pages only serves files that are in the repository. There is no account and no upload button. Adding a video means committing the file.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. While the dev server is running, drop a file in `public/videos/`, edit `public/videos.json`, and refresh.

## Add a video

1. Copy an MP4 into `public/videos/`. GitHub refuses a single file over 100 MB, so keep the bitrate modest. Git LFS does not work here: Pages would publish the pointer text instead of the video.
2. Add an entry to `public/videos.json`.
3. Commit and push.

```json
{
  "id": "dock-at-dusk",
  "title": "Dock at dusk",
  "file": "videos/dock-at-dusk.mp4",
  "description": "A quiet pan across the harbor."
}
```

`id` is the watch link (`?v=dock-at-dusk`). `file` is a path under `public/`, and it has to be an `.mp4`. Optional fields:

- `description` — text under the player
- `poster` — thumbnail image, also under `public/`
- `duration` — length in seconds. If you leave it out, the shelf reads it from the file

Paths that leave the site (`..`, or a web URL) are ignored.

The published site is public. Don't commit a video you don't want other people to watch.

## Publish on GitHub Pages

1. Push the repository to GitHub.
2. In the repo, open Settings → Pages → Build and deployment, and set Source to GitHub Actions.
3. `.github/workflows/pages.yml` builds the site and publishes it on every push to `main`.

Asset paths are relative, so the same build works at `https://username.github.io/` and at `https://username.github.io/repo/`.

Two short sample clips are already in the catalog so you can try the player before adding your own.
