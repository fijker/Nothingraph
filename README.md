# Nothingraph

**A local-first markdown knowledge base with bidirectional links and an interactive graph.**

A lightweight open-source alternative to Obsidian — built on Tauri + React.

> ⚠️**Status: rough pet project.** Nothingraph is built in spare time, for fun
> and practice, not as a production-ready product. Much is still unfinished,
> APIs and formats may break between commits, and there are almost no tests.
> Don't take it too seriously, don't store your only copy of important notes
> in it, and don't expect stability — but bug reports, forks, and pull
> requests are very welcome.

## Features (current)

- Open any folder as a "vault" (desktop)
- Markdown notes with `[[Wiki-style links]]`
- Automatic backlinks panel
- Interactive force-directed graph (click a node to open the note)
- Full-text search
- Tags (`#tag`)
- Dark theme
- Auto-save on focus loss (desktop)
- Demo vault for browser testing

## Platforms

| Platform | Status        | Formats                      |
|----------|---------------|------------------------------|
| Windows  | Supported     | `.msi` / `.exe`              |
| macOS    | Supported     | `.dmg` (Intel + ARM)         |
| Linux    | Supported     | `.AppImage`, `.deb`, `.rpm`  |
| Web      | Demo only     | —                            |

## Development

### Requirements

- Node.js ≥ 20
- Rust (stable)
- Tauri system dependencies: https://v2.tauri.app/start/prerequisites/

```bash
npm install
npm run tauri:dev
