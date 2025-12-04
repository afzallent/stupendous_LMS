# Project Structure

## Root Directory Organization

```
├── src/                    # Main source code
├── tests/                  # Comprehensive testing framework
├── prisma/                 # Database schema and migrations
├── db/                     # SQLite database files
├── public/                 # Static assets
├── .kiro/                  # Kiro AI assistant configuration
├── .next/                  # Next.js build output
├── node_modules/           # Dependencies
├── examples/               # Example implementations
├── scripts/                # Development and deployment scripts
├── logs/                   # PM2 application logs (production)
├── ecosystem.config.js     # PM2 production configuration
├── ecosystem.dev.config.js # PM2 development configuration
└── server.ts               # Custom server with Socket.IO integration
```

## Source Code Structure (`src/`)

### App Router (`src/app/`)
- **Next.js 15 App Router** with file-based routing
- **Route Groups**: 
  - `/admin/` - Administrative interface and system management
  - `/auth/` - Authentication pages (login, signup, password reset)
  - `/courses/` - Course browsing, details, and management
  - `/instructor/` - Trainer/instructor dashboard and course creation
  - `/learn/` - Student learning interface and dashboard
  - `/checkout/` - Payment processing and course enrollment
- **API Routes**: `/api/` for backend endpoints including:
  - `/api/courses/` - Course management endpoints
  - `/api/enrollments/` - Student enrollment processing
  - `/api/auth/` - Authentication and user management
  - `/api/payments/` - Payment processing (Stripe, UPI)
  - `/api/student/` - Student dashboard and progress data
- **Global Files**: `layout.tsx`, `page.tsx`, `globals.css`, error handling

### Components (`src/components/`)
- **UI Components**: `ui/` contains shadcn/ui components
- **Reusable Components**: Custom application components
- **Component Organization**: Group by feature or functionality

### Utilities (`src/lib/`)
- **Database**: `db.ts` - Prisma client configuration
- **Authentication**: `auth.tsx` - NextAuth.js setup
- **Socket.IO**: `socket.ts` - Real-time communication setup
- **Utilities**: `utils.ts` - Common helper functions
- **Enrollment Testing**: `enrollment-test-utils.ts` - Test utilities for course purchase flow
- **Validation**: Zod schemas for form validation
- **Payment**: Stripe and UPI integration utilities

### Testing Framework (`tests/`)
- **Test Suites**: Comprehensive Puppeteer + Jest testing
  - `demo.test.js` - Framework validation tests (12/12 passing)
  - `e2e-basic.test.js` - Basic browser automation tests
  - `auth.test.js` - Authentication flow testing
  - `security.test.js` - XSS, SQL injection, CSRF testing
  - `performance.test.js` - Page load and Core Web Vitals
  - `forms.test.js` - Form validation with boundary values
- **Configuration**: 
  - `jest.config.js` - Jest testing framework setup
  - `jest-puppeteer.config.js` - Puppeteer browser configuration
  - `setup.js` - Test environment initialization
- **Test Data**: `fixtures/testData.js` - Comprehensive test datasets
- **Utilities**: `utils/TestUtils.js` - Reusable testing methods
- **Reports**: `reports/` - Interactive HTML test reports
- **Report Generator**: `generate-report.js` - Automated report generation

### Hooks (`src/hooks/`)
- **Custom React Hooks**: Reusable stateful logic
- **UI Hooks**: `use-mobile.ts`, `use-toast.ts`

## Database Structure (`prisma/`)
- **Schema**: `schema.prisma` - Complete LMS data model including:
  - Users with role-based permissions (Student, Trainer, Admin)
  - Courses with chapter-based organization
  - Lessons with video position tracking
  - Quizzes with multiple question types
  - Enrollments with payment integration
  - Progress tracking and analytics
- **Migrations**: `migrations/` - Database migration files
- **Seed Data**: `seed/` - Initial data setup and test data

## Deployment & Production (`/`)
- **Custom Server**: `server.ts` - Next.js + Socket.IO integration
- **PM2 Configuration**: 
  - `ecosystem.config.js` - Production deployment with clustering
  - `ecosystem.dev.config.js` - Development with hot reload
- **Environment**: `.env`, `.env.local`, `.env.example` - Configuration management
- **Scripts**: `scripts/` - Deployment and maintenance scripts
- **Logs**: `logs/` - Structured logging for production monitoring

## Configuration Files
- **shadcn/ui**: `components.json` - UI component configuration
- **TypeScript**: `tsconfig.json` - Compiler settings with build flexibility
- **Tailwind**: `tailwind.config.ts` - Styling configuration with theme support
- **Next.js**: `next.config.ts` - Framework configuration with TypeScript flexibility
- **Server**: `server.ts` - Custom server with Socket.IO integration
- **Testing**: `jest.config.js`, `jest-puppeteer.config.js` - Test framework setup
- **Deployment**: `ecosystem.config.js`, `ecosystem.dev.config.js` - PM2 configurations
- **Linting**: `eslint.config.mjs` - Code quality and style enforcement
- **Docker**: `.dockerignore` - Container deployment configuration

## Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase React components
- **Database**: snake_case table names, camelCase field names
- **Routes**: lowercase with hyphens for URL segments

## Import Aliases
- `@/*` maps to `src/*` for clean imports
- `@/components` for UI components and shadcn/ui elements
- `@/lib` for utilities, database, and configuration files
- `@/hooks` for custom React hooks and state management
- `@/app` for App Router pages and API endpoints

## Recent Structural Additions

### Testing Infrastructure
- Complete E2E testing framework with browser automation
- Interactive HTML report generation with analytics
- Security testing suite with comprehensive payload coverage
- Performance monitoring and Core Web Vitals tracking

### Deployment Configuration
- PM2 process management for production scaling
- Environment-specific configurations (dev, staging, production)
- Structured logging with error handling and monitoring
- Auto-restart capabilities with memory management

### Bug Fixes & Enhancements
- Course purchase redirection flow improvements
- Enhanced enrollment creation and dashboard display
- Payment processing optimization for Stripe and UPI
- Real-time communication infrastructure preparation