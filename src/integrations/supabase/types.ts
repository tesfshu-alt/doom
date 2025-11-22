export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_bank_info: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          daily_income: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number
          total_income: number
          validity_days: number
        }
        Insert: {
          created_at?: string
          daily_income: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          total_income: number
          validity_days: number
        }
        Update: {
          created_at?: string
          daily_income?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          total_income?: number
          validity_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          created_at?: string
          id: string
          phone_number: string
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          referral_code?: string
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recharges: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          payment_proof_url: string | null
          product_id: string
          status: Database["public"]["Enums"]["recharge_status"]
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_proof_url?: string | null
          product_id: string
          status?: Database["public"]["Enums"]["recharge_status"]
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_proof_url?: string | null
          product_id?: string
          status?: Database["public"]["Enums"]["recharge_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recharges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_products: {
        Row: {
          created_at: string
          expiry_date: string
          id: string
          is_active: boolean
          product_id: string
          purchase_date: string
          recharge_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date: string
          id?: string
          is_active?: boolean
          product_id: string
          purchase_date?: string
          recharge_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string
          id?: string
          is_active?: boolean
          product_id?: string
          purchase_date?: string
          recharge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_recharge_id_fkey"
            columns: ["recharge_id"]
            isOneToOne: false
            referencedRelation: "recharges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      recharge_status: "pending" | "approved" | "rejected"
      transaction_type:
        | "recharge"
        | "purchase"
        | "referral_bonus"
        | "daily_income"
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      recharge_status: ["pending", "approved", "rejected"],
      transaction_type: [
        "recharge",
        "purchase",
        "referral_bonus",
        "daily_income",
      ],
      user_role: ["admin", "user"],
    },
  },
} as const
