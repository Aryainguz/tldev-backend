# TL;Dev Backend API

Next.js backend API for the TL;Dev mobile app. Provides authentication, tips management, and user interactions.

## Features

- 🔐 **OAuth Authentication** - JWT-based auth with Google, GitHub, Apple
- 💡 **Tips API** - CRUD operations for tech tips
- ❤️ **Interactions** - Like, save, and react to tips
- 📊 **Pagination** - Efficient data fetching with pagination
- 🔔 **Push Notifications** - Register and manage push tokens
- 🗄️ **PostgreSQL + Prisma** - Type-safe database access

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Prisma** - Modern ORM for PostgreSQL
- **JWT** - JSON Web Tokens for authentication
- **Zod** - Runtime type validation

## Project Structure

```
backend/
├── app/
│   └── api/
│       ├── auth/              # Authentication endpoints
│       ├── tips/              # Tips CRUD
│       │   └── [id]/
│       │       ├── like/      # Like/unlike tips
│       │       └── save/      # Save/unsave tips
│       ├── user/              # User profile
│       └── notifications/     # Push notifications
├── lib/
│   ├── prisma.ts             # Prisma client
│   └── auth.ts               # JWT utilities
├── prisma/
│   └── schema.prisma         # Database schema
├── .env.example              # Environment template
└── package.json              # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tldev"
JWT_SECRET="your-super-secret-key"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

4. Set up database:

```bash
npx prisma generate
npx prisma db push
```

5. (Optional) Seed the database:

```bash
npx prisma db seed
```

6. Start development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication

#### POST `/api/auth`

Authenticate or create a user via OAuth.

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "providerId": "google-user-id-123",
  "avatar": "https://..."
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "interests": []
  },
  "token": "jwt-token"
}
```

### User Profile

#### GET `/api/user`

Get current user profile. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "interests": ["JavaScript", "React"],
    "createdAt": "2026-01-31T00:00:00Z"
  }
}
```

#### PATCH `/api/user`

Update user profile. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "name": "Jane Doe",
  "interests": ["Python", "AI"],
  "avatar": "https://..."
}
```

### Tips

#### GET `/api/tips`

Get paginated list of tips.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `trending` (optional): Get trending tips (true/false)

**Example:**

```
GET /api/tips?page=1&limit=10&category=JavaScript
```

**Response:**

```json
{
  "success": true,
  "tips": [
    {
      "id": "tip-id",
      "title": "Array.at() method",
      "description": "Access arrays from the end",
      "code": "arr.at(-1)",
      "language": "javascript",
      "category": "JavaScript",
      "explanation": "...",
      "externalLink": "https://...",
      "author": {
        "id": "user-id",
        "name": "John Doe",
        "avatar": "https://..."
      },
      "likes": 123,
      "saves": 45,
      "isLiked": false,
      "isSaved": false,
      "createdAt": "2026-01-31T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### POST `/api/tips`

Create a new tip. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "title": "New Tip",
  "description": "Description",
  "code": "console.log('hello')",
  "language": "javascript",
  "category": "JavaScript",
  "explanation": "Optional explanation",
  "externalLink": "https://..."
}
```

### Interactions

#### POST `/api/tips/[id]/like`

Like or unlike a tip. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "isLiked": true,
  "message": "Tip liked"
}
```

#### POST `/api/tips/[id]/save`

Save or unsave a tip. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "isSaved": true,
  "message": "Tip saved"
}
```

### Push Notifications

#### POST `/api/notifications/register`

Register a push notification token. Requires authentication.

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Push token registered",
  "pushToken": {
    "id": "token-id",
    "token": "ExponentPushToken[...]",
    "platform": "ios"
  }
}
```

## Database Schema

The database schema is defined in [prisma/schema.prisma](prisma/schema.prisma):

- **User** - User profiles and authentication
- **Tip** - Tech tips with code and metadata
- **Like** - User likes on tips
- **Save** - Saved tips
- **Reaction** - Emoji reactions
- **PushToken** - Push notification tokens

## Running in Production

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

### Environment Variables

Make sure to set production environment variables:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="strong-random-secret"
NODE_ENV="production"
```

## Database Migrations

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Apply Migration

```bash
npx prisma migrate deploy
```

### Reset Database

```bash
npx prisma migrate reset
```

## Testing

Run API tests:

```bash
npm test
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t tldev-backend .
docker run -p 3000:3000 tldev-backend
```

## Troubleshooting

### Prisma Issues

```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
```

### Database Connection

- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions, open an issue on GitHub.
