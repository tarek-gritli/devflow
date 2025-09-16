# DevFlow

A Stack Overflow-inspired Q&A platform built with Next.js, featuring AI-powered features and modern web technologies.

## Features

- **Question & Answer System**: Post questions, provide answers, and engage with the developer community
- **AI Integration**: OpenAI-powered features for enhanced user experience
- **Authentication**: Google and GitHub OAuth integration
- **Modern UI**: Built with Radix UI components and Tailwind CSS
- **Dark/Light Theme**: Theme switching with next-themes
- **Database**: MongoDB with Mongoose ORM
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **AI Integration**: OpenAI SDK
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- OpenAI API key
- Google OAuth credentials
- GitHub OAuth credentials

### Installation

1. Clone the repository:

```bash
git clone https://github.com/tarek-gritli/devflow
cd devflow
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Fill in your environment variables which are stated in `.env.example` in `.env`

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup

The project includes Docker configuration for easy deployment:

```bash
# Make sure your .env file is configured for Docker
# MONGODB_URI should be set to mongodb://db:27017/devflow

docker-compose up
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `MONGODB_URI`: Database connection string
- `OPENAI_API_KEY`: For AI-powered features
- `AUTH_SECRET`: Secret for JWT signing
- `AUTH_GOOGLE_ID/SECRET`: Google OAuth (optional)
- `AUTH_GITHUB_ID/SECRET`: GitHub OAuth (optional)

## Available Scripts

- `npm run dev`: Start development server with Turbopack
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Project Structure

```
├── app/                    # Next.js app directory
├── components/             # Reusable React components
├── lib/                    # Utility functions and configurations
├── auth.ts                 # Authentication configuration
├── middleware.ts           # Next.js middleware
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.
