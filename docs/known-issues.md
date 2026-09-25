# Known Issues / Security Follow-ups

Tracking list for accepted-but-not-yet-fixed risks. Each entry should become a
GitHub issue (the `gh` CLI was unavailable in the environment where these were
recorded, so file them when convenient).

Status as of the `fix/bugs-and-rookie-mistakes` branch (September 2026).

## Move JWT out of localStorage (M10) — open

**Severity:** Medium

**Where:** `frontend/src/utils/api.ts` (request interceptor), `frontend/src/pages/LoginPage.tsx`.

**Problem:** The access token is stored in `localStorage`, which is readable by
any JavaScript running on the page. A single XSS vulnerability would let an
attacker exfiltrate the token and impersonate the user.

**Proposed fix:**
- Issue the JWT from the backend as an `httpOnly`, `Secure`, `SameSite=Lax`
  cookie on `POST /token`.
- Stop attaching the `Authorization` header in the Axios request interceptor;
  rely on the browser sending the cookie automatically.
- Add a `POST /logout` endpoint that clears the cookie, and have `logout()` call it.
- Add CSRF protection (e.g. double-submit token) since auth moves to cookies.

**Why deferred:** Cross-cutting change touching auth on both backend and
frontend plus CSRF handling. It was planned as the optional phase 7 of the
bug-fix pass and left switched off. The risk is partially mitigated by the
`nosniff`, `X-Frame-Options` and `Referrer-Policy` headers and by upload type
validation (reduces stored-XSS surface).

## Images are served publicly — accepted risk

**Severity:** Low

**Where:** `/uploads` mount in `backend/app/main.py`, `UPLOAD_DIR`.

**Problem:** University/faculty logos, avatars and note images are reachable by
anyone who knows (or guesses) the URL, including images of notes that are still
waiting for approval. File names are random (uuid4), which makes guessing
impractical but does not enforce access control.

**Decision:** Accepted. These images are meant to be public once content is
approved, and serving them through an authenticated endpoint would break plain
`<img>` tags. Note attachments, the actually sensitive files, are stored in
`PRIVATE_UPLOAD_DIR` and served only through the authenticated download endpoint.

## Rejecting a pending university that has image requests fails — open

**Severity:** Medium (admin action fails with 500)

**Where:** `ImageRequest.university` relationship in `backend/app/models.py`.

**Problem:** `image_requests.university_id` is `NOT NULL` without `ON DELETE CASCADE`,
and the relationship (a `backref`) has no delete cascade. Deleting a university
with image requests makes SQLAlchemy set `university_id` to NULL, which raises an
`IntegrityError`.

**Proposed fix:** cascade the delete (ORM `cascade="all, delete-orphan"` plus a
migration adding `ON DELETE CASCADE`) and remove the requested image files in
`UniversityModeration.files_to_delete`.

## Admin "delete university" button deletes a note — open

**Severity:** High (data loss by an admin click)

**Where:** `frontend/src/pages/AdminPage.tsx`, universities tab:
`<UniversityEditRow ... onDelete={() => deleteNoteMutation.mutate(uni.id)} />`.

**Problem:** The button calls `DELETE /notes/{university id}`, deleting whichever
note happens to have that id. There is no endpoint for deleting approved
universities.

**Proposed fix:** remove the button, or add an admin endpoint for deleting a
university (with the file cleanup used by moderation) and call that.

## Rate limits are per process — open

**Severity:** Low

**Where:** `backend/app/core/rate_limit.py`.

**Problem:** slowapi uses in-memory storage, so every uvicorn worker (or
container replica) keeps its own counters and the effective limit is multiplied
by the number of processes.

**Proposed fix:** configure `storage_uri` with Redis when running more than one worker.

Related: FastAPI is pinned to 0.136.x because from 0.137 slowapi's middleware no
longer finds endpoints of included routers, so default limits would silently stop
applying. `tests/test_rate_limits.py` fails if that happens; revisit the pin when
slowapi supports the new routing.

## Emails that differ only in case — open

**Severity:** Low

**Where:** `users.email` unique constraint.

**Problem:** New registrations store emails in lowercase and look them up
case-insensitively, but the unique constraint is still case-sensitive and
accounts created earlier may have mixed-case emails. Two legacy accounts that
differ only in case cannot both log in reliably.

**Proposed fix:** a migration that lowercases existing emails (after resolving
duplicates) and a unique index on `lower(email)`.
