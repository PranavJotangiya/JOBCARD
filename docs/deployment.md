# Deployment

Three pieces, three homes:

```
Angular app   ──►  Firebase Hosting   (static; free)
Express API    ──►  Render             (Docker web service; free tier)
Database       ──►  MongoDB Atlas      (free M0 cluster)
```

Firebase Hosting can only serve static files — it cannot run the Express server,
and the app uses MongoDB (not Firestore). So the API lives on Render and the data
in Atlas. The app (Firebase domain) and the API (Render domain) are different
origins, so the auth cookies are configured **`SameSite=None; Secure`** and the
API's CORS is locked to the Firebase origin.

Do it in this order: **1) Atlas → 2) Render (API) → 3) Firebase (app) → 4) CI**.

---

## 1. MongoDB Atlas (the database)

1. Sign up / log in at <https://cloud.mongodb.com>.
2. **Create a project** (e.g. `JOBCARD`), then **Build a Database** → **M0**
   (free), pick a cloud/region near your users, name the cluster (e.g.
   `jobcard`), **Create**.
3. **Security → Database Access → Add New Database User**
   - Authentication: Password. Username e.g. `jobcard_app`, generate a strong
     password, **copy it**. Built-in role: **Read and write to any database**
     (or scope to the `jobcard` DB). Add User.
4. **Security → Network Access → Add IP Address**
   - Render doesn't publish stable egress IPs on the free plan, so add
     **`0.0.0.0/0`** ("allow from anywhere"). The DB is still protected by the
     username/password. (Tighten later with a Render paid static-outbound-IP add-on.)
5. **Database → Connect → Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://jobcard_app:<password>@jobcard.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Insert your password and add the db name before the `?`:

   ```
   mongodb+srv://jobcard_app:REALPASSWORD@jobcard.xxxxx.mongodb.net/jobcard?retryWrites=true&w=majority
   ```

   Keep this string — it goes into Render as `MONGODB_URI`. Never commit it.

---

## 2. Render (the API)

The repo ships [`render.yaml`](../render.yaml) (a Render Blueprint) and
[`backend/Dockerfile`](../backend/Dockerfile).

1. Sign up at <https://render.com> with your GitHub account.
2. **New → Blueprint** → select the `JOBCARD` repo → Render reads `render.yaml`
   and proposes a web service `jobcard-api`.
3. It prompts for the `sync: false` variables — fill them in:
   - `MONGODB_URI` = the Atlas string from step 1
   - `CLIENT_URL` = leave as a placeholder for now (e.g. `https://example.web.app`);
     you'll set the real Firebase URLs in step 3 and redeploy.
   `AUTH_SECRET` is generated automatically; the cookie vars are preset.
4. **Apply / Create**. First build takes a few minutes (Docker multi-stage).
5. When it's live, note the URL, e.g. `https://jobcard-api.onrender.com`.
   Check it:

   ```bash
   curl https://jobcard-api.onrender.com/api/v1/health
   # {"success":true,"status":"ok","database":{"connected":true,...}}
   ```

   > Free Render services **sleep after ~15 min idle**; the first request then
   > takes ~30 s to wake. Fine for a demo; upgrade the plan to keep it warm.

---

## 3. Firebase Hosting (the app)

The repo ships [`firebase.json`](../firebase.json) and [`.firebaserc`](../.firebaserc).

1. Create a Firebase project at <https://console.firebase.google.com> (the
   **Spark / free** plan is enough — Hosting only). Note the **project id**.
2. Put the project id in `.firebaserc` (replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`)
   and commit, **or** run `firebase use <project-id>` locally.
3. Build the app pointed at your Render API and deploy:

   ```bash
   npm ci
   API_BASE_URL="https://jobcard-api.onrender.com/api/v1" node frontend/scripts/set-api-url.mjs
   npm run build:frontend

   npm i -g firebase-tools
   firebase login
   firebase deploy --only hosting
   ```

4. Firebase prints your live URLs, e.g.
   `https://jobcard-xxxx.web.app` and `https://jobcard-xxxx.firebaseapp.com`.

5. **Go back to Render → jobcard-api → Environment** and set
   `CLIENT_URL` to *both*, comma-separated, then let it redeploy:

   ```
   CLIENT_URL=https://jobcard-xxxx.web.app,https://jobcard-xxxx.firebaseapp.com
   ```

   (Add your custom domain here too if you connect one in Firebase Hosting.)

---

## 4. Automatic deploys (GitHub Actions)

Two workflows are included:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — lint + typecheck +
  tests + build on every push/PR. No secrets needed.
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — on push to
  `main`: build the app with the production API URL and deploy to Firebase
  Hosting.

Add these **repository secrets** (GitHub → Settings → Secrets and variables →
Actions → New repository secret):

| Secret | Value |
| --- | --- |
| `API_BASE_URL` | `https://jobcard-api.onrender.com/api/v1` |
| `FIREBASE_PROJECT_ID` | your Firebase project id |
| `FIREBASE_SERVICE_ACCOUNT` | JSON key of a service account with **Firebase Hosting Admin** |

Getting `FIREBASE_SERVICE_ACCOUNT`: easiest is
`firebase init hosting:github` (it creates the service account + sets the secret
for you). Manual: Google Cloud Console → IAM & Admin → Service Accounts → create
one → grant **Firebase Hosting Admin** → Keys → Add key (JSON) → paste the whole
file as the secret value.

The API redeploys itself: `render.yaml` has `autoDeploy: true`, so every push to
`main` rebuilds `jobcard-api` from the Dockerfile.

---

## 5. First run in production

There are no seeded accounts in production. Open the app URL once — with no
Admin yet it shows **`/setup`**. Create the first Admin there
(`POST /api/v1/auth/setup` self-disables afterwards). Then, signed in as Admin,
create the Manufacturer and Jobber users (`POST /api/v1/users`).

---

## 6. Verify the live deployment

```bash
# API up + DB connected
curl https://jobcard-api.onrender.com/api/v1/health

# app served
curl -sI https://jobcard-xxxx.web.app | grep -i '^HTTP'

# CORS: the app origin is allowed, a random origin is not
curl -si -X OPTIONS https://jobcard-api.onrender.com/api/v1/auth/login \
  -H 'Origin: https://jobcard-xxxx.web.app' \
  -H 'Access-Control-Request-Method: POST' | grep -i access-control-allow-origin
```

Then in a browser: open the app → `/setup` → create Admin → confirm the auth
cookie is set (DevTools → Application → Cookies → `jc_access`, `Secure`,
`SameSite=None`) → create users → log in as the Jobber → create a Job Card →
run the status actions → PDF → share.

---

## Notes & limits

- **Pattern images are ephemeral on Render free** — the container disk is wiped on
  each redeploy. For durable storage, add an S3 driver in
  `backend/src/modules/files/storage/` and set `STORAGE_DRIVER=s3`, or attach a
  Render persistent disk (paid — commented block in `render.yaml`).
- **Cold starts** on Render free: first request after idle is slow. The app's
  loading states cover it; upgrade the plan or add an external pinger to avoid it.
- **Atlas `0.0.0.0/0`** is acceptable because access needs the DB credentials;
  restrict it once you have stable egress IPs.
- Rotate `AUTH_SECRET` (Render regenerates on demand) — this logs everyone out.
- To move the API to Cloud Run / Fly / Railway later: same `backend/Dockerfile`,
  set the same env vars, update `API_BASE_URL` + `CLIENT_URL`.
- **`backend/package-lock.json`** is a standalone lockfile so the Docker build
  (context `./backend`) can `npm ci`. If you change backend dependencies, refresh
  it: `cd backend && npm install --package-lock-only --workspaces=false`.
