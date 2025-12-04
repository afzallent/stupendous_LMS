# Project: CourseCompass V2

## Project Overview

CourseCompass V2 is a comprehensive, production-ready Learning Management System (LMS) built with modern web technologies. This Next.js 15 application features a complete course creation, enrollment, and learning platform with real-time communication, payment processing, and extensive testing infrastructure. The system supports multiple user roles (Students, Trainers, Administrators) with distinct capabilities and workflows.

**Key Features:**
- Complete course lifecycle management (creation, publishing, enrollment, learning)
- **Default Course Enrollment**: All users automatically enrolled in JavaScript Fundamentals
- Integrated payment processing with Stripe and UPI support
- Real-time communication via Socket.IO
- Comprehensive testing framework with Puppeteer + Jest
- Interactive assessment system with quizzes and progress tracking
- PM2 deployment configuration for production environments
- Responsive design with dark/light mode support

## Building and Running

### Prerequisites

*   Node.js
*   npm
*   Prisma

### Installation

```bash
npm install
```

### Development

To run the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

### Database

The project uses Prisma as its ORM with SQLite database (`db/custom.db`). The database schema is defined in `prisma/schema.prisma` and includes comprehensive LMS entities (Users, Courses, Lessons, Quizzes, Enrollments, etc.). The following scripts are available for database management:

*   `npm run db:push`: Push the schema to the database.
*   `npm run db:generate`: Generate the Prisma client.
*   `npm run db:migrate`: Run database migrations.
*   `npm run db:reset`: Reset the database.
*   `npm run db:seed`: Seed the database with initial data.
*   `npm run db:default-course`: Enroll all users in the default JavaScript Fundamentals course.
*   `npm run db:verify-course`: Verify default course enrollment status.

### Testing

Comprehensive testing framework implemented with Jest + Puppeteer:

*   `npm test`: Run the complete test suite
*   `npm run test:demo`: Run framework validation tests
*   `npm run test:e2e`: Run end-to-end browser tests
*   `npm run test:report`: Generate interactive HTML test reports

**Test Coverage:**
- Authentication and security testing (XSS, SQL injection, CSRF)
- Form validation with boundary value testing
- Performance testing and Core Web Vitals
- Course purchase and enrollment flow validation
- Responsive design and accessibility testing

### Production Deployment

PM2 configuration available for production deployment:

*   `pm2 start ecosystem.config.js`: Start production server
*   `pm2 start ecosystem.dev.config.js`: Start development server with watch mode
*   `pm2 status`: Check application status
*   `pm2 logs`: View application logs

## Technology Stack

### Core Framework
*   **Framework:** Next.js 15 with App Router architecture
*   **Language:** TypeScript 5 for type safety
*   **Runtime:** React 19 with custom server integration
*   **Server:** Custom Node.js server with Socket.IO integration

### UI & Styling
*   **Styling:** Tailwind CSS 4
*   **Components:** shadcn/ui component library (New York style)
*   **Icons:** Lucide React
*   **Animations:** Framer Motion
*   **Themes:** Next Themes for dark/light mode

### State & Data Management
*   **State Management:** Zustand for client-side state
*   **Data Fetching:** TanStack Query with Axios
*   **Database:** Prisma ORM with SQLite
*   **Validation:** React Hook Form with Zod schemas

### Real-time & Communication
*   **Real-time:** Socket.IO server and client
*   **Authentication:** NextAuth.js (planned)
*   **Payment:** Stripe and UPI integration

### Development & Testing
*   **Linting:** ESLint with Next.js configuration
*   **Testing:** Jest + Puppeteer for E2E testing
*   **Development:** Nodemon for server restarts
*   **Execution:** tsx for TypeScript execution
*   **Deployment:** PM2 for production process management

The project has some specific configurations in `next.config.ts`:

*   TypeScript build errors are ignored.
*   Webpack's Hot Module Replacement (HMR) is disabled in favor of `nodemon` for recompilation.
*   ESLint errors are ignored during builds.

## Project Structure

### Core Application
*   `src/app/`: Next.js 15 App Router with file-based routing
    - `/admin/`: Administrative interface
    - `/auth/`: Authentication pages
    - `/courses/`: Course browsing and management
    - `/instructor/`: Trainer dashboard
    - `/learn/`: Student learning interface
    - `/checkout/`: Payment and enrollment flow
    - `/api/`: Backend API endpoints
*   `src/components/`: Reusable React components including shadcn/ui
*   `src/lib/`: Utilities, database config, and Socket.IO setup
*   `src/hooks/`: Custom React hooks for UI and state management

### Testing Infrastructure
*   `tests/`: Comprehensive Puppeteer + Jest testing framework
    - `fixtures/`: Test data and boundary values
    - `utils/`: Testing utilities and helpers
    - `reports/`: Interactive HTML test reports
    - Configuration files for Jest and Puppeteer

### Configuration & Deployment
*   `server.ts`: Custom server integrating Next.js with Socket.IO
*   `ecosystem.config.js`: PM2 production deployment configuration
*   `ecosystem.dev.config.js`: PM2 development configuration
*   `prisma/schema.prisma`: Complete LMS database schema
*   `next.config.ts`: Next.js configuration with TypeScript build flexibility

### Database
*   `db/custom.db`: SQLite database file
*   Comprehensive schema with Users, Courses, Lessons, Quizzes, Enrollments
*   Support for course progress tracking and payment integration

## Recent Developments

### Bug Fixes & Enhancements
- **Course Purchase Flow**: Fixed redirection issues after successful payment
- **Enrollment System**: Enhanced enrollment creation and dashboard display
- **Learn Dashboard**: Improved course display with empty state handling
- **Testing Framework**: Complete E2E testing infrastructure implementation

### Production Readiness
- PM2 deployment configuration for scalable production deployment
- Comprehensive test coverage including security and performance testing
- Interactive test reporting with detailed analytics
- Real-time communication infrastructure ready for live features
