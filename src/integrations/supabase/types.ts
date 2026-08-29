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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_id: string | null
          id: string
          payload: Json
          read: boolean
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          payload?: Json
          read?: boolean
          type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          payload?: Json
          read?: boolean
          type?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      crew_post_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "crew_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_posts: {
        Row: {
          activity: string
          created_at: string
          departure_area: string | null
          destination: string | null
          has_car: boolean
          id: string
          level: string
          message: string | null
          needs_car: boolean
          status: Database["public"]["Enums"]["crew_post_status"]
          title: string
          updated_at: string
          user_id: string
          when_text: string | null
        }
        Insert: {
          activity?: string
          created_at?: string
          departure_area?: string | null
          destination?: string | null
          has_car?: boolean
          id?: string
          level?: string
          message?: string | null
          needs_car?: boolean
          status?: Database["public"]["Enums"]["crew_post_status"]
          title: string
          updated_at?: string
          user_id: string
          when_text?: string | null
        }
        Update: {
          activity?: string
          created_at?: string
          departure_area?: string | null
          destination?: string | null
          has_car?: boolean
          id?: string
          level?: string
          message?: string | null
          needs_car?: boolean
          status?: Database["public"]["Enums"]["crew_post_status"]
          title?: string
          updated_at?: string
          user_id?: string
          when_text?: string | null
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          accepted_liability_for_event: boolean | null
          accepted_rules_for_event: boolean | null
          available_car_seats: number | null
          confirmation_email_error: string | null
          confirmation_email_sent: boolean
          confirmation_email_sent_at: string | null
          created_at: string
          dismissed_assist_prompt: boolean
          event_id: string
          has_equipment: boolean | null
          id: string
          needs_rental: boolean | null
          needs_ride: boolean | null
          notes: string | null
          offers_car_seats: boolean | null
          status: Database["public"]["Enums"]["registration_status"]
          transport_status:
            | Database["public"]["Enums"]["transport_status"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_liability_for_event?: boolean | null
          accepted_rules_for_event?: boolean | null
          available_car_seats?: number | null
          confirmation_email_error?: string | null
          confirmation_email_sent?: boolean
          confirmation_email_sent_at?: string | null
          created_at?: string
          dismissed_assist_prompt?: boolean
          event_id: string
          has_equipment?: boolean | null
          id?: string
          needs_rental?: boolean | null
          needs_ride?: boolean | null
          notes?: string | null
          offers_car_seats?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"]
          transport_status?:
            | Database["public"]["Enums"]["transport_status"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_liability_for_event?: boolean | null
          accepted_rules_for_event?: boolean | null
          available_car_seats?: number | null
          confirmation_email_error?: string | null
          confirmation_email_sent?: boolean
          confirmation_email_sent_at?: string | null
          created_at?: string
          dismissed_assist_prompt?: boolean
          event_id?: string
          has_equipment?: boolean | null
          id?: string
          needs_rental?: boolean | null
          needs_ride?: boolean | null
          notes?: string | null
          offers_car_seats?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"]
          transport_status?:
            | Database["public"]["Enums"]["transport_status"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          date: string
          departure_time: string | null
          description: string | null
          destination: string
          difficulty: Database["public"]["Enums"]["event_difficulty"]
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          lunch_plan: string | null
          max_participants: number
          meeting_point: string
          organizer_id: string | null
          organizer_name: string | null
          price_estimate: number | null
          rental_available: boolean | null
          required_equipment: string | null
          resort_name: string | null
          return_time: string | null
          safety_destination_ok: boolean
          safety_meeting_point_ok: boolean
          safety_notes: string | null
          safety_return_ok: boolean
          status: Database["public"]["Enums"]["event_status"]
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          date: string
          departure_time?: string | null
          description?: string | null
          destination: string
          difficulty?: Database["public"]["Enums"]["event_difficulty"]
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          lunch_plan?: string | null
          max_participants?: number
          meeting_point: string
          organizer_id?: string | null
          organizer_name?: string | null
          price_estimate?: number | null
          rental_available?: boolean | null
          required_equipment?: string | null
          resort_name?: string | null
          return_time?: string | null
          safety_destination_ok?: boolean
          safety_meeting_point_ok?: boolean
          safety_notes?: string | null
          safety_return_ok?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          date?: string
          departure_time?: string | null
          description?: string | null
          destination?: string
          difficulty?: Database["public"]["Enums"]["event_difficulty"]
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          lunch_plan?: string | null
          max_participants?: number
          meeting_point?: string
          organizer_id?: string | null
          organizer_name?: string | null
          price_estimate?: number | null
          rental_available?: boolean | null
          required_equipment?: string | null
          resort_name?: string | null
          return_time?: string | null
          safety_destination_ok?: boolean
          safety_meeting_point_ok?: boolean
          safety_notes?: string | null
          safety_return_ok?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          related_event_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_event_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_event_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_liability: boolean | null
          accepted_rules: boolean | null
          bio: string | null
          car_seats: number | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          favorite_brands: string[]
          full_name: string | null
          has_car: boolean | null
          has_equipment: boolean | null
          id: string
          mountain_level: Database["public"]["Enums"]["mountain_level"] | null
          needs_rental: boolean | null
          phone: string | null
          profile_picture_url: string | null
          snowboard_level: Database["public"]["Enums"]["snowboard_level"] | null
          updated_at: string
          user_id: string
          username: string | null
          willing_to_drive: boolean | null
        }
        Insert: {
          accepted_liability?: boolean | null
          accepted_rules?: boolean | null
          bio?: string | null
          car_seats?: number | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_brands?: string[]
          full_name?: string | null
          has_car?: boolean | null
          has_equipment?: boolean | null
          id?: string
          mountain_level?: Database["public"]["Enums"]["mountain_level"] | null
          needs_rental?: boolean | null
          phone?: string | null
          profile_picture_url?: string | null
          snowboard_level?:
            | Database["public"]["Enums"]["snowboard_level"]
            | null
          updated_at?: string
          user_id: string
          username?: string | null
          willing_to_drive?: boolean | null
        }
        Update: {
          accepted_liability?: boolean | null
          accepted_rules?: boolean | null
          bio?: string | null
          car_seats?: number | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_brands?: string[]
          full_name?: string | null
          has_car?: boolean | null
          has_equipment?: boolean | null
          id?: string
          mountain_level?: Database["public"]["Enums"]["mountain_level"] | null
          needs_rental?: boolean | null
          phone?: string | null
          profile_picture_url?: string | null
          snowboard_level?:
            | Database["public"]["Enums"]["snowboard_level"]
            | null
          updated_at?: string
          user_id?: string
          username?: string | null
          willing_to_drive?: boolean | null
        }
        Relationships: []
      }
      seat_requests: {
        Row: {
          car_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          passenger_user_id: string
          status: Database["public"]["Enums"]["seat_request_status"]
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          passenger_user_id: string
          status?: Database["public"]["Enums"]["seat_request_status"]
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          passenger_user_id?: string
          status?: Database["public"]["Enums"]["seat_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_requests_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "trip_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_seekers: {
        Row: {
          can_reach_meeting_point: boolean
          created_at: string
          departure_area: string
          event_id: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_reach_meeting_point?: boolean
          created_at?: string
          departure_area: string
          event_id: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_reach_meeting_point?: boolean
          created_at?: string
          departure_area?: string
          event_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_seekers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_cars: {
        Row: {
          available_seats: number
          created_at: string
          departure_area: string
          driver_user_id: string
          event_id: string
          id: string
          meeting_point: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          available_seats?: number
          created_at?: string
          departure_area: string
          driver_user_id: string
          event_id: string
          id?: string
          meeting_point?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          available_seats?: number
          created_at?: string
          departure_area?: string
          driver_user_id?: string
          event_id?: string
          id?: string
          meeting_point?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_cars_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_chat_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checkins: {
        Row: {
          admin_marked_by: string | null
          created_at: string
          destination_checked_in: boolean
          destination_checked_in_at: string | null
          event_id: string
          id: string
          marked_by_admin: boolean
          meeting_point_checked_in: boolean
          meeting_point_checked_in_at: string | null
          return_checked_in: boolean
          return_checked_in_at: string | null
          status: Database["public"]["Enums"]["checkin_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_marked_by?: string | null
          created_at?: string
          destination_checked_in?: boolean
          destination_checked_in_at?: string | null
          event_id: string
          id?: string
          marked_by_admin?: boolean
          meeting_point_checked_in?: boolean
          meeting_point_checked_in_at?: string | null
          return_checked_in?: boolean
          return_checked_in_at?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_marked_by?: string | null
          created_at?: string
          destination_checked_in?: boolean
          destination_checked_in_at?: string | null
          event_id?: string
          id?: string
          marked_by_admin?: boolean
          meeting_point_checked_in?: boolean
          meeting_point_checked_in_at?: string | null
          return_checked_in?: boolean
          return_checked_in_at?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checklist_items: {
        Row: {
          checked: boolean
          checklist_id: string
          id: string
          item_key: string
          updated_at: string
        }
        Insert: {
          checked?: boolean
          checklist_id: string
          id?: string
          item_key: string
          updated_at?: string
        }
        Update: {
          checked?: boolean
          checklist_id?: string
          id?: string
          item_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "trip_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checklists: {
        Row: {
          created_at: string
          event_id: string
          id: string
          progress_percentage: number
          ready_status: Database["public"]["Enums"]["checklist_ready_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          progress_percentage?: number
          ready_status?: Database["public"]["Enums"]["checklist_ready_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          progress_percentage?: number
          ready_status?: Database["public"]["Enums"]["checklist_ready_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_media: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          is_featured: boolean
          is_trip_cover: boolean
          media_type: string
          media_url: string
          status: Database["public"]["Enums"]["media_status"]
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_featured?: boolean
          is_trip_cover?: boolean
          media_type: string
          media_url: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_featured?: boolean
          is_trip_cover?: boolean
          media_type?: string
          media_url?: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      create_notification: {
        Args: {
          _event_id: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          bio: string
          completed_trips: number
          created_at: string
          favorite_brands: string[]
          full_name: string
          profile_picture_url: string
          snowboard_level: Database["public"]["Enums"]["snowboard_level"]
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_participant: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      send_checkin_reminders: { Args: { _event_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      checkin_status:
        | "not_checked_in"
        | "arrived_meeting_point"
        | "arrived_destination"
        | "returned"
        | "absent"
        | "cancelled"
      checklist_ready_status: "preparing" | "ready"
      crew_post_status: "open" | "closed"
      event_difficulty: "easy" | "moderate" | "hard" | "expert"
      event_status: "draft" | "published" | "cancelled" | "completed"
      event_type: "snowboard" | "mountain_walk" | "skate" | "surf"
      media_status: "pending" | "approved" | "rejected"
      mountain_level: "beginner" | "intermediate" | "advanced"
      registration_status:
        | "pending"
        | "confirmed"
        | "waitlisted"
        | "cancelled"
        | "rejected"
      seat_request_status: "pending" | "accepted" | "rejected" | "cancelled"
      snowboard_level: "beginner" | "intermediate" | "advanced" | "expert"
      transport_status:
        | "have_car_will_drive"
        | "have_car_no_drive"
        | "no_car_can_drive"
        | "no_car_need_seat"
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
      app_role: ["admin", "user"],
      checkin_status: [
        "not_checked_in",
        "arrived_meeting_point",
        "arrived_destination",
        "returned",
        "absent",
        "cancelled",
      ],
      checklist_ready_status: ["preparing", "ready"],
      crew_post_status: ["open", "closed"],
      event_difficulty: ["easy", "moderate", "hard", "expert"],
      event_status: ["draft", "published", "cancelled", "completed"],
      event_type: ["snowboard", "mountain_walk", "skate", "surf"],
      media_status: ["pending", "approved", "rejected"],
      mountain_level: ["beginner", "intermediate", "advanced"],
      registration_status: [
        "pending",
        "confirmed",
        "waitlisted",
        "cancelled",
        "rejected",
      ],
      seat_request_status: ["pending", "accepted", "rejected", "cancelled"],
      snowboard_level: ["beginner", "intermediate", "advanced", "expert"],
      transport_status: [
        "have_car_will_drive",
        "have_car_no_drive",
        "no_car_can_drive",
        "no_car_need_seat",
      ],
    },
  },
} as const
