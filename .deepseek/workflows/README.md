# Development Workflows

## First-time Setup
```sh
npm install
```

## Start Dev Server
```sh
npm run dev
# Opens at http://localhost:5173
```

## Type Checking
```sh
npm run check
```

## Build
```sh
npm run build       # SvelteKit production build
npm run preview     # Preview production build
```

## Viewing the HTML Prototype
Open `firstdraft.html` directly in browser (works via `file://`).

## Memory System Usage
When starting a new session:
1. Read `.deepseek/project/README.md` for project overview
2. Read `.deepseek/components/README.md` for component reference
3. Read `.deepseek/known-issues/README.md` before making changes
4. Update `.deepseek/` files with any new discoveries

## How to Update Memory
After completing significant changes:
1. Update `.deepseek/components/README.md` if adding/removing components
2. Update `.deepseek/decisions/README.md` if making architectural decisions
3. Update `.deepseek/known-issues/README.md` if discovering/fixing bugs
4. Update `.deepseek/project/README.md` if project structure changes

## Git Workflow
- No commits unless explicitly requested by user
- The `.deepseek/` directory is project-local memory - commit it to share context
- Do NOT commit `node_modules/`, `.svelte-kit/`, or build outputs
