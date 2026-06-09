# Known Issues / Security Follow-ups

Tracking list for accepted-but-not-yet-fixed risks. Each entry should become a
GitHub issue (the `gh` CLI was unavailable in the environment where these were
recorded, so file them when convenient).

## Move JWT out of localStorage (M10)

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
frontend plus CSRF handling; out of scope for the current review-fix pass.
The risk is partially mitigated by the `nosniff` header and upload type
validation added in the same pass (reduces stored-XSS surface).
