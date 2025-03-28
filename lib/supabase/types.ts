export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          created_at: string
          name: string
          website: string
          crn: number
          b2borb2c: "b2b" | "b2c"
          company_offering: string
          sales_channels: string
          is_online_checkout_present: boolean
          sales_channel_perplexity: string
          ecomm_provider: string[] // Using Postgres array
          psp_or_card_processor: string[] // Using Postgres array
          key_persons: string
          logo_url: string | null
          ceo_id: string | null
          ceo_email: string | null
          cfo_id: string | null
          cfo_email: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          website: string
          crn: number
          b2borb2c: "b2b" | "b2c"
          company_offering: string
          sales_channels: string
          is_online_checkout_present: boolean
          ecomm_provider: string[]
          psp_or_card_processor: string[]
          sales_channel_perplexity: string
          key_persons: string
          logo_url?: string | null
          ceo_id?: string | null
          ceo_email?: string | null
          cfo_id?: string | null
          cfo_email?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          website?: string
          crn?: number
          b2borb2c?: "b2b" | "b2c"
          company_offering?: string
          sales_channels?: string
          is_online_checkout_present?: boolean
          ecomm_provider?: string[]
          psp_or_card_processor?: string[]
          sales_channel_perplexity?: string
          key_persons?: string
          logo_url?: string | null
          ceo_id?: string | null
          ceo_email?: string | null
          cfo_id?: string | null
          cfo_email?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}