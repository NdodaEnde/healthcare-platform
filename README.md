# Surgiscan

A medical document management platform built with Next.js 14 App Router, Supabase, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```
   # Create .env.local file with your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The application requires the following tables in your Supabase project:

1. `organizations` - For multi-tenant organization management
   - id (UUID, primary key)
   - name (text)
   - created_at (timestamp)
   - created_by (UUID, foreign key to auth.users)

2. `organization_members` - To track organization membership and roles
   - id (UUID, primary key)
   - user_id (UUID, foreign key to auth.users)
   - organization_id (UUID, foreign key to organizations)
   - role (text, e.g., "admin", "member")
   - created_at (timestamp)

3. `documents` - For storing document metadata
   - id (UUID, primary key)
   - organization_id (UUID, foreign key to organizations)
   - name (text)
   - file_path (text)
   - file_url (text)
   - file_type (text)
   - file_size (integer)
   - status (text, e.g., "pending", "processing", "completed", "failed")
   - created_at (timestamp)
   - processed_at (timestamp)
   - uploaded_by (UUID, foreign key to auth.users)

4. `certificates` - For storing certificate information extracted from documents
   - id (UUID, primary key)
   - document_id (UUID, foreign key to documents)
   - type (text)
   - metadata (jsonb)
   - extracted_at (timestamp)

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components
- `/lib` - Utility functions and shared code

## Features

- Medical document upload and processing
- Certificate extraction and management
- Multi-tenant organization support
- Dashboard with document statistics
- PDF viewing and annotation capabilities
- Secure authentication and authorization using Supabase

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS with Shadcn/UI components
- React Query for data fetching
- Supabase for authentication, database, and storage