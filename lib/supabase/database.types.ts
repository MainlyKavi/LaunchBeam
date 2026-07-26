import type {
  EventType,
  ProjectContent,
  ProjectSettings,
  ProjectStatus,
  ProjectTheme,
  SubscriberStatus,
  TemplateId,
} from "@/lib/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          status: ProjectStatus;
          template_id: TemplateId | string;
          content: ProjectContent;
          theme: ProjectTheme;
          settings: ProjectSettings;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          status?: ProjectStatus;
          template_id?: TemplateId;
          content?: ProjectContent;
          theme?: ProjectTheme;
          settings?: ProjectSettings;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          status?: ProjectStatus;
          template_id?: TemplateId;
          content?: ProjectContent;
          theme?: ProjectTheme;
          settings?: ProjectSettings;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          name: string | null;
          custom_answer: string | null;
          status: SubscriberStatus;
          referral_code: string;
          referred_by: string | null;
          position: number;
          referral_count: number;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          confirmation_token_hash: string | null;
          previous_confirmation_token_hash: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          name?: string | null;
          custom_answer?: string | null;
          status?: SubscriberStatus;
          referral_code: string;
          referred_by?: string | null;
          position: number;
          referral_count?: number;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          confirmation_token_hash?: string | null;
          previous_confirmation_token_hash?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          name?: string | null;
          custom_answer?: string | null;
          status?: SubscriberStatus;
          referral_code?: string;
          referred_by?: string | null;
          position?: number;
          referral_count?: number;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          confirmation_token_hash?: string | null;
          previous_confirmation_token_hash?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: number;
          project_id: string;
          event_type: EventType;
          session_id: string | null;
          subscriber_id: string | null;
          referrer: string | null;
          country: string | null;
          device_type: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          project_id: string;
          event_type: EventType;
          session_id?: string | null;
          subscriber_id?: string | null;
          referrer?: string | null;
          country?: string | null;
          device_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          project_id?: string;
          event_type?: EventType;
          session_id?: string | null;
          subscriber_id?: string | null;
          referrer?: string | null;
          country?: string | null;
          device_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      subscribe_to_waitlist: {
        Args: {
          p_project_slug: string;
          p_email: string;
          p_name?: string | null;
          p_custom_answer?: string | null;
          p_referral_code?: string | null;
          p_session_id?: string | null;
          p_utm_source?: string | null;
          p_utm_medium?: string | null;
          p_utm_campaign?: string | null;
          p_confirmation_token_hash?: string | null;
        };
        Returns: Array<{
          subscriber_id: string;
          email: string;
          status: SubscriberStatus;
          position: number;
          referral_code: string;
          referral_count: number;
          already_subscribed: boolean;
          referral_awarded: boolean;
        }>;
      };
      confirm_waitlist_subscription: {
        Args: {
          p_subscriber_id: string;
          p_confirmation_token_hash: string;
        };
        Returns: Array<{
          subscriber_id: string;
          project_id: string;
          status: SubscriberStatus;
          referral_awarded: boolean;
        }>;
      };
      get_project_unique_visitors: {
        Args: {
          p_project_id: string;
        };
        Returns: number;
      };
      get_project_analytics_totals: {
        Args: {
          p_project_id: string;
          p_start?: string | null;
        };
        Returns: Array<{
          page_views: number;
          unique_visitors: number;
          subscribers: number;
          confirmed_subscribers: number;
          referral_signups: number;
        }>;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
