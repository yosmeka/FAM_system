# Fixed Asset Management System (FAMS)

A comprehensive fixed asset management system built for Zemen Bank S.C. using modern web technologies.

## Features

- Asset Registration & Management
- Asset Tracking & Transfer
- Depreciation Management
- Asset Disposal
- Insurance & Warranty Tracking
- Maintenance & Condition Monitoring
- Vendor & Procurement Management
- Utilization & Cost Allocation
- Reporting & Analytics
- Role-based Access Control

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- NextAuth.js
- React Query
- Chart.js
- React Hook Form
- Zod

## Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd fams
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Create a PostgreSQL database
   - Update the `.env` file with your database credentials

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fams_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   └── auth/              # Authentication routes
├── components/            # React components
├── lib/                   # Utility functions and configurations
├── providers/             # Context providers
└── types/                 # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For any queries or support, please contact the development team. 