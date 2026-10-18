# Videos

A page for watching MP4 files you commit to this repo.

The live site is [josephdotgibbus-videos.surge.sh](https://josephdotgibbus-videos.surge.sh). A video link is a path, such as [https://josephdotgibbus-videos.surge.sh/tailsdoll](https://josephdotgibbus-videos.surge.sh/tailsdoll).

## Push to GitHub Pages

This project is not on GitHub yet. Create the repository with the Create repo pill, then:

1. On GitHub, open the repo and go to **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**.
3. Push the `main` branch. `.github/workflows/pages.yml` builds the site and deploys it on every push to `main`.

If the first Action failed because Pages was still off, open the **Actions** tab and re-run that workflow.

When the deploy job succeeds, the site URL is on the workflow run and under **Settings → Pages**. A normal project repo is published at `https://<username>.github.io/<repo>/`.

Anyone with that URL can open it. Pages serves the files in the repo.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. Drop a file in `public/videos/`, edit `public/videos.json`, and refresh.

## Add a video

1. Copy an MP4 into `public/videos/`. GitHub refuses a single file over 100 MB. Git LFS does not work here: Pages would publish the pointer text instead of the video.
2. Add an entry to `public/videos.json`.
3. Commit and push to `main`.

```json
{
  "id": "dock-at-dusk",
  "title": "Dock at dusk",
  "file": "videos/dock-at-dusk.mp4",
  "description": "A quiet pan across the harbor."
}
```

`id` is the watch link (`/dock-at-dusk`). An older `?v=dock-at-dusk` link still opens the same clip. `file` is a path under `public/`, and it has to be an `.mp4`. Optional fields:

- `description` — text under the player
- `poster` — thumbnail image, also under `public/`
- `duration` — length in seconds. If you leave it out, the page reads it from the file

Paths that leave the site (`..`, or a web URL) are ignored.
