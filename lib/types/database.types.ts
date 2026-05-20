export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      abm_account_contacts: {
        Row: {
          account_id: string
          added_at: string | null
          contact_id: string
          role: string | null
        }
        Insert: {
          account_id: string
          added_at?: string | null
          contact_id: string
          role?: string | null
        }
        Update: {
          account_id?: string
          added_at?: string | null
          contact_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abm_account_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "abm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abm_account_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      abm_accounts: {
        Row: {
          annual_procurement_value_cad: number | null
          created_at: string | null
          id: string
          naics_codes: string[] | null
          name: string
          notes: string | null
          organisation_type: string
          province: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          annual_procurement_value_cad?: number | null
          created_at?: string | null
          id?: string
          naics_codes?: string[] | null
          name: string
          notes?: string | null
          organisation_type: string
          province?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          annual_procurement_value_cad?: number | null
          created_at?: string | null
          id?: string
          naics_codes?: string[] | null
          name?: string
          notes?: string | null
          organisation_type?: string
          province?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      agency_locations: {
        Row: {
          abbreviation: string | null
          canonical_name: string
          created_at: string | null
          id: string
          lat: number
          lng: number
          primary_city: string
          province: string
          region_cluster: string
          source: string | null
        }
        Insert: {
          abbreviation?: string | null
          canonical_name: string
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          primary_city: string
          province: string
          region_cluster: string
          source?: string | null
        }
        Update: {
          abbreviation?: string | null
          canonical_name?: string
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          primary_city?: string
          province?: string
          region_cluster?: string
          source?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          actor_type: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          occurred_at: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          occurred_at?: string
          resource_id: string
          resource_type: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          occurred_at?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      autoblog_runs: {
        Row: {
          closing_date: string
          completed_at: string | null
          content_type: string | null
          created_at: string
          draft_markdown: string | null
          estimated_cost: number | null
          headline: string | null
          id: string
          published_at: string | null
          published_slug: string | null
          quality_score: number | null
          run_id: string
          seo_metadata: Json | null
          status: string
          target_persona: string
          tender_id: string
          total_tokens: number | null
          word_count: number | null
        }
        Insert: {
          closing_date: string
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          draft_markdown?: string | null
          estimated_cost?: number | null
          headline?: string | null
          id?: string
          published_at?: string | null
          published_slug?: string | null
          quality_score?: number | null
          run_id: string
          seo_metadata?: Json | null
          status?: string
          target_persona: string
          tender_id: string
          total_tokens?: number | null
          word_count?: number | null
        }
        Update: {
          closing_date?: string
          completed_at?: string | null
          content_type?: string | null
          created_at?: string
          draft_markdown?: string | null
          estimated_cost?: number | null
          headline?: string | null
          id?: string
          published_at?: string | null
          published_slug?: string | null
          quality_score?: number | null
          run_id?: string
          seo_metadata?: Json | null
          status?: string
          target_persona?: string
          tender_id?: string
          total_tokens?: number | null
          word_count?: number | null
        }
        Relationships: []
      }
      autoblog_settings: {
        Row: {
          enabled: boolean
          frequency: string
          id: number
          posts_per_run: number
          run_time_utc: string
          target_persona: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          frequency?: string
          id?: number
          posts_per_run?: number
          run_time_utc?: string
          target_persona?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          frequency?: string
          id?: number
          posts_per_run?: number
          run_time_utc?: string
          target_persona?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_topics: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_topics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "blog_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_versions: {
        Row: {
          change_type: string
          changed_by: string | null
          content: Json
          created_at: string | null
          id: string
          post_id: string
          version_number: number
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          content: Json
          created_at?: string | null
          id?: string
          post_id: string
          version_number: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          post_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          buyer_stage: string | null
          canonical_url: string | null
          content: string | null
          content_type: string | null
          created_at: string | null
          excerpt: string | null
          gate_asset_ids: string[] | null
          gate_cta: string | null
          generated_at: string | null
          generated_by: string | null
          generation_attempts: number
          generation_error: string | null
          id: string
          is_gated: boolean | null
          jsonld_override: Json | null
          meta_description: string | null
          og_image_url: string | null
          published_at: string | null
          reading_time_minutes: number | null
          reviewer_id: string | null
          reviewer_notes: string | null
          scheduled_at: string | null
          secondary_keywords: string[] | null
          slug: string
          status: string
          target_keyword: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          author_id?: string | null
          buyer_stage?: string | null
          canonical_url?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          excerpt?: string | null
          gate_asset_ids?: string[] | null
          gate_cta?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_attempts?: number
          generation_error?: string | null
          id?: string
          is_gated?: boolean | null
          jsonld_override?: Json | null
          meta_description?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          scheduled_at?: string | null
          secondary_keywords?: string[] | null
          slug: string
          status?: string
          target_keyword?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          author_id?: string | null
          buyer_stage?: string | null
          canonical_url?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          excerpt?: string | null
          gate_asset_ids?: string[] | null
          gate_cta?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_attempts?: number
          generation_error?: string | null
          id?: string
          is_gated?: boolean | null
          jsonld_override?: Json | null
          meta_description?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          scheduled_at?: string | null
          secondary_keywords?: string[] | null
          slug?: string
          status?: string
          target_keyword?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      blog_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_profiles: {
        Row: {
          approved_at: string | null
          business_name: string
          contact_name: string | null
          created_at: string | null
          description: string
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          provinces_served: string[] | null
          slug: string
          unspsc_specialties: string[] | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          approved_at?: string | null
          business_name: string
          contact_name?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          provinces_served?: string[] | null
          slug: string
          unspsc_specialties?: string[] | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          approved_at?: string | null
          business_name?: string
          contact_name?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          provinces_served?: string[] | null
          slug?: string
          unspsc_specialties?: string[] | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      content_attribution: {
        Row: {
          contact_id: string
          id: string
          post_id: string
          touch_type: string
          touched_at: string | null
        }
        Insert: {
          contact_id: string
          id?: string
          post_id: string
          touch_type: string
          touched_at?: string | null
        }
        Update: {
          contact_id?: string
          id?: string
          post_id?: string
          touch_type?: string
          touched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_attribution_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attribution_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          contact_id: string
          id: string
          score: number
          score_breakdown: Json
          scored_at: string | null
          scoring_version: string | null
        }
        Insert: {
          contact_id: string
          id?: string
          score: number
          score_breakdown: Json
          scored_at?: string | null
          scoring_version?: string | null
        }
        Update: {
          contact_id?: string
          id?: string
          score?: number
          score_breakdown?: Json
          scored_at?: string | null
          scoring_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_drafts: {
        Row: {
          copy: string
          created_at: string | null
          id: string
          post_id: string | null
          status: string
        }
        Insert: {
          copy: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string
        }
        Update: {
          copy?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_drafts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          post_id: string | null
          session_id: string
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          post_id?: string | null
          session_id: string
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          post_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_activity_log: {
        Row: {
          contact_id: string
          event_metadata: Json | null
          event_type: string
          id: string
          occurred_at: string | null
          sequence_id: string | null
        }
        Insert: {
          contact_id: string
          event_metadata?: Json | null
          event_type: string
          id?: string
          occurred_at?: string | null
          sequence_id?: string | null
        }
        Update: {
          contact_id?: string
          event_metadata?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string | null
          sequence_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activity_log_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_contacts: {
        Row: {
          business_name: string
          casl_consent_date: string | null
          casl_consent_method: string | null
          casl_consent_source: string | null
          city: string | null
          contact_email: string | null
          contact_website: string | null
          created_at: string | null
          cyberimpact_member_id: string | null
          ibd_registered: boolean | null
          id: string
          last_activity_at: string | null
          notes: string | null
          pipeline: string
          province: string | null
          region_cluster: string | null
          source_url: string | null
          status: string
          unspsc_categories: string[] | null
        }
        Insert: {
          business_name: string
          casl_consent_date?: string | null
          casl_consent_method?: string | null
          casl_consent_source?: string | null
          city?: string | null
          contact_email?: string | null
          contact_website?: string | null
          created_at?: string | null
          cyberimpact_member_id?: string | null
          ibd_registered?: boolean | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          pipeline: string
          province?: string | null
          region_cluster?: string | null
          source_url?: string | null
          status?: string
          unspsc_categories?: string[] | null
        }
        Update: {
          business_name?: string
          casl_consent_date?: string | null
          casl_consent_method?: string | null
          casl_consent_source?: string | null
          city?: string | null
          contact_email?: string | null
          contact_website?: string | null
          created_at?: string | null
          cyberimpact_member_id?: string | null
          ibd_registered?: boolean | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          pipeline?: string
          province?: string | null
          region_cluster?: string | null
          source_url?: string | null
          status?: string
          unspsc_categories?: string[] | null
        }
        Relationships: []
      }
      outreach_matches: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          match_score: number
          matched_unspsc: string | null
          notice_id: string
          notified: boolean | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          match_score: number
          matched_unspsc?: string | null
          notice_id: string
          notified?: boolean | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          match_score?: number
          matched_unspsc?: string | null
          notice_id?: string
          notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_matches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_matches_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "scout_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequences: {
        Row: {
          body_template: string
          created_at: string | null
          delay_days: number
          id: string
          is_active: boolean | null
          pipeline: string
          step: number
          subject_template: string
        }
        Insert: {
          body_template: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean | null
          pipeline: string
          step: number
          subject_template: string
        }
        Update: {
          body_template?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean | null
          pipeline?: string
          step?: number
          subject_template?: string
        }
        Relationships: []
      }
      procurement_weekly_stats: {
        Row: {
          acan_count: number | null
          agency: string
          bid_count: number
          created_at: string | null
          data_source: string | null
          delta_pct: number | null
          id: string
          prev_week_bid_count: number | null
          province: string | null
          top_unspsc_code: string | null
          total_value_cad: number | null
          week_ending: string
        }
        Insert: {
          acan_count?: number | null
          agency: string
          bid_count: number
          created_at?: string | null
          data_source?: string | null
          delta_pct?: number | null
          id?: string
          prev_week_bid_count?: number | null
          province?: string | null
          top_unspsc_code?: string | null
          total_value_cad?: number | null
          week_ending: string
        }
        Update: {
          acan_count?: number | null
          agency?: string
          bid_count?: number
          created_at?: string | null
          data_source?: string | null
          delta_pct?: number | null
          id?: string
          prev_week_bid_count?: number | null
          province?: string | null
          top_unspsc_code?: string | null
          total_value_cad?: number | null
          week_ending?: string
        }
        Relationships: []
      }
      scout_notices: {
        Row: {
          agency: string
          agency_canonical: string | null
          award_date: string | null
          awarded_value_cad: number | null
          closing_date: string | null
          created_at: string | null
          data_source: string
          description: string | null
          estimated_value_cad: number | null
          external_id: string
          gsin_code: string | null
          id: string
          is_acan: boolean | null
          is_buy_canadian: boolean | null
          is_psib: boolean | null
          is_smb_stream: boolean | null
          notice_type: string
          publication_date: string | null
          raw_json: Json | null
          region_cluster: string | null
          region_province: string | null
          solicitation_number: string | null
          title: string
          unspsc_code: string | null
          unspsc_family: string | null
          unspsc_segment: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          agency: string
          agency_canonical?: string | null
          award_date?: string | null
          awarded_value_cad?: number | null
          closing_date?: string | null
          created_at?: string | null
          data_source: string
          description?: string | null
          estimated_value_cad?: number | null
          external_id: string
          gsin_code?: string | null
          id?: string
          is_acan?: boolean | null
          is_buy_canadian?: boolean | null
          is_psib?: boolean | null
          is_smb_stream?: boolean | null
          notice_type: string
          publication_date?: string | null
          raw_json?: Json | null
          region_cluster?: string | null
          region_province?: string | null
          solicitation_number?: string | null
          title: string
          unspsc_code?: string | null
          unspsc_family?: string | null
          unspsc_segment?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          agency?: string
          agency_canonical?: string | null
          award_date?: string | null
          awarded_value_cad?: number | null
          closing_date?: string | null
          created_at?: string | null
          data_source?: string
          description?: string | null
          estimated_value_cad?: number | null
          external_id?: string
          gsin_code?: string | null
          id?: string
          is_acan?: boolean | null
          is_buy_canadian?: boolean | null
          is_psib?: boolean | null
          is_smb_stream?: boolean | null
          notice_type?: string
          publication_date?: string | null
          raw_json?: Json | null
          region_cluster?: string | null
          region_province?: string | null
          solicitation_number?: string | null
          title?: string
          unspsc_code?: string | null
          unspsc_family?: string | null
          unspsc_segment?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      unspsc_codes: {
        Row: {
          class_code: string | null
          class_title: string | null
          code: string
          commodity_title: string | null
          commodity_type_eng: string | null
          commodity_type_fra: string | null
          date_file_published: string | null
          description_eng: string | null
          description_fra: string | null
          family_code: string | null
          family_title: string | null
          gsin_code: string | null
          gsin_description_eng: string | null
          gsin_description_fra: string | null
          hierarchy_level: string | null
          segment_code: string | null
          segment_title: string | null
        }
        Insert: {
          class_code?: string | null
          class_title?: string | null
          code: string
          commodity_title?: string | null
          commodity_type_eng?: string | null
          commodity_type_fra?: string | null
          date_file_published?: string | null
          description_eng?: string | null
          description_fra?: string | null
          family_code?: string | null
          family_title?: string | null
          gsin_code?: string | null
          gsin_description_eng?: string | null
          gsin_description_fra?: string | null
          hierarchy_level?: string | null
          segment_code?: string | null
          segment_title?: string | null
        }
        Update: {
          class_code?: string | null
          class_title?: string | null
          code?: string
          commodity_title?: string | null
          commodity_type_eng?: string | null
          commodity_type_fra?: string | null
          date_file_published?: string | null
          description_eng?: string | null
          description_fra?: string | null
          family_code?: string | null
          family_title?: string | null
          gsin_code?: string | null
          gsin_description_eng?: string | null
          gsin_description_fra?: string | null
          hierarchy_level?: string | null
          segment_code?: string | null
          segment_title?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          modules: string[]
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          modules?: string[]
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          modules?: string[]
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      utm_campaigns: {
        Row: {
          click_count: number | null
          created_at: string | null
          created_by: string | null
          destination_url: string
          full_url: string
          id: string
          name: string
          post_id: string | null
          short_code: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          destination_url: string
          full_url: string
          id?: string
          name: string
          post_id?: string | null
          short_code: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          destination_url?: string
          full_url?: string
          id?: string
          name?: string
          post_id?: string | null
          short_code?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_campaigns_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          ip_hash: string | null
          referrer: string | null
          resolved_contact_id: string | null
          user_agent_hash: string | null
          utm_id: string
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          resolved_contact_id?: string | null
          user_agent_hash?: string | null
          utm_id: string
        }
        Update: {
          clicked_at?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          resolved_contact_id?: string | null
          user_agent_hash?: string | null
          utm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utm_clicks_resolved_contact_id_fkey"
            columns: ["resolved_contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_clicks_utm_id_fkey"
            columns: ["utm_id"]
            isOneToOne: false
            referencedRelation: "utm_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
