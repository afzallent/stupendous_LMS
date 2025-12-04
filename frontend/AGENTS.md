# Repository Guidelines

## Project Structure & Module Organization
- `src/app` hosts Next.js route handlers and layouts; `src/components` holds reusable UI built with Radix and shadcn.
- `src/lib`, `src/hooks`, and `src/contexts` centralize data utilities, typed hooks, and providers; import via `@/`.
- `prisma/` contains `schema.prisma`, migrations, and seeds; align database changes with helpers in `scripts/`.
- `public/` serves static assets and favicons; `docs/` tracks architecture notes and product briefs.
- `tests/` captures Jest and Puppeteer suites plus generated artifacts in `tests/reports/` and `tests/screenshots/`.

## Build, Test & Development Commands
- `npm run dev` – start Next.js with hot reload; loads environment from `.env.local`.
- `npm run build` / `npm run start` – compile for production then launch the Node server via `server.ts`.
- `npm run lint` – enforce ESLint rules; required to be clean before merging.
- `npm run storybook` – preview component stories at `http://localhost:6006` for visual QA.
- `npm run db:migrate` / `npm run db:seed` – evolve schema and seed baseline data with Prisma.
- `npm run test:e2e` or `npm run test:smoke` – execute full or smoke browser suites; HTML and JSON output land in `tests/reports/`.
- `npm run test:auth` (and related) – run focused Jest suites for authentication, security, forms, and performance.

## Coding Style & Naming Conventions
- Format with Prettier (2-space indent, single quotes in JSX strings) before committing; enable "Format on Save".
- Favor TypeScript strictness; keep shared types in `src/types` and use `zod` schemas for validation.
- Name components and modules in PascalCase, hooks in `useSomething`, and utility files in `kebab-case`.
- Use the `@/` alias for internal imports and avoid relative paths climbing more than two directories.

## Testing Guidelines
- Co-locate new Jest specs under `tests/` named `featureName.test.{ts,js}`.
- Keep new code above 80% statement coverage; capture proof in PR notes if tooling misses it.
- For E2E runs, record scenario tags in `tests/test-runner.js` arguments and attach fresh screenshots when UI shifts.
- Always run `npm run lint` and at least one targeted test command before submitting a PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) as seen in recent history; keep the subject under 72 characters.
- Branch from `develop` using `feature/`, `bugfix/`, or `chore/` prefixes; rebase before opening the PR.
- PR descriptions must outline the change, list validation commands, link related issues, and add UI captures when applicable.
- Request review once checks pass and summarise any follow-up tasks or known risks.

## Configuration & Security Notes
- Copy `.env.example` to `.env.local`; never commit secrets, especially Stripe or NextAuth keys.
- Run `npm run db:reset` locally when schema changes; verify Prisma migrations align with seed expectations.
- Scrub sensitive data from `logs/` before sharing debugging artifacts externally.
