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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cash_entries: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
          occurred_at: string
          order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          kind: string
          occurred_at?: string
          order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          occurred_at?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          tagline: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          tagline?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          active: boolean
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          active?: boolean
          name: string
          phone?: string
          user_id: string
        }
        Update: {
          active?: boolean
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_locations: {
        Row: {
          accuracy: number
          latitude: number
          longitude: number
          order_id: string
          recorded_at: string
        }
        Insert: {
          accuracy: number
          latitude: number
          longitude: number
          order_id: string
          recorded_at?: string
        }
        Update: {
          accuracy?: number
          latitude?: number
          longitude?: number
          order_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "order_deliveries"
            referencedColumns: ["order_id"]
          },
        ]
      }
      delivery_quotes: {
        Row: {
          customer_address: string
          distance_meters: number
          expires_at: string
          id: string
          origin_store: number
          settings_version: string
          travel_seconds: number
          used_at: string | null
          user_id: string
          zip: string
        }
        Insert: {
          customer_address: string
          distance_meters: number
          expires_at?: string
          id?: string
          origin_store?: number
          settings_version: string
          travel_seconds: number
          used_at?: string | null
          user_id: string
          zip: string
        }
        Update: {
          customer_address?: string
          distance_meters?: number
          expires_at?: string
          id?: string
          origin_store?: number
          settings_version?: string
          travel_seconds?: number
          used_at?: string | null
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          base_fee: number
          enabled: boolean
          id: number
          max_km: number
          origin_address: string
          origin_lat: number
          origin_lng: number
          origin_whatsapp: string | null
          origin_zip: string | null
          per_km: number
          preparation_minutes: number
          second_origin_address: string | null
          second_origin_lat: number | null
          second_origin_lng: number | null
          second_origin_whatsapp: string | null
          second_origin_zip: string | null
          updated_at: string
        }
        Insert: {
          base_fee?: number
          enabled?: boolean
          id?: number
          max_km: number
          origin_address: string
          origin_lat: number
          origin_lng: number
          origin_whatsapp?: string | null
          origin_zip?: string | null
          per_km?: number
          preparation_minutes?: number
          second_origin_address?: string | null
          second_origin_lat?: number | null
          second_origin_lng?: number | null
          second_origin_whatsapp?: string | null
          second_origin_zip?: string | null
          updated_at?: string
        }
        Update: {
          base_fee?: number
          enabled?: boolean
          id?: number
          max_km?: number
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          origin_whatsapp?: string | null
          origin_zip?: string | null
          per_km?: number
          preparation_minutes?: number
          second_origin_address?: string | null
          second_origin_lat?: number | null
          second_origin_lng?: number | null
          second_origin_whatsapp?: string | null
          second_origin_zip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_deliveries: {
        Row: {
          assigned_at: string
          completed_at: string | null
          courier_id: string
          courier_name: string
          customer_id: string
          issue: string
          order_id: string
          started_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          courier_id: string
          courier_name: string
          customer_id: string
          issue?: string
          order_id: string
          started_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          courier_id?: string
          courier_name?: string
          customer_id?: string
          issue?: string
          order_id?: string
          started_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          asaas_checkout_id: string | null
          asaas_checkout_state: string | null
          asaas_checkout_url: string | null
          asaas_creation_started_at: string | null
          change_for: number | null
          code: string
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_distance_meters: number | null
          delivery_minutes: number | null
          delivery_origin_address: string | null
          delivery_quote_id: string | null
          delivery_store: number | null
          delivery_whatsapp: string | null
          id: string
          items: Json
          notes: string
          payment_method: string
          payment_ref: string | null
          shipping_fee: number
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          asaas_checkout_id?: string | null
          asaas_checkout_state?: string | null
          asaas_checkout_url?: string | null
          asaas_creation_started_at?: string | null
          change_for?: number | null
          code?: string
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          delivery_distance_meters?: number | null
          delivery_minutes?: number | null
          delivery_origin_address?: string | null
          delivery_quote_id?: string | null
          delivery_store?: number | null
          delivery_whatsapp?: string | null
          id?: string
          items: Json
          notes?: string
          payment_method?: string
          payment_ref?: string | null
          shipping_fee?: number
          status?: string
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          asaas_checkout_id?: string | null
          asaas_checkout_state?: string | null
          asaas_checkout_url?: string | null
          asaas_creation_started_at?: string | null
          change_for?: number | null
          code?: string
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          delivery_distance_meters?: number | null
          delivery_minutes?: number | null
          delivery_origin_address?: string | null
          delivery_quote_id?: string | null
          delivery_store?: number | null
          delivery_whatsapp?: string | null
          id?: string
          items?: Json
          notes?: string
          payment_method?: string
          payment_ref?: string | null
          shipping_fee?: number
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_quote_id_fkey"
            columns: ["delivery_quote_id"]
            isOneToOne: false
            referencedRelation: "delivery_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accent_color: string
          active: boolean
          category_id: string | null
          compare_price: number | null
          cost: number
          created_at: string
          description: string
          featured: boolean
          flavors: string[]
          id: string
          image_url: string | null
          name: string
          price: number
          puffs: string
          stock: number
          updated_at: string
        }
        Insert: {
          accent_color?: string
          active?: boolean
          category_id?: string | null
          compare_price?: number | null
          cost?: number
          created_at?: string
          description?: string
          featured?: boolean
          flavors?: string[]
          id?: string
          image_url?: string | null
          name: string
          price?: number
          puffs?: string
          stock?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string
          active?: boolean
          category_id?: string | null
          compare_price?: number | null
          cost?: number
          created_at?: string
          description?: string
          featured?: boolean
          flavors?: string[]
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          puffs?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string
          city: string
          created_at: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          zip: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
          zip?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          announcement: string
          id: number
          pix_key: string
          theme: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          announcement?: string
          id?: number
          pix_key?: string
          theme?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          announcement?: string
          id?: number
          pix_key?: string
          theme?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      assign_order_courier: {
        Args: { _courier_id: string; _order_id: string }
        Returns: undefined
      }
      can_read_delivery_location: {
        Args: { _order_id: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      confirm_online_payment: {
        Args: { _order_id: string; _paid: boolean; _ref: string }
        Returns: undefined
      }
      courier_delivery_action: {
        Args: { _action: string; _issue?: string; _order_id: string }
        Returns: undefined
      }
      courier_orders: {
        Args: never
        Returns: {
          change_for: number
          code: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string
          payment_method: string
          status: string
          total: number
        }[]
      }
      delivery_fee: {
        Args: { _base: number; _meters: number; _per_km: number }
        Returns: number
      }
      get_delivery_availability: {
        Args: never
        Returns: {
          enabled: boolean
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order:
        | {
            Args: {
              _change_for?: number
              _items: Json
              _notes: string
              _payment_method: string
            }
            Returns: {
              asaas_checkout_id: string | null
              asaas_checkout_state: string | null
              asaas_checkout_url: string | null
              asaas_creation_started_at: string | null
              change_for: number | null
              code: string
              created_at: string
              customer_address: string
              customer_name: string
              customer_phone: string
              delivery_distance_meters: number | null
              delivery_minutes: number | null
              delivery_origin_address: string | null
              delivery_quote_id: string | null
              delivery_store: number | null
              delivery_whatsapp: string | null
              id: string
              items: Json
              notes: string
              payment_method: string
              payment_ref: string | null
              shipping_fee: number
              status: string
              subtotal: number
              total: number
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _change_for: number
              _delivery_quote_id: string
              _items: Json
              _notes: string
              _payment_method: string
            }
            Returns: {
              asaas_checkout_id: string | null
              asaas_checkout_state: string | null
              asaas_checkout_url: string | null
              asaas_creation_started_at: string | null
              change_for: number | null
              code: string
              created_at: string
              customer_address: string
              customer_name: string
              customer_phone: string
              delivery_distance_meters: number | null
              delivery_minutes: number | null
              delivery_origin_address: string | null
              delivery_quote_id: string | null
              delivery_store: number | null
              delivery_whatsapp: string | null
              id: string
              items: Json
              notes: string
              payment_method: string
              payment_ref: string | null
              shipping_fee: number
              status: string
              subtotal: number
              total: number
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      register_courier: {
        Args: { _active?: boolean; _email: string }
        Returns: undefined
      }
      set_courier_active: {
        Args: { _active: boolean; _courier_id: string }
        Returns: undefined
      }
      set_order_status: {
        Args: { _order_id: string; _status: string }
        Returns: undefined
      }
      update_delivery_location: {
        Args: {
          _accuracy: number
          _latitude: number
          _longitude: number
          _order_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const