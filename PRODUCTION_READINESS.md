# Production Readiness Review — Stupendous LMS

**Date:** 2026-08-15
**Reviewed at commit:** `94de4f4`
**Scope:** Full backend (Django REST) + frontend (Next.js) code and architecture review.
**Explicitly out of scope:** Payment gateway selection/integration (owner is still deciding). Findings that *block* a future payment integration are included, because enrollment must become payment-gated before a gateway is meaningful.

---

## Verdict

**Not production ready.**

The blocker is not the missing payment gateway. It is that **there is nothing to sell**: the entire course library — including lesson video URLs — is readable by anonymous users, and enrollment in any paid course is free to any authenticated user. A payment gateway placed in front of this would be a door with no wall around it.

Beyond that, production boots with a seeded superuser at a documented password, a seeded 100%-off coupon, and configuration that silently falls back to debug mode with a public signing key.

The underlying architecture is sound. App boundaries are clean, quiz scoring is server-side, object-level write permissions are enforced consistently, there is no SQL injection, and no secrets are committed. The defects are concentrated in **read-path access control** and **deployment configuration** — both fixable without redesign.

---

## Severity definitions

| Level | Meaning |
|---|---|
| **P0** | Exploitable now, or guarantees a broken/compromised production. Must fix before any launch. |
| **P1** | Serious security or reliability defect. Fix before real users. |
| **P2** | Correctness, performance, or maintainability debt. Fix soon after launch. |

---

## Remediation status

All P0 and P1 findings are fixed on branch `security/production-hardening`.

| Group | Status |
|---|---|
| P0-1 … P0-10 | ✅ Fixed |
| P1-1 … P1-10 | ✅ Fixed |
| P2-1 … P2-12 | ✅ Fixed, except as noted below |

**Deliberately not done:**

- **Async task queue** (part of P2-5). Email is still sent inside the request cycle, now bounded by `EMAIL_TIMEOUT=10`. Introducing Celery is a deployment-topology change (extra worker + broker) and is better decided alongside the payment gateway, which will also want background jobs.
- **Error tracking** (part of P2-11). No Sentry DSN to configure against. CI is in place; add `sentry-sdk` when an account exists.
- **20 stale backend tests.** They assert pre-fix behaviour — e.g. `test_list_quizzes` expects an anonymous quiz listing to return 200, which is now 401 by design. Not regressions; the expectations need updating. `quizzes/tests.py` is partially updated.
- **`frontend/scripts/`** (part of P2-8). ~18 ad-hoc dev scripts, most targeting the deleted Prisma database. Excluded from the typecheck and the production image, but left on disk for the owner to review rather than deleted.

**Found during remediation, not in the original review:**

- **Two model fields had never been migrated** — `Lesson.duration` (commit `60446a8`) and `User.preferred_language`. The columns did not exist in any deployed database, so every query touching them would raise `ProgrammingError`. Migrations generated; CI now runs `makemigrations --check`.
- **`core/` and `courses/` were missing `__init__.py`**, working only as implicit namespace packages. This broke pytest collection for the entire suite.
- **`courses/urls.py` mounted a second copy of the API router** at `/courses/api/…`, duplicating every endpoint already served under `/api/`.
- **Four frontend bugs surfaced by re-enabling type checking** — see P1-10.

---

# P0 — Launch blockers

### P0-1 · Entire course content is public to anonymous users
**Where:** `backend/courses/serializers.py:80,107` · `backend/courses/views.py:192`

`CourseSerializer` and `CourseDetailSerializer` both embed the full lesson list via `lessons = LessonSerializer(many=True, read_only=True)`, and `LessonSerializer` exposes `video_url` and `video_file`. `CourseViewSet` uses `IsInstructorOrReadOnly`, which returns `True` for all safe methods regardless of authentication.

**Impact:** An unauthenticated `GET /api/courses/` returns every published course together with every lesson's video URL. The paid content library is a public API.

**Fix:** Remove `lessons` from the list/detail serializers used on public endpoints. Serve lesson content only from an enrollment-gated endpoint. Expose a non-sensitive curriculum preview (titles, ordering, durations) separately.

---

### P0-2 · Lesson endpoints have no enrollment gate
**Where:** `backend/courses/views.py:575-586`

`LessonViewSet` declares `permission_classes = [permissions.IsAuthenticated]` and its `get_queryset` filters only by an optional `course_id` — with no enrollment, ownership, or course-status check. `GET /api/lessons/` with no params returns every lesson on the platform.

An `IsEnrolledStudent` permission class already exists at `backend/courses/permissions.py:25` and is **never referenced anywhere in the codebase**.

**Impact:** Any registered user (registration is free and open) can read all lessons of all courses, paid or not.

**Fix:** Restrict the queryset to lessons in courses the user is enrolled in or owns as instructor. Require `course_id`. Apply the existing `IsEnrolledStudent` permission.

---

### P0-3 · Enrollment is free regardless of course price
**Where:** `backend/courses/views.py:821-848`

`EnrollmentViewSet.create` checks only for a duplicate enrollment. `Course.price` and `Course.is_free` are never consulted, and `Course.status` is not checked either.

**Impact:** `POST /api/enrollments/ {"course_id": N}` grants free access to any paid course, and to draft/archived courses.

**Fix:** Reject direct enrollment creation for priced courses. Enrollment in a paid course must be a *consequence* of a confirmed payment, not a client-initiated action. Restrict to `status='published'`.

---

### P0-4 · All coupon codes are publicly listable
**Where:** `backend/courses/views.py:1588-1606` (`CouponListView`) · `:1546-1558` (`CouponViewSet`)

Both are `permissions.AllowAny`. `CouponListView.get` with no `code` parameter returns **every active coupon**, serialized with `code` and `discount_percentage` (`backend/courses/serializers.py:12`).

**Impact:** Anyone can enumerate every discount code on the platform.

**Fix:** Delete the unfiltered listing path. Coupon *validation* should be an authenticated POST that accepts a code and returns only validity plus the resulting price — never a browsable list.

---

### P0-5 · `enroll_with_coupon` ignores the discount percentage
**Where:** `backend/courses/views.py:890-947`

The handler validates the coupon, then calls `Enrollment.objects.create(...)` unconditionally. `coupon.discount_percentage` is used only in the response message. Nothing charges the remaining balance.

**Impact:** A 10%-off coupon grants 100% free access to any course.

**Fix:** Only a 100% discount may grant enrollment directly. Any partial discount must produce a priced order to be settled by the payment gateway.

---

### P0-6 · Production seeds a superuser with a documented password
**Where:** `entrypoint.sh` · `backend/entrypoint.sh` · `backend/create_test_users.py` · `DEPLOYMENT.md`

Both entrypoints unconditionally run `create_test_users.py` on every container boot, creating `admin@test.com / admin123` with `is_staff=True, is_superuser=True`. `DEPLOYMENT.md` documents these credentials as intended production behavior.

**Impact:** Full Django admin compromise by anyone who reads the repository.

**Fix:** Remove all seeding from the production entrypoint. Gate seed scripts behind an explicit opt-in env var and refuse to run when `DEBUG=False`. Delete the seeded accounts from any existing deployment and rotate.

---

### P0-7 · Production auto-creates a 100%-off coupon
**Where:** `entrypoint.sh` · `backend/entrypoint.sh`

Both entrypoints create a `PRERELEASE` coupon with `discount_percentage=100, is_active=True` on every boot, with no expiry and no usage cap.

**Impact:** Universal free access. P0-4 makes it discoverable even if renamed.

**Fix:** Remove from the entrypoint. Create promotional coupons deliberately through the admin, with `valid_until` and `max_uses` set.

---

### P0-8 · `DEBUG` defaults to `True`; `SECRET_KEY` has a hardcoded fallback
**Where:** `backend/lms_project/settings.py:24,27,201`

```python
SECRET_KEY = config('SECRET_KEY', default='django-insecure-qq!hox*...')
DEBUG = config('DEBUG', default=True, cast=bool)
...
SIMPLE_JWT = { 'SIGNING_KEY': SECRET_KEY, ... }
```

**Impact:** A missing env var yields debug tracebacks in production. More seriously, the fallback signing key is public in git — and because it signs JWTs, anyone can forge a valid token for any user, including a superuser. This is a full authentication bypass whenever the env var is absent.

**Fix:** Both must raise on startup when `DEBUG=False`. No insecure default may remain in source. Rotate `SECRET_KEY` on the existing deployment (this invalidates all sessions, which is the desired outcome).

---

### P0-9 · Anyone can self-register as an instructor
**Where:** `backend/core/serializers.py:124-129`

`RegisterSerializer` exposes `is_instructor` as a client-writable field on the public `/api/auth/register/` endpoint.

**Impact:** Privilege escalation. Instructor role grants course creation and — via P1-5 and P1-6 — visibility into every quiz's correct answers and every student's certificates platform-wide.

**Fix:** Drop `is_instructor` from the registration payload; force `is_student=True`. Instructor status is granted by an admin or through a separate application flow.

---

### P0-10 · Uploaded media is ephemeral and unreachable in production
**Where:** `backend/lms_project/settings.py:159-170` · `backend/lms_project/urls.py:50`

`MEDIA_ROOT` is a container-local directory with no volume mount. Media is routed only when `DEBUG=True`. Whitenoise serves `STATIC_ROOT` only, and the Coolify backend deployment runs bare gunicorn with no nginx in front (the repo's `nginx.conf` belongs to a different, unused single-container topology).

A full set of storage backends exists at `backend/media_config/storage.py` (local / WebDAV / S3) but no model field uses it — `User.avatar`, `Course.thumbnail`, `Lesson.video_file` and `UploadedFile.file` all use plain `FileField`/`ImageField` on default storage.

**Impact:** Every avatar, thumbnail and uploaded video returns 404 in production, and all uploads are destroyed on each redeploy.

**Fix:** Switch default storage to S3-compatible object storage via `django-storages`, configured by env var, with local filesystem retained for development.

---

# P1 — Fix before real users

### P1-1 · No token refresh on the frontend
**Where:** `frontend/src/lib/django-api-client.ts` · `frontend/src/lib/auth.tsx:64-72,97`

Access tokens expire in 15 minutes (`settings.py:195`). The API client has no 401 handler and never calls `/api/auth/token/refresh/`. `refresh_token` is written to localStorage at login and read nowhere.

**Impact:** Every user session breaks after 15 minutes.

**Fix:** Intercept 401, refresh once, retry the original request, and log out only if the refresh itself fails. Serialize concurrent refreshes behind a single in-flight promise.

---

### P1-2 · Logout is broken; tokens cannot be revoked
**Where:** `backend/lms_project/settings.py:34-56,197-198` · `backend/core/views.py:80-89`

`rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`. `RefreshToken.blacklist()` therefore does not exist, so the logout handler raises and returns HTTP 400. `BLACKLIST_AFTER_ROTATION=True` silently no-ops.

**Impact:** Logout does not log anyone out. A stolen refresh token stays valid for 7 days, and a password reset does not terminate the attacker's session.

**Fix:** Install the blacklist app, run its migrations, and blacklist all outstanding tokens on password change and reset.

---

### P1-3 · No rate limiting anywhere
**Where:** `backend/lms_project/settings.py:178-189`

No `DEFAULT_THROTTLE_CLASSES`, no `django-axes`, no per-view throttles anywhere in the codebase.

**Impact:** Unlimited credential stuffing against `/api/auth/login/`, unlimited account creation, and unlimited password-reset emails to any address (an outbound spam vector that will damage domain reputation).

**Fix:** DRF scoped throttles — strict on login, registration and password reset; a general anon/user rate otherwise.

---

### P1-4 · Missing production security settings
**Where:** `backend/lms_project/settings.py`

Absent: `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_REFERRER_POLICY`, `SECURE_PROXY_SSL_HEADER`, `X_FRAME_OPTIONS`.

`SECURE_PROXY_SSL_HEADER` matters specifically here because TLS terminates upstream at the proxy; without it Django cannot tell that a request arrived over HTTPS. `DB_SSL_MODE` also defaults to `prefer` (`:116`) rather than `require`.

**Fix:** Apply the full set, conditional on `DEBUG=False`.

---

### P1-5 · Quiz answers are exposed to any user holding the instructor flag
**Where:** `backend/quizzes/serializers.py:12-18` · `backend/quizzes/views.py:24,40`

`QuestionOptionSerializer.to_representation` strips `is_correct` only when `request.user.is_instructor` is false — a **global** flag check, not course ownership. It also leaks unconditionally when the serializer is instantiated without request context.

Separately, `QuizViewSet` uses `IsInstructorOrReadOnly`, so quiz questions and options are readable **unauthenticated**, with no enrollment check. Its `is_active` filter is applied only to authenticated users (`:40`), so anonymous callers additionally see unpublished quizzes.

**Impact:** Combined with P0-9, any user can self-register as an instructor and read the correct answers to every quiz on the platform. Assessment integrity is void.

**Fix:** Restrict `is_correct` to the instructor **of that quiz's course**; default to hiding it when context is absent. Require authentication plus enrollment (or ownership) to read quizzes, and apply the `is_active` filter to anonymous users too.

---

### P1-6 · Cross-tenant data access via the global instructor flag
**Where:** `backend/certificates/views.py:20-28` · `backend/courses/views.py:864-888`

`CertificateViewSet.get_queryset` honours a `?userId=` parameter for any user with `is_instructor=True`, with no check that the student is enrolled in one of *their* courses. `EnrollmentViewSet.check` follows the same pattern.

**Impact:** Any instructor — including a self-registered one — can enumerate any student's certificates and course enrollments.

**Fix:** Scope both to students enrolled in courses the requesting instructor owns.

---

### P1-7 · Unauthenticated Socket.IO server with wildcard CORS
**Where:** `frontend/server.ts:35-41` · `frontend/src/lib/socket.ts`

The Socket.IO server is created with `cors: { origin: "*" }` and registers handlers with no authentication whatsoever. Any client can `join-user` an arbitrary user ID to receive that user's notifications, or emit `discussion-message` into any course room to broadcast forged messages.

The frontend contains **no Socket.IO client code** — the entire feature is unused.

**Fix:** Remove the Socket.IO server and its dependencies. If real-time is needed later, reintroduce it with token authentication and a strict origin allowlist.

---

### P1-8 · `POST /api/user/change_password/` is broken
**Where:** `backend/core/views.py:240-262` · `backend/core/serializers.py:66-113`

The view constructs `ChangePasswordSerializer(data=request.data)` with no context, but `validate()` requires `self.context['user']` and raises `'User context is required.'` when absent. The view then reads `validated_data['old_password']` while the declared field is `current_password`.

**Impact:** The endpoint returns HTTP 400 on every call. Students cannot change their password. (The trainer-specific variant at `backend/core/trainer_views.py:169` passes context correctly and works.)

**Fix:** Pass the user context and use the correct field name; drop the now-redundant manual password check in the view.

---

### P1-9 · `NEXT_PUBLIC_API_URL` may not reach the client bundle
**Where:** `frontend/Dockerfile` · `frontend/src/lib/django-api-client.ts:1`

`NEXT_PUBLIC_*` variables are inlined into the browser bundle **at build time**. The frontend Dockerfile declares no `ARG`/`ENV` for `NEXT_PUBLIC_API_URL`, so unless Coolify is configured to pass it as a build argument, the shipped bundle falls back to `http://localhost:8000`.

**Impact:** If misconfigured, every client-side API call from the deployed site fails. This is the same failure mode documented in the team's Nuxt deployment rule.

**Fix:** Declare it as a build `ARG` in the Dockerfile and verify it is set as a *build* variable in Coolify.

---

### P1-10 · Type and lint errors are suppressed at build time
**Where:** `frontend/next.config.ts:5-10`

```ts
typescript: { ignoreBuildErrors: true },
eslint:     { ignoreDuringBuilds: true },
```

**Impact:** Type errors ship to production silently. In a 24k-line TypeScript codebase this removes the primary safety net.

**Fix:** Re-enable both.

---

# P2 — Fix soon after launch

### P2-1 · N+1 queries on course listing
**Where:** `backend/courses/serializers.py:90-96` · `backend/courses/views.py:190,222` · `backend/activity/api_views.py:193-200`

`CourseSerializer` nests lessons and issues `.count()` twice per course, over a queryset with no `select_related`/`prefetch_related`. The analytics view loops over lessons issuing two queries per iteration.

**Fix:** Prefetch related objects and replace per-object counts with annotations.

---

### P2-2 · Coupon redemption race and missing per-user tracking
**Where:** `backend/courses/models.py:55-58`

`use_coupon()` is a non-atomic read-modify-write, so concurrent redemptions can exceed `max_uses`. There is also no record of *who* redeemed a coupon, so a single user can redeem repeatedly.

**Fix:** Atomic `F()` increment, plus a `CouponRedemption` record with a uniqueness constraint per (coupon, user).

---

### P2-3 · Upload validation trusts client-supplied MIME type
**Where:** `backend/files/views.py:86,215,282,343` · `backend/core/views.py:283-288`

All validation reads `file_obj.content_type`, which is attacker-controlled. `text/plain` is accepted for documents, and media is served from the application's own origin by extension.

**Impact:** An uploaded `.html` file with a spoofed `Content-Type` is served as HTML from the app origin — stored XSS. With JWTs held in `localStorage`, that means token theft.

**Fix:** Verify real content (Pillow for images, magic bytes for others), enforce an extension allowlist, generate server-side filenames, and serve user uploads from a separate domain.

---

### P2-4 · nginx body-size limit contradicts the upload API
**Where:** `nginx.conf`

`client_max_body_size` is unset (nginx default: 1 MB) while the API advertises 500 MB video uploads.

**Fix:** Set an explicit limit matching the largest supported upload, and raise proxy timeouts accordingly.

---

### P2-5 · No caching backend and no task queue
**Where:** `backend/lms_project/settings.py` · `backend/core/views.py:128-158`

No `CACHES` configuration, so Django uses per-process `LocMemCache` — useless across gunicorn workers. No Celery/RQ. Password-reset email is sent synchronously inside the request cycle with only 8 concurrent slots available (2 workers × 4 threads); an SMTP stall blocks a worker thread.

**Fix:** Configure Redis for cache and throttle counters. Move email to a queue (or at minimum enforce a short SMTP timeout).

---

### P2-6 · Unrotated log file will fill the container disk
**Where:** `backend/lms_project/settings.py:271-279`

A plain `logging.FileHandler` writes to `logs/lms.log` with no rotation.

**Fix:** Use `RotatingFileHandler`, or log to stdout only and let the platform handle collection.

---

### P2-7 · Quiz attempt timing is meaningless; time limits unenforceable
**Where:** `backend/quizzes/views.py:117-154`

The `QuizAttempt` row is created at *submission* time, so `started_at ≈ completed_at` and `time_taken` is always ≈ 0. `Quiz.time_limit` is stored but never enforced. The attempt-limit check at `:104` is also racy — concurrent submissions can both pass it.

**Fix:** Add a start-attempt endpoint that creates the attempt row, then validate elapsed time against `time_limit` on submit. Enforce the attempt cap inside a transaction with `select_for_update`.

---

### P2-8 · Dead parallel backend in the frontend
**Where:** `frontend/prisma/schema.prisma` · `frontend/package.json`

A complete second data model exists in Prisma over SQLite — `User`, `Course`, `Enrollment`, `Payment`, `Review`, `SupportTicket`, `ModerationAction` — with `prisma`, `@prisma/client`, `next-auth`, `bcryptjs` and `jsonwebtoken` as runtime dependencies. The app has **zero** Next.js API routes; nothing uses any of it.

**Impact:** Ships dead weight in the production image and invites a future contributor to create a second source of truth for user and payment data.

**Fix:** Remove the Prisma stack and the unused auth dependencies. Note the `Payment` model as a design reference before deleting.

---

### P2-9 · Container and dependency hygiene
**Where:** `Dockerfile` · `frontend/Dockerfile` · `backend/requirements.txt`

- Both images run as `root`; neither declares a `HEALTHCHECK`.
- `collectstatic ... || true` swallows failures, while `CompressedManifestStaticFilesStorage` then raises at request time on any missing manifest entry.
- `requirements.txt` is UTF-16 encoded and omits `gunicorn` and `psycopg2-binary`, which are installed unpinned in the Dockerfile.
- The frontend image is single-stage and ships full `node_modules` plus source.

**Fix:** Non-root user, healthchecks, fail the build on `collectstatic` error, UTF-8 requirements with all runtime deps pinned.

---

### P2-10 · Conflicting deployment topologies in the repo
**Where:** `Dockerfile` + `supervisord.conf` + `nginx.conf` vs. `DEPLOYMENT.md`

The root `Dockerfile` builds a backend-only image, but `supervisord.conf` references `/app/frontend` and nginx, describing a combined single-container deployment that the Coolify setup does not use. `nixpacks.toml` is a further vestigial artifact.

**Impact:** Ambiguity about what actually runs in production; `nginx.conf` settings (including any body-size fix) are silently not applied.

**Fix:** Delete the unused topology, or clearly mark it as an alternative.

---

### P2-11 · No CI and no error tracking
**Where:** repository root

226 test functions exist across the backend but no `.github/workflows`, and no Sentry or equivalent in either app.

**Fix:** A CI workflow running `pytest` and the frontend build on every push; error tracking wired into both apps.

---

### P2-12 · Documentation drift
**Where:** `CLAUDE.md` · `DEPLOYMENT.md`

`CLAUDE.md` describes Next.js 14; `package.json` pins `next@^16.0.8` with React 19. `DEPLOYMENT.md` presents seeded test credentials and the `PRERELEASE` coupon as intended production behavior.

**Fix:** Update both once P0-6 and P0-7 are resolved.

---

---

# Schema-level findings

Identified in a follow-up pass over the data model rather than the request path. All fixed.

### S-1 · Cascade-only deletion destroyed credentials and audit history
**Where:** `certificates/models.py` · `activity/models.py`

`Certificate.student` and `Certificate.course` were both `CASCADE`, so deleting a user or a course silently destroyed every certificate attached to it — including credentials already issued and published for third-party verification. `ActivityLog.user` was likewise `CASCADE`: an audit log that vanishes with the account it incriminates is not an audit log.

**Fix:** both are now `SET_NULL`. Certificates already denormalise `student_name`, `course_title` and `instructor_name` at issue time, so the record stays fully verifiable without its relations. `SET_NULL` rather than `PROTECT` deliberately — `PROTECT` would make it impossible to delete any user who had ever earned a certificate, which conflicts with data-subject erasure requests.

**Still to do when payments land:** apply the same reasoning to the `Order`/`Payment` model. A financial record must never be deleted by a cascade from a user account.

---

### S-2 · Credentials stored in the database in plaintext
**Where:** `core/models.py` (`SiteSettings.email_host_password`) · `media_config/models.py` (S3 keys, file-server password)

Plain `CharField`s, so any database dump, replica or backup exposed them. The `media_config` fields even carried `help_text` claiming they were encrypted, which was never true.

**Fix:** `core/fields.py` provides `EncryptedCharField` using Fernet (AES-128-CBC + HMAC-SHA256). Reads tolerate legacy plaintext so existing rows keep working. Keyed by `FIELD_ENCRYPTION_KEY`, falling back to an HKDF derivation from `SECRET_KEY` — documented as coupling the two, so an explicit key should be set in any environment intended to last.

This protects dumps, backups and replicas. It does **not** protect against application-level code execution, which can read the key. For that, move the secrets to a dedicated manager and store only a reference.

---

### S-3 · Lesson had two paths to a course, kept in agreement by nothing
**Where:** `courses/models.py`

`Lesson.course` and `Lesson.chapter.course` could disagree. This became sharp once the enrollment-scoped querysets started filtering by `course`: a mis-parented lesson would either disappear from the course it is displayed under, or surface inside a course the student had not paid for.

**Fix:** validation in `Lesson.clean()` and `Lesson.save()`, plus a data migration detaching any existing mismatched lesson from its chapter. Detaching is the conservative repair — reassigning `course` to match the chapter would move paid material across course boundaries.

---

### S-4 · Two competing sources of completion truth
**Where:** `courses.Progress` vs `activity.LessonTimeTracking`

Both carried `completed`/`completed_at` for the same `(student, lesson)` pair, unsynced. `Progress` is written by the lesson-completion endpoint; `LessonTimeTracking.completed` had **no writer at all** outside tests — `mark_complete()` was defined and never called. Every report reading it showed zero completions regardless of real student activity.

**Fix:** `Progress` is the single source of truth. `LessonTimeTracking` owns time and engagement metrics only, and its completion flag is now derived by a signal, with a data migration backfilling the accumulated history. The model docstring records the ownership so it is not re-broken.

---

### S-5 · `Question.is_in_bank` could disagree with `quiz IS NULL`
**Where:** `quizzes/models.py`

The flag is a denormalisation of "this question belongs to no quiz", but nothing enforced it, so a bank question could carry a quiz and silently vanish from the bank view.

**Fix:** a `CheckConstraint` rejects both inconsistent states, `save()` derives the flag from the relation, and a data migration normalises existing rows before the constraint is applied.

---

## Notes for the payment integration

The Django backend has **no order or payment model of any kind**. `Enrollment` records only `student`, `course`, `enrolled_at`.

Before a gateway can be integrated:

1. P0-3 and P0-5 must be fixed — enrollment must stop being a client-initiated action for paid courses. **Done:** both now return HTTP 402 rather than granting access.
2. An `Order`/`Payment` model is needed, with an idempotent webhook handler as the *only* path that creates a paid enrollment.
3. `Course.price` is `DecimalField` in USD with no currency field; add one if multi-currency is expected.

### Salvaged prior design

The deleted `frontend/prisma/schema.prisma` (P2-8) contained a previously
designed payment model, preserved here for reference:

```prisma
model Payment {
  id            String        @id @default(cuid())
  amount        Float
  currency      String        @default("USD")
  status        PaymentStatus @default(PENDING)   // PENDING | COMPLETED | FAILED | REFUNDED
  paymentMethod String?
  transactionId String?
  studentId     String
  courseId      String?
  enrollmentId  String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

Porting it to Django, note that `amount` should be `DecimalField`, not
`Float` — binary floating point must never represent money. `transactionId`
should carry a uniqueness constraint so a replayed gateway webhook cannot
create a second enrollment.

---

## What is already sound

- Clean Django app boundaries with per-app serializers, permissions and URLs.
- Server-side quiz scoring with enrollment and attempt-limit checks (`quizzes/views.py:91-158`).
- Certificate issuance verifies genuine lesson completion (`certificates/views.py:30-70`).
- Object-level write ownership enforced consistently in `perform_create`/`perform_update`/`perform_destroy` across courses, lessons, chapters and quizzes.
- No SQL injection; the single `.extra()` call uses a hardcoded expression.
- No secrets committed; `.gitignore` correctly covers `.env`.
- Password reset avoids user enumeration in its response.
- 226 backend test functions — a real foundation to build CI on.
