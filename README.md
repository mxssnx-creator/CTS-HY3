# CTS-HY3 Project

A Next.js application with SQLite database support using Drizzle ORM.

## Tech Stack

- **Framework**: Next.js 16
- **Runtime**: Bun
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Drizzle ORM

## Getting Started

### Prerequisites

- Bun installed
- Git

### Installation

```bash
bun install
```

### Database Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations (auto-runs in sandbox)
bun run db:migrate
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
bun run build
```

## API Endpoints

- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `GET /api/posts` - List all posts
- `POST /api/posts` - Create a new post

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── page.tsx      # Home page
│   ├── layout.tsx    # Root layout
│   └── globals.css   # Global styles
└── db/
    ├── schema.ts     # Database schema
    ├── index.ts      # Database client
    └── migrations/   # Database migrations
```

## Deployment

The project includes a Dockerfile for containerized deployment.

```bash
docker build -t cts-hy3 .
docker run -p 3000:3000 cts-hy3
```

## License

MIT
