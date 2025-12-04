# Technology Stack

## Core Framework
- **Next.js 15** with App Router architecture
- **TypeScript 5** for type safety
- **React 19** with React Strict Mode disabled
- **Node.js** runtime with custom server setup

## Database & ORM
- **Prisma** as the ORM with SQLite database
- Database located at `db/custom.db`
- Schema defines comprehensive LMS entities (Users, Courses, Lessons, Quizzes, etc.)

## UI & Styling
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library (New York style)
- **Radix UI** primitives for accessible components
- **Lucide React** for icons
- **Framer Motion** for animations
- **Next Themes** for dark/light mode

## State Management & Data
- **Zustand** for client-side state management
- **TanStack Query** for server state and caching
- **React Hook Form** with **Zod** validation
- **Axios** for HTTP requests

## Real-time Features
- **Socket.IO** server and client for real-time communication
- Custom server setup in `server.ts` integrating Next.js with Socket.IO
- Ready for live chat, notifications, and collaborative features

## Testing Framework
- **Jest + Puppeteer** for comprehensive end-to-end testing
- **Interactive HTML Reports** with responsive design and analytics
- **Security Testing**: XSS, SQL injection, CSRF protection tests
- **Performance Testing**: Page load times, Core Web Vitals monitoring
- **Boundary Value Testing**: Form validation with edge cases
- **Authentication Testing**: Login, signup, session management
- **Complete Test Coverage**: 45+ test cases across 8 test suites

## Payment Integration
- **Stripe** integration for international payments
- **UPI** support for Indian market
- **Course Purchase Flow** with enrollment automation
- **Payment Success Handling** with auto-redirect functionality

## Production Deployment
- **PM2** process management for production environments
- **Ecosystem Configuration** for development and production
- **Auto-restart** capabilities with memory management
- **Logging** with structured error and output logs
- **Cluster Mode** support for scaling

## Development Tools
- **ESLint** with Next.js config (build errors ignored)
- **TypeScript** with relaxed settings (`noImplicitAny: false`)
- **Nodemon** for development server restarts
- **tsx** for TypeScript execution

## Common Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start              # Start production server

# Database
npm run db:push        # Push schema changes to database
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:reset       # Reset database

# Testing
npm test               # Run complete test suite
npm run test:demo      # Run framework validation tests
npm run test:e2e       # Run end-to-end browser tests
npm run test:report    # Generate interactive HTML reports

# Production Deployment
pm2 start ecosystem.config.js     # Start production server
pm2 start ecosystem.dev.config.js # Start development with watch
pm2 status                        # Check application status
pm2 logs coursecompass-v2         # View application logs
pm2 restart coursecompass-v2      # Restart application
pm2 stop coursecompass-v2         # Stop application

# Code Quality
npm run lint           # Run ESLint
```

## Configuration Notes
- TypeScript build errors are ignored in production for flexibility
- ESLint errors ignored during builds to prevent deployment blocks
- Hot reloading disabled in favor of nodemon for better stability
- Custom server handles both Next.js and Socket.IO on port 3000
- PM2 configured for production with memory management and auto-restart
- Comprehensive test framework with browser automation capabilities
- Payment integration ready for both Stripe and UPI processing
- Real-time communication infrastructure prepared for live features

## Recent Enhancements
- **Course Purchase Bug Fixes**: Resolved redirection issues after payment
- **Enrollment Flow**: Enhanced enrollment creation and dashboard display
- **Testing Infrastructure**: Complete E2E testing framework with interactive reports
- **PM2 Deployment**: Production-ready process management configuration
- **Security Testing**: Comprehensive security payload testing for XSS, SQL injection
- **Performance Monitoring**: Page load time tracking and Core Web Vitals measurement