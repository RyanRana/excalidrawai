# excalidrawai

<p align="center">
  <img alt="image" src="https://github.com/user-attachments/assets/5af4b002-bd69-4187-8836-84135685117a" />
</p>

<p align="center">
  Create Excalidraw flowcharts with AI.
</p>

---

## Credit — original project

This project is built on **[excalidraw-cli](https://github.com/swiftlysingh/excalidraw-cli)** by **Pushpinder Pal Singh** ([@swiftlysingh](https://github.com/swiftlysingh)).

The original repo provides the core that makes this possible: the DSL and DOT parsers, ELK-based auto-layout, the Excalidraw generator, and the programmable API for turning graphs into Excalidraw files. All of that is theirs; without it, none of the AI or web layer would exist. Huge thanks to Pushpinder for building and open-sourcing it under the [MIT license](https://github.com/swiftlysingh/excalidraw-cli/blob/main/LICENSE).

- **Original repo:** [https://github.com/swiftlysingh/excalidraw-cli](https://github.com/swiftlysingh/excalidraw-cli)  
- **npm package:** [@swiftlysingh/excalidraw-cli](https://www.npmjs.com/package/@swiftlysingh/excalidraw-cli)

---

## What’s added in this fork

On top of the original excalidraw-cli, this fork adds:

- **Natural-language → flowchart (xAI Grok)** — A small LLM layer that turns plain-English descriptions into DSL (or JSON/DOT), then runs them through the original pipeline. No change to the core parsers or layout; the AI only produces the input text.
- **Web UI** — A minimal white frontend: API key field, description box, Generate, and Download. Production-oriented: no server-side API key; users bring their own xAI key (get one at [console.x.ai](https://console.x.ai)).
- **Vercel deployment** — `vercel.json` and a serverless `api/generate.js` so the app can be deployed to Vercel with static files from `web/` and a single POST `/api/generate` endpoint.
- **CLI prompt option** — `excalidraw-cli create --prompt "..."` so the same Grok-based flow works from the command line (using `XAI_API_KEY` from env).
- **Refactors** — Helpers and structure tweaks (e.g. shared pipeline, format detection, API key handling) to keep behavior the same while making the code a bit easier to follow.

The original features (DSL, JSON, DOT, ELK layout, programmatic API) are unchanged and fully credited to the [excalidraw-cli](https://github.com/swiftlysingh/excalidraw-cli) project.

---

