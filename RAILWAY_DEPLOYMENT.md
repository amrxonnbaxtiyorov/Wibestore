# Railway Deployment — Frontend (DevOps Summary)

## Production build audit (simulated)

- **`npm run build`** — OK (Vite production build succeeds).
- **`NODE_ENV=production npm run build`** — OK.
- **`npm run build:ci`** — OK (unicode fix + build; use this in CI/Railway for extra safety).
- **No `require()` or `process.env` in src** — Vite uses ESM and `import.meta.env` only.
- **Lazy route paths** — Match filenames (PascalCase); Linux case-sensitive.
- **Shell scripts** — `.gitattributes` forces LF for `*.sh` and `entrypoint.sh` so Linux containers run correctly.

## Problems found

| Issue | Impact |
|-------|--------|
| No `engines` in package.json | Railway could use an unsupported Node version. |
| No `start` script | Nixpacks/run would fail when not using Dockerfile. |
| Dockerfile used Node 20 only | Inconsistent with “Node 22” target. |
| Dockerfile `npm ci` without fallback | Fails if `package-lock.json` is missing. |
| Optional deps (e.g. sharp) in Linux | Native build failures in Alpine. |
| Few VITE_* build args in Dockerfile | Env not available at build time when using Docker. |
| No .nvmrc / nixpacks.toml | Nixpacks could pick wrong Node version. |
| No .env.example | Unclear which variables are required for build. |
| .dockerignore not excluding all non-frontend dirs | Larger context, slower builds. |

---

## Fixes applied

1. **package.json**
   - Added `engines`: `node >= 20`, `npm >= 10`.
   - Added `start`: `vite preview --host 0.0.0.0 --port ${PORT:-4173}` for Nixpacks.

2. **.nvmrc**
   - Set to `22` so Nixpacks and local tooling use Node 22.

3. **nixpacks.toml**
   - `install`: `npm ci --omit=optional || npm install --omit=optional`.
   - `build`: `npm run build`.
   - `start`: `npm run start` (Vite preview on `$PORT`).

4. **Dockerfile**
   - Base image: `node:22-alpine`.
   - Install: `npm ci --omit=optional` with fallback to `npm install --omit=optional` if no lock file.
   - All `VITE_*` variables added as ARG/ENV with empty defaults so build never fails for missing env.

5. **.dockerignore**
   - Excluded `wallet_topup`, `telegram_bot`, `.cache`, `coverage`, `.husky` to reduce context and improve reliability.

6. **.env.example**
   - Listed all frontend env vars (VITE_*, BACKEND_URL) with short comments.

7. **RAILWAY_VARIABLES.md**
   - New section 9: Frontend build (Node, build reliability, Dockerfile vs Nixpacks, start command).

---

## Improved configuration (quick reference)

- **Node:** 20+ (engines), 22 in `.nvmrc` and Dockerfile.
- **Build:** `npm run build`; install with `--omit=optional` for Linux.
- **Deploy options:**
  - **Dockerfile (recommended):** Root `Dockerfile` → nginx serves `dist`, PORT and BACKEND_URL from env.
  - **Nixpacks:** Uses `nixpacks.toml` + `.nvmrc`; build then `npm run start` (Vite preview).
- **Env:** Set all `VITE_*` in Railway (Variables). For Docker builds, pass them as build-time variables so they are available during `npm run build`.

---

## Build commands (Railway / CI)

- **Standard:** `npm run build`
- **CI / extra safety:** `npm run build:ci` (runs `scripts/fix-unicode-quotes.js` then build)

## Ensuring `npm run build` works consistently

- Use **lock file** (`package-lock.json`) and `npm ci` in CI/Docker.
- Use **`--omit=optional`** to avoid optional native deps (e.g. sharp) breaking on Alpine.
- Keep **Unicode quotes** out of source (run `node scripts/fix-unicode-quotes.js` in CI if needed).
- **VITE_***: Empty defaults in Dockerfile; set real values in Railway Variables (and as build args when using Docker).
- **O'yin/listing rasmlari:** Backend `/media/` da bo'ladi. Frontend build da `VITE_API_BASE_URL` ni to'liq backend URL ga o'rnating (masalan `https://your-backend.up.railway.app/api/v1`). Yoki faqat domen uchun `VITE_BACKEND_ORIGIN=https://your-backend.up.railway.app` qo'ying — rasmlar shu domen orqali yuklanadi.
