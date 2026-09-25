# Known Issues / Security Follow-ups

Tracking list for accepted-but-not-yet-fixed risks. Each entry should become a
GitHub issue when it is picked up.

Status as of the `fix/bugs-and-rookie-mistakes` branch (September 2026).

## Open

### FastAPI is pinned to 0.136.x

**Severity:** Low (maintenance)

**Where:** `backend/requirements.txt`.

**Problem:** From FastAPI 0.137 included routers are wrapped in `_IncludedRouter`,
which slowapi's middleware (0.1.9 / 0.1.10) cannot look into, so default rate
limits would silently stop applying to every router endpoint.
`tests/test_rate_limits.py::test_default_limit_applies_to_routes_without_their_own`
fails if that happens.

**Proposed fix:** upgrade once slowapi supports the new routing (or replace the
middleware with a global dependency that applies the default limit).

## Accepted risks

### Images are served publicly

**Where:** `/uploads` mount in `backend/app/main.py`, `UPLOAD_DIR`.

University/faculty logos, avatars and note images are reachable by anyone who
knows (or guesses) the URL, including images of notes that are still waiting for
approval. File names are random (uuid4), which makes guessing impractical but
does not enforce access control. These images are meant to be public once
content is approved, and serving them through an authenticated endpoint would
break plain `<img>` tags. Note attachments, the actually sensitive files, are
stored in `PRIVATE_UPLOAD_DIR` and served only through the authenticated
download endpoint.

## Resolved

- **M10: JWT in localStorage** — the token is an httpOnly, Secure, SameSite=Lax
  cookie set by `POST /token` and cleared by `POST /logout`; cookie-authenticated
  writes need a matching `X-CSRF-Token` header (double submit). The frontend no
  longer stores or decodes the token.
- **Rejecting a pending university with image requests or registered users
  failed with 500** — foreign keys now cascade / set NULL (migration
  `84f4c65036b2`).
- **Admin "delete university" button deleted a note** — it calls the new
  `DELETE /admin/universities/{id}`; the edit form now saves every field.
- **Rate limits were per process** — `RATE_LIMIT_STORAGE_URI` can point all
  workers at Redis.
- **Emails differing only in case** — unique index on `lower(email)` (migration
  `5319ba427bf5`, which stops and lists conflicting accounts if any exist).
- **CI never passed** — the bare `pytest` command could not import `app`, and
  the frontend had no `package-lock.json` for `npm ci`.
