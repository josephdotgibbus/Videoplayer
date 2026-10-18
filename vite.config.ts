import { copyFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Project Pages live at /<repo>/. A user site (repo name ending in
// .github.io) is served from the domain root. Local builds stay relative.
function siteBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1]
  if (!repo || repo.endsWith(".github.io")) {
    return "./"
  }

  return `/${repo}/`
}

function githubPagesFallback(): Plugin {
  return {
    name: "github-pages-fallback",
    closeBundle() {
      const index = resolve(import.meta.dirname, "dist/index.html")
      if (existsSync(index)) {
        copyFileSync(index, resolve(import.meta.dirname, "dist/404.html"))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: siteBase(),
  plugins: [react(), tailwindcss(), githubPagesFallback()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
