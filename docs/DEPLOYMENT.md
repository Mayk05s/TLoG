# TLoG production deployment

Last verified: 2026-10-01, Asia/Tbilisi. This runbook records a Dokploy configuration repair; application source code was not changed.

## Target and Git source

- Dokploy: https://vps.mayk05.pro, version v0.30.6 at verification.
- Project: `TLoG` (`Wx76Do_itb7QJDFGMfl7u`).
- Environment: `production` (`VGkqUqIxqrBh2KOzzq2K2`).
- Repository: `Mayk05s/TLoG`, branch `master`, provider `github`.
- Remote branch SHA checked before deployment: `18b71990db24161013028f8aa4d7799d20895350`.
- Auto Deploy: enabled for push on both applications.
- Credentials: use the Dokploy skill's saved credential reference; never add API keys or application secrets here.

## Applications and routing

Frontend:

- Application ID: `WYcb_F8AYlM5CMEiBqr6s`.
- Docker service: `tlog-frontend-lbjobi`.
- Git build path: `/tlog-frontend`.
- Build type: `nixpacks`; the successful repair build used Nixpacks v1.41.0, `pnpm run build`, and Caddy to serve the built files.
- Public HTTPS domain: https://tlog.mayk05.pro, container port `3000`.
- Build environment: `VITE_API_BASE_URL=https://tlog.mayk05.pro/api`.

Backend:

- Application ID: `EtaQxeFItsHoS7IHBh99P`.
- Docker service: `tlog-backend-fjaufg`.
- Git build path: `/tlog-backend`, build type `nixpacks`, container port `3000`.
- Public API: https://tlog.mayk05.pro/api.
- Dokploy domain ID: `lksCLF3AdhIivaQCzl8rH`.
- Domain configuration: host `tlog.mayk05.pro`, path `/api`, internal path `/`, `stripPath=true`, HTTPS enabled with `letsencrypt`.
- Traefik routes `Host(tlog.mayk05.pro) && PathPrefix(/api)` to the backend and strips `/api` before forwarding.
- The previous `api.tlog.mayk05.pro` domain remains configured, but the repaired frontend does not use it.

## Incident and repair

The frontend and backend containers were running. The public HTML, JavaScript, and CSS returned HTTP 200, while HTTPS connections to `api.tlog.mayk05.pro` failed during the TLS handshake. The published frontend bundle used that API address and displayed `Error FETCH_ERROR`.

The API hostname resolved to Cloudflare addresses. This failure is consistent with the Universal SSL limitation on deeper subdomains: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/. The Cloudflare account's certificate configuration was not inspected directly.

The repair added the HTTPS `/api` route to the existing backend in Dokploy, verified database health there, saved the new frontend API environment variable while preserving `buildArgs`, `buildSecrets`, and `createEnvFile`, and rebuilt only the frontend from its configured remote Git repository.

Repair deployment: `qeNIMRNiQ3YSeeOcYdnee`, title `Restore TLoG API routing`, status `done`, finished `2026-10-01T08:54:08.765Z` (`12:54:08` Asia/Tbilisi).

Build logs confirmed a fresh clone of `github.com/Mayk05s/TLoG.git`, a successful TypeScript/Vite build, and Docker image `sha256:ab516e7127afcb0b677646c875d8d016fbcef780fb52ad384a141a222a8a2500`. The installed Dokploy API did not provide a readable SHA for the actual checkout: its patch reader targets a separate patch repository, and its Traefik file reader rejects application-directory access. The SHA above is therefore the verified remote branch SHA at deployment start, not an independently read checkout SHA.

## Public verification

- `/`, `/login`, and `/rounds`: HTTP 200.
- Current JavaScript: `/assets/index-B4IBqpRL.js`, HTTP 200; contains the new API address and does not contain `https://api.tlog.mayk05.pro`.
- CSS: `/assets/index-CibNK2a8.css`, HTTP 200.
- `/api/health`: HTTP 200, JSON `status=ok`, `database=connected`.
- `/api/rounds` without authentication: HTTP 401 JSON, expected because the controller requires JWT authentication.
- Browser: normal reload fetched the new JavaScript bundle; the public demo login succeeded, `/rounds` displayed two completed rounds, and no console errors or warnings were captured.
- An already cached browser navigation initially reused the old JavaScript. A normal reload loaded the new version.
- No new game rounds or taps were created during verification.

## Future updates

1. Recheck these application IDs, Git provider, branch, build paths, domains, and environment in the live Dokploy configuration.
2. For code changes, validate, commit, and push to the remote Git repository. Observe Auto Deploy rather than starting duplicate deployments.
3. For a frontend environment change, preserve the full existing environment contract and rebuild through Dokploy from the Git provider. `VITE_API_BASE_URL` is consumed at build time.
4. Verify deployment logs, `/api/health`, published asset URLs, demo login, and the rounds page. A deployment status of `done` alone is insufficient.
5. Deploy and roll back through Git only. Do not use uploads, archives, SCP/rsync, or manual replacement of application files on the server.
