# Company Accounts Dashboard

A modern dashboard for managing company accounts with a data table and details modal.

## Features

- Data table with company accounts information
- Detailed view of company information
- Add new accounts
- Edit existing accounts
- Delete accounts
- Responsive design

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS
- Supabase (PostgreSQL database)
- shadcn/ui components
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase account and project

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd company-accounts-dashboard
```

2. Install dependencies

```bash
bun install
```

3. Set up environment variables

Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase

Follow the instructions in `supabase/README.md` to set up your Supabase database.

5. Run the development server

```bash
bun run dev
```

## Directory Structure

- `/app` - Next.js app router pages
- `/components` - React components
- `/lib` - Utility functions and types
- `/public` - Static assets
- `/supabase` - Supabase configuration and schema

## Database Schema

The main entity is `accounts` with the following fields:

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  crn BIGINT NOT NULL,
  b2borb2c TEXT NOT NULL CHECK (b2borb2c IN ('b2b', 'b2c')),
  company_offering TEXT NOT NULL,
  sales_channels TEXT NOT NULL,
  is_online_checkout_present BOOLEAN NOT NULL DEFAULT FALSE,
  ecomm_provider TEXT[] NOT NULL DEFAULT '{}',
  psp_or_card_processor TEXT[] NOT NULL DEFAULT '{}',
  key_persons TEXT NOT NULL
);
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
