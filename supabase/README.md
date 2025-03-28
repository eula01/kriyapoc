# Supabase Setup Guide

This guide will help you set up Supabase for this project.

## Setting Up Supabase

1. **Create a Supabase Account and Project**
   - Go to [Supabase](https://supabase.com/) and sign up for an account if you don't have one already.
   - Create a new project and provide the necessary details.

2. **Set Up Database Schema**
   - Access the SQL Editor in your Supabase project dashboard.
   - Copy and paste the contents of the `schema.sql` file found in this directory.
   - Execute the SQL to create the required tables and sample data.

3. **Get Your API Keys**
   - In your Supabase project settings, find the API URL and anon key.
   - Update the `.env.local` file in the root of your project with these values:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

## Database Structure

The project uses a single `accounts` table with the following structure:

- `id`: UUID primary key (generated automatically)
- `created_at`: Timestamp (generated automatically)
- `name`: Text (company name)
- `website`: Text (company website)
- `crn`: Big Integer (Company Registration Number)
- `b2borb2c`: Text (either 'b2b' or 'b2c')
- `company_offering`: Text (what the company offers)
- `sales_channels`: Text (company's sales channels)
- `is_online_checkout_present`: Boolean (true if online checkout is present)
- `ecomm_provider`: Text Array (list of e-commerce providers)
- `psp_or_card_processor`: Text Array (list of payment processors)
- `key_persons`: Text (company's key persons)

## Row Level Security (RLS)

The schema implements basic Row Level Security to allow:
- Reading records for all authenticated users
- Writing, updating and deleting records for authenticated users

You can modify these policies in the Supabase Dashboard if you need more restrictive access controls.

## Making Changes to the Schema

If you need to modify the database schema:

1. Create a new SQL migration file in this directory
2. Apply it to your Supabase project via the SQL Editor
3. Update the TypeScript types in `lib/supabase/types.ts` to reflect your changes 