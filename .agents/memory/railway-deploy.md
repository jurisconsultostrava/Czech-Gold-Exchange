---
name: Railway deploy / token format
description: How this project deploys to Railway via CLI, and the token-format gotcha that wasted a long loop.
---

# Railway deploy (CLI) — token format gotcha

**Railway tokens ARE 36-char UUIDs** (8-4-4-4-12). Do NOT assume a 36-char UUID
secret is "just a project ID from the URL" — a project token and a project ID
look identical by shape. The only reliable check is to actually run the CLI.

**Why:** A long, frustrating loop happened because a stored `RAILWAY_TOKEN` was
rejected ("Invalid RAILWAY_TOKEN" / "Unauthorized" / "Not signed in") and the
wrong conclusion was drawn from its UUID shape. The real cause was simply that
the *stored secret value* was stale/wrong, not the format. The user's actual
token (visible only once on Railway → Settings → Tokens) was a valid UUID.

**How to apply / verify a Railway token:**
- Validate by running `RAILWAY_TOKEN=<value> railway status` — a valid project
  token prints the project, its services, and Postgres. Rejection prints
  "Invalid RAILWAY_TOKEN".
- Project tokens are scoped to one environment (here: `production`). Set them via
  the `RAILWAY_TOKEN` env var (NOT `RAILWAY_API_TOKEN`, which is for
  account/team tokens and will say "Unauthorized" for a project token).
- Deploy: `RAILWAY_TOKEN=<value> railway up --service Czech-Gold-Exchange --detach`
  uploads the repo and triggers a Dockerfile build, returning a build-logs URL
  without streaming (avoids the bash timeout on long builds).
- CLI install: `npm install -g @railway/cli` (v5.x). Never echo the token value.

## `railway up` snapshots the working tree AT UPLOAD TIME

`railway up` uploads the current on-disk working tree, not a committed revision.
If a file has unresolved merge-conflict markers or any broken state when you run
it, the Docker build fails (esbuild: `Unexpected "<<"`). Always confirm a clean
tree (`rg "<<<<<<<|>>>>>>>" src`) AND a passing local prod build
(`PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/swissgold run build`)
before deploying.

## Recurring/competing deploys come from Replit "Publish", not the repo host

Railway here builds from UPLOAD snapshots (build log shows "uploading snapshot" +
`COPY . .`), NOT a remote clone. Extra deploys appearing right after a manual
`railway up` have `meta.reason=redeploy`, `meta.cliCaller=replit_agent` — they are
the Replit Publish integration redeploying a STALE snapshot, so they FAIL and do
NOT override a good `railway up` SUCCESS. To stop the noise, don't click Publish
in Replit; deploy via `railway up`.

## Diagnose deploy status without the dashboard (GraphQL)

CLI `railway logs/service/variables` fail with a project token ("No service
linked"). Instead POST https://backboard.railway.com/graphql/v2 with header
`Project-Access-Token: <RAILWAY_TOKEN>` (Bearer = "Not Authorized").
- list: `deployments(first:N,input:{serviceId,environmentId}){edges{node{id status createdAt meta}}}`
- build error: `buildLogs(deploymentId:"<id>"){message}`
A FAILED deployment is NOT promoted; the previous SUCCESS stays live.
Verify live: `curl -o /dev/null -w "%{content_type}" https://swissgold.cz/assets/<asset>` —
`image/png` = served, `text/html` = SPA fallback (asset not in that build).
