> **Important:** Always read and follow the rules in this file before classifying any project type.

# Project Type Identification: Summary

This resume outlines how to distinguish frontend, backend, and full-stack projects by checking file structure, dependencies, and configuration.

---

## Rule File Locations
- Frontend: `.ai-memory\$_rules\frontend.md`
- Backend: `.ai-memory\$_rules\backend.md`
- Full-Stack: `.ai-memory\$_rules\fullstack.md`

---

## How to Analyze
- **Structure:** Look at folders and files.
- **Dependencies:** Check `package.json` for libraries/frameworks.
- **Config:** Review build and environment files.

---

## Frontend
- **Focus:** UI and client-side logic.
- **Files:** `index.html`, `/src`, `/public`, `/components`, `/pages`, `/views`.
- **Dependencies:** `react`, `vue`, `@angular/core`, UI libraries.
- **Config:** `webpack.config.js`, `vite.config.js`, `babel.config.json`.

---

## Backend
- **Focus:** Server logic, APIs, databases.
- **Files:** `server.js`, `app.js`, `main.ts`, `/routes`, `/controllers`, `/models`, database configs.
- **Dependencies:** `express`, `@nestjs/core`, database drivers.
- **Config:** `.env`, `tsconfig.json`, `nodemon.json`, `pm2.config.js`.

---

## Full-Stack
- **Focus:** Combines frontend and backend.
- **Structure:** `/client` and `/server` folders.
- **Dependencies:** Mix of frontend and backend libraries.
- **Frameworks:** `next`, `nuxt` for integrated rendering.

---