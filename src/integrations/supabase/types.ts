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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          admin_id: string | null
          created_at: string
          field_name: string
          id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
          section: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          field_name: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          section: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          field_name?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          section?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          allowed_currencies: string[]
          allowed_networks: string[]
          auto_confirm: boolean
          created_at: string
          encrypted_api_key: string
          encrypted_ipn_secret: string
          fee_handling: string
          gateway_id: string
          id: string
          mode: string
          updated_at: string
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          allowed_currencies?: string[]
          allowed_networks?: string[]
          auto_confirm?: boolean
          created_at?: string
          encrypted_api_key?: string
          encrypted_ipn_secret?: string
          fee_handling?: string
          gateway_id: string
          id?: string
          mode?: string
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string
        }
        Update: {
          allowed_currencies?: string[]
          allowed_networks?: string[]
          auto_confirm?: boolean
          created_at?: string
          encrypted_api_key?: string
          encrypted_ipn_secret?: string
          fee_handling?: string
          gateway_id?: string
          id?: string
          mode?: string
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_credentials_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "api_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      api_gateways: {
        Row: {
          active: boolean
          auto_disable: boolean
          consecutive_failures: number
          created_at: string
          environment: string
          id: string
          last_health_check: string | null
          max_calls_per_minute: number
          max_failures_before_disable: number
          provider_name: string
          status: string
          updated_at: string
          webhook_status: string
        }
        Insert: {
          active?: boolean
          auto_disable?: boolean
          consecutive_failures?: number
          created_at?: string
          environment?: string
          id?: string
          last_health_check?: string | null
          max_calls_per_minute?: number
          max_failures_before_disable?: number
          provider_name: string
          status?: string
          updated_at?: string
          webhook_status?: string
        }
        Update: {
          active?: boolean
          auto_disable?: boolean
          consecutive_failures?: number
          created_at?: string
          environment?: string
          id?: string
          last_health_check?: string | null
          max_calls_per_minute?: number
          max_failures_before_disable?: number
          provider_name?: string
          status?: string
          updated_at?: string
          webhook_status?: string
        }
        Relationships: []
      }
      api_health_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          provider: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          provider: string
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bot_activity: {
        Row: {
          bot_enabled: boolean
          capital_allocation: number
          compound_profits: boolean
          created_at: string
          daily_trade_limit: number
          id: string
          last_reset_at: string
          loss_today: number
          max_per_trade_percent: number
          profit_today: number
          risk_profile: string
          trades_today: number
          user_id: string
        }
        Insert: {
          bot_enabled?: boolean
          capital_allocation?: number
          compound_profits?: boolean
          created_at?: string
          daily_trade_limit?: number
          id?: string
          last_reset_at?: string
          loss_today?: number
          max_per_trade_percent?: number
          profit_today?: number
          risk_profile?: string
          trades_today?: number
          user_id: string
        }
        Update: {
          bot_enabled?: boolean
          capital_allocation?: number
          compound_profits?: boolean
          created_at?: string
          daily_trade_limit?: number
          id?: string
          last_reset_at?: string
          loss_today?: number
          max_per_trade_percent?: number
          profit_today?: number
          risk_profile?: string
          trades_today?: number
          user_id?: string
        }
        Relationships: []
      }
      bot_alert_settings: {
        Row: {
          api_failure_alert: boolean
          consecutive_loss_limit: number
          daily_loss_cap: number
          drawdown_threshold_percent: number
          exposure_spike_percent: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_failure_alert?: boolean
          consecutive_loss_limit?: number
          daily_loss_cap?: number
          drawdown_threshold_percent?: number
          exposure_spike_percent?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_failure_alert?: boolean
          consecutive_loss_limit?: number
          daily_loss_cap?: number
          drawdown_threshold_percent?: number
          exposure_spike_percent?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bot_capital_rules: {
        Row: {
          auto_rebalance: boolean
          capital_locked_per_trade_percent: number
          id: string
          liquidity_buffer_percent: number
          updated_at: string
          updated_by: string | null
          wallet_allocation_percent: number
        }
        Insert: {
          auto_rebalance?: boolean
          capital_locked_per_trade_percent?: number
          id?: string
          liquidity_buffer_percent?: number
          updated_at?: string
          updated_by?: string | null
          wallet_allocation_percent?: number
        }
        Update: {
          auto_rebalance?: boolean
          capital_locked_per_trade_percent?: number
          id?: string
          liquidity_buffer_percent?: number
          updated_at?: string
          updated_by?: string | null
          wallet_allocation_percent?: number
        }
        Relationships: []
      }
      bot_default_config: {
        Row: {
          default_capital_allocation_percent: number
          default_daily_trade_cap: number
          default_max_exposure_percent: number
          default_risk_level: string
          id: string
          updated_at: string
        }
        Insert: {
          default_capital_allocation_percent?: number
          default_daily_trade_cap?: number
          default_max_exposure_percent?: number
          default_risk_level?: string
          id?: string
          updated_at?: string
        }
        Update: {
          default_capital_allocation_percent?: number
          default_daily_trade_cap?: number
          default_max_exposure_percent?: number
          default_risk_level?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_global_settings: {
        Row: {
          enabled: boolean
          global_risk_mode: string
          id: string
          max_concurrent_trades: number
          max_platform_exposure: number
          trading_window_end: string | null
          trading_window_start: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          global_risk_mode?: string
          id?: string
          max_concurrent_trades?: number
          max_platform_exposure?: number
          trading_window_end?: string | null
          trading_window_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          global_risk_mode?: string
          id?: string
          max_concurrent_trades?: number
          max_platform_exposure?: number
          trading_window_end?: string | null
          trading_window_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bot_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          category: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: string | null
          previous_value: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bot_strategy_settings: {
        Row: {
          id: string
          max_daily_platform_loss: number
          max_loss_per_trade: number
          max_roi_percent: number
          max_trade_duration_min: number
          min_roi_percent: number
          min_trade_duration_min: number
          slippage_control_percent: number
          spread_tolerance_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          max_daily_platform_loss?: number
          max_loss_per_trade?: number
          max_roi_percent?: number
          max_trade_duration_min?: number
          min_roi_percent?: number
          min_trade_duration_min?: number
          slippage_control_percent?: number
          spread_tolerance_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          max_daily_platform_loss?: number
          max_loss_per_trade?: number
          max_roi_percent?: number
          max_trade_duration_min?: number
          min_roi_percent?: number
          min_trade_duration_min?: number
          slippage_control_percent?: number
          spread_tolerance_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      custom_referral_config: {
        Row: {
          created_at: string
          id: string
          level1_percent: number
          level2_percent: number
          level3_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level1_percent?: number
          level2_percent?: number
          level3_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level1_percent?: number
          level2_percent?: number
          level3_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_settings: {
        Row: {
          address_rotation_enabled: boolean
          auto_approve: boolean
          confirmations_required: number
          currency: string
          id: string
          manual_review_threshold: number
          max_amount: number
          min_amount: number
          updated_at: string
        }
        Insert: {
          address_rotation_enabled?: boolean
          auto_approve?: boolean
          confirmations_required?: number
          currency: string
          id?: string
          manual_review_threshold?: number
          max_amount?: number
          min_amount?: number
          updated_at?: string
        }
        Update: {
          address_rotation_enabled?: boolean
          auto_approve?: boolean
          confirmations_required?: number
          currency?: string
          id?: string
          manual_review_threshold?: number
          max_amount?: number
          min_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          method: string
          network: string | null
          screenshot_url: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          network?: string | null
          screenshot_url?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          network?: string | null
          screenshot_url?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          email_type: string
          id: string
          processed_at: string | null
          status: string
          user_id: string
          variables: Json
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
          variables?: Json
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id?: string
          variables?: Json
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          deposit_body: string
          deposit_subject: string
          id: string
          notify_deposit: boolean
          notify_settlement: boolean
          notify_signup: boolean
          notify_withdrawal: boolean
          resend_api_key: string
          sender_email: string
          sender_name: string
          settlement_body: string
          settlement_subject: string
          signup_body: string
          signup_subject: string
          updated_at: string
          withdrawal_body: string
          withdrawal_subject: string
        }
        Insert: {
          deposit_body?: string
          deposit_subject?: string
          id?: string
          notify_deposit?: boolean
          notify_settlement?: boolean
          notify_signup?: boolean
          notify_withdrawal?: boolean
          resend_api_key?: string
          sender_email?: string
          sender_name?: string
          settlement_body?: string
          settlement_subject?: string
          signup_body?: string
          signup_subject?: string
          updated_at?: string
          withdrawal_body?: string
          withdrawal_subject?: string
        }
        Update: {
          deposit_body?: string
          deposit_subject?: string
          id?: string
          notify_deposit?: boolean
          notify_settlement?: boolean
          notify_signup?: boolean
          notify_withdrawal?: boolean
          resend_api_key?: string
          sender_email?: string
          sender_name?: string
          settlement_body?: string
          settlement_subject?: string
          signup_body?: string
          signup_subject?: string
          updated_at?: string
          withdrawal_body?: string
          withdrawal_subject?: string
        }
        Relationships: []
      }
      engine_config: {
        Row: {
          auto_sync_interval_seconds: number
          exchange_api_status: string
          id: string
          updated_at: string
          websocket_enabled: boolean
        }
        Insert: {
          auto_sync_interval_seconds?: number
          exchange_api_status?: string
          id?: string
          updated_at?: string
          websocket_enabled?: boolean
        }
        Update: {
          auto_sync_interval_seconds?: number
          exchange_api_status?: string
          id?: string
          updated_at?: string
          websocket_enabled?: boolean
        }
        Relationships: []
      }
      footer_pages: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_faq: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_hero: {
        Row: {
          headline: string
          id: string
          primary_cta_text: string
          secondary_cta_text: string
          subheadline: string
          updated_at: string
        }
        Insert: {
          headline?: string
          id?: string
          primary_cta_text?: string
          secondary_cta_text?: string
          subheadline?: string
          updated_at?: string
        }
        Update: {
          headline?: string
          id?: string
          primary_cta_text?: string
          secondary_cta_text?: string
          subheadline?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          id: string
          items: Json
          section_key: string
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          items?: Json
          section_key: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          id?: string
          items?: Json
          section_key?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_seo: {
        Row: {
          id: string
          keywords: string
          meta_description: string
          meta_title: string
          og_description: string
          og_image: string
          og_title: string
          updated_at: string
        }
        Insert: {
          id?: string
          keywords?: string
          meta_description?: string
          meta_title?: string
          og_description?: string
          og_image?: string
          og_title?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keywords?: string
          meta_description?: string
          meta_title?: string
          og_description?: string
          og_image?: string
          og_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc: {
        Row: {
          admin_note: string | null
          document_type: string | null
          document_url: string | null
          id: string
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liquidity_rules: {
        Row: {
          auto_disable_withdrawals: boolean
          emergency_threshold_percent: number
          id: string
          min_buffer_percent: number
          updated_at: string
        }
        Insert: {
          auto_disable_withdrawals?: boolean
          emergency_threshold_percent?: number
          id?: string
          min_buffer_percent?: number
          updated_at?: string
        }
        Update: {
          auto_disable_withdrawals?: boolean
          emergency_threshold_percent?: number
          id?: string
          min_buffer_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          daily_withdrawal_limit: number
          description: string
          duration_days: number | null
          id: string
          is_active: boolean
          is_free_plan: boolean
          max_auto_trade_slots: number
          max_trade_amount: number
          max_trades_per_day: number
          monthly_price: number
          name: string
          updated_at: string
          upgrade_price: number
        }
        Insert: {
          created_at?: string
          daily_withdrawal_limit?: number
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          is_free_plan?: boolean
          max_auto_trade_slots?: number
          max_trade_amount?: number
          max_trades_per_day?: number
          monthly_price?: number
          name: string
          updated_at?: string
          upgrade_price?: number
        }
        Update: {
          created_at?: string
          daily_withdrawal_limit?: number
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          is_free_plan?: boolean
          max_auto_trade_slots?: number
          max_trade_amount?: number
          max_trades_per_day?: number
          monthly_price?: number
          name?: string
          updated_at?: string
          upgrade_price?: number
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          auto_calculate: boolean
          id: string
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          auto_calculate?: boolean
          id?: string
          key: string
          label: string
          updated_at?: string
          value?: string
        }
        Update: {
          auto_calculate?: boolean
          id?: string
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_frozen: boolean
          kyc_status: string
          plan_expires_at: string | null
          plan_id: string | null
          plan_started_at: string | null
          referral_code: string | null
          referred_by: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_frozen?: boolean
          kyc_status?: string
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_frozen?: boolean
          kyc_status?: string
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          commission_amount: number
          created_at: string
          deposit_id: string
          id: string
          level: number
          referred_user_id: string
          referrer_id: string
          source_user_id: string | null
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          deposit_id: string
          id?: string
          level?: number
          referred_user_id: string
          referrer_id: string
          source_user_id?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string
          deposit_id?: string
          id?: string
          level?: number
          referred_user_id?: string
          referrer_id?: string
          source_user_id?: string | null
        }
        Relationships: []
      }
      referral_config: {
        Row: {
          default_commission_percent: number
          id: string
          level1_commission_percent: number
          level2_commission_percent: number
          level3_commission_percent: number
          max_commission_per_deposit: number
          multi_level_enabled: boolean
          referral_bonus_cap: number
          updated_at: string
        }
        Insert: {
          default_commission_percent?: number
          id?: string
          level1_commission_percent?: number
          level2_commission_percent?: number
          level3_commission_percent?: number
          max_commission_per_deposit?: number
          multi_level_enabled?: boolean
          referral_bonus_cap?: number
          updated_at?: string
        }
        Update: {
          default_commission_percent?: number
          id?: string
          level1_commission_percent?: number
          level2_commission_percent?: number
          level3_commission_percent?: number
          max_commission_per_deposit?: number
          multi_level_enabled?: boolean
          referral_bonus_cap?: number
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          total_commission: number
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          total_commission?: number
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          total_commission?: number
        }
        Relationships: []
      }
      risk_profile_config: {
        Row: {
          id: string
          profile_name: string
          roi_max: number
          roi_min: number
          updated_at: string
          volatility_level: string
        }
        Insert: {
          id?: string
          profile_name: string
          roi_max?: number
          roi_min?: number
          updated_at?: string
          volatility_level?: string
        }
        Update: {
          id?: string
          profile_name?: string
          roi_max?: number
          roi_min?: number
          updated_at?: string
          volatility_level?: string
        }
        Relationships: []
      }
      risk_scores: {
        Row: {
          created_at: string
          id: string
          last_calculated_at: string
          risk_flags: Json | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_calculated_at?: string
          risk_flags?: Json | null
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_calculated_at?: string
          risk_flags?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      security_config: {
        Row: {
          admin_ip_whitelist: string
          id: string
          ip_lock_enabled: boolean
          max_login_attempts: number
          two_factor_required: boolean
          updated_at: string
          withdrawal_cooldown_hours: number
        }
        Insert: {
          admin_ip_whitelist?: string
          id?: string
          ip_lock_enabled?: boolean
          max_login_attempts?: number
          two_factor_required?: boolean
          updated_at?: string
          withdrawal_cooldown_hours?: number
        }
        Update: {
          admin_ip_whitelist?: string
          id?: string
          ip_lock_enabled?: boolean
          max_login_attempts?: number
          two_factor_required?: boolean
          updated_at?: string
          withdrawal_cooldown_hours?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          reference_id: string | null
          resolved: boolean
          severity: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reference_id?: string | null
          resolved?: boolean
          severity?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reference_id?: string | null
          resolved?: boolean
          severity?: string
          type?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          email_verification_required: boolean
          id: string
          kyc_required: boolean
          maintenance_mode: boolean
          platform_name: string
          registration_enabled: boolean
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          email_verification_required?: boolean
          id?: string
          kyc_required?: boolean
          maintenance_mode?: boolean
          platform_name?: string
          registration_enabled?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          email_verification_required?: boolean
          id?: string
          kyc_required?: boolean
          maintenance_mode?: boolean
          platform_name?: string
          registration_enabled?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_financial_rules: {
        Row: {
          deposit_confirmation_required: boolean
          id: string
          manual_withdrawal_approval: boolean
          min_auto_deposit: number
          min_deposit: number
          min_withdrawal: number
          updated_at: string
          withdrawal_fee_percent: number
        }
        Insert: {
          deposit_confirmation_required?: boolean
          id?: string
          manual_withdrawal_approval?: boolean
          min_auto_deposit?: number
          min_deposit?: number
          min_withdrawal?: number
          updated_at?: string
          withdrawal_fee_percent?: number
        }
        Update: {
          deposit_confirmation_required?: boolean
          id?: string
          manual_withdrawal_approval?: boolean
          min_auto_deposit?: number
          min_deposit?: number
          min_withdrawal?: number
          updated_at?: string
          withdrawal_fee_percent?: number
        }
        Relationships: []
      }
      system_runtime_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: string
          updated_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value?: string
          updated_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          name: string
          photo_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          name: string
          photo_url?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          bio?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          name?: string
          photo_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      totp_secrets: {
        Row: {
          created_at: string
          encrypted_secret: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          encrypted_secret: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          encrypted_secret?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          amount: number
          completed_at: string | null
          id: string
          profit: number | null
          started_at: string
          status: string
          trade_id: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          id?: string
          profit?: number | null
          started_at?: string
          status?: string
          trade_id: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          id?: string
          profit?: number | null
          started_at?: string
          status?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_generator_config: {
        Row: {
          enabled: boolean
          exchanges: string[]
          generation_interval_minutes: number
          id: string
          max_active_trades: number
          max_duration_hours: number
          max_investment_default: number
          min_duration_hours: number
          min_investment_default: number
          slot_limit_default: number
          trading_pairs: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          exchanges?: string[]
          generation_interval_minutes?: number
          id?: string
          max_active_trades?: number
          max_duration_hours?: number
          max_investment_default?: number
          min_duration_hours?: number
          min_investment_default?: number
          slot_limit_default?: number
          trading_pairs?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          exchanges?: string[]
          generation_interval_minutes?: number
          id?: string
          max_active_trades?: number
          max_duration_hours?: number
          max_investment_default?: number
          min_duration_hours?: number
          min_investment_default?: number
          slot_limit_default?: number
          trading_pairs?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trade_settlement_summary: {
        Row: {
          id: string
          processed_at: string
          total_investors: number
          total_paid: number
          total_principal: number
          total_profit: number
          trade_id: string
        }
        Insert: {
          id?: string
          processed_at?: string
          total_investors?: number
          total_paid?: number
          total_principal?: number
          total_profit?: number
          trade_id: string
        }
        Update: {
          id?: string
          processed_at?: string
          total_investors?: number
          total_paid?: number
          total_principal?: number
          total_profit?: number
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_settlement_summary_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          auto_close: boolean
          buy_exchange: string
          capital_cap: number | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number
          expires_at: string | null
          id: string
          max_investment: number
          min_investment: number
          risk_level: string
          roi_percent: number
          sell_exchange: string
          settled_at: string | null
          settlement_attempts: number
          settlement_date: string | null
          settlement_mode: string
          settlement_processed: boolean
          slot_limit: number
          slots_filled: number
          status: string
          strategy_type: string
          title: string
          trading_pair: string
        }
        Insert: {
          auto_close?: boolean
          buy_exchange?: string
          capital_cap?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours: number
          expires_at?: string | null
          id?: string
          max_investment: number
          min_investment: number
          risk_level?: string
          roi_percent: number
          sell_exchange?: string
          settled_at?: string | null
          settlement_attempts?: number
          settlement_date?: string | null
          settlement_mode?: string
          settlement_processed?: boolean
          slot_limit?: number
          slots_filled?: number
          status?: string
          strategy_type?: string
          title: string
          trading_pair?: string
        }
        Update: {
          auto_close?: boolean
          buy_exchange?: string
          capital_cap?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          expires_at?: string | null
          id?: string
          max_investment?: number
          min_investment?: number
          risk_level?: string
          roi_percent?: number
          sell_exchange?: string
          settled_at?: string | null
          settlement_attempts?: number
          settlement_date?: string | null
          settlement_mode?: string
          settlement_processed?: boolean
          slot_limit?: number
          slots_filled?: number
          status?: string
          strategy_type?: string
          title?: string
          trading_pair?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
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
      wallets: {
        Row: {
          address: string
          archived_at: string | null
          balance: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_synced: string | null
          min_deposit: number
          name: string
          network: string
          usage_type: string
          wallet_type: string
        }
        Insert: {
          address: string
          archived_at?: string | null
          balance?: number
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          last_synced?: string | null
          min_deposit?: number
          name?: string
          network: string
          usage_type?: string
          wallet_type?: string
        }
        Update: {
          address?: string
          archived_at?: string | null
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_synced?: string | null
          min_deposit?: number
          name?: string
          network?: string
          usage_type?: string
          wallet_type?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          id: string
          payload_hash: string | null
          provider: string
          received_at: string
          response_code: number | null
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          payload_hash?: string | null
          provider: string
          received_at?: string
          response_code?: number | null
          status?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          payload_hash?: string | null
          provider?: string
          received_at?: string
          response_code?: number | null
          status?: string
        }
        Relationships: []
      }
      withdrawal_settings: {
        Row: {
          auto_approve_threshold: number
          cooldown_minutes: number
          currency: string
          daily_limit: number
          fee_type: string
          fee_value: number
          high_risk_threshold: number
          id: string
          max_amount: number
          min_amount: number
          require_2fa: boolean
          require_ip_match: boolean
          updated_at: string
        }
        Insert: {
          auto_approve_threshold?: number
          cooldown_minutes?: number
          currency: string
          daily_limit?: number
          fee_type?: string
          fee_value?: number
          high_risk_threshold?: number
          id?: string
          max_amount?: number
          min_amount?: number
          require_2fa?: boolean
          require_ip_match?: boolean
          updated_at?: string
        }
        Update: {
          auto_approve_threshold?: number
          cooldown_minutes?: number
          currency?: string
          daily_limit?: number
          fee_type?: string
          fee_value?: number
          high_risk_threshold?: number
          id?: string
          max_amount?: number
          min_amount?: number
          require_2fa?: boolean
          require_ip_match?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          network: string | null
          processed_at: string | null
          processed_by_admin: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
          withdrawal_fee: number
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          network?: string | null
          processed_at?: string | null
          processed_by_admin?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
          withdrawal_fee?: number
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          network?: string | null
          processed_at?: string | null
          processed_by_admin?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
          withdrawal_fee?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_withdrawal: {
        Args: { _admin_id: string; _withdrawal_id: string }
        Returns: Json
      }
      auto_transition_trades: { Args: never; Returns: Json }
      expire_plans: { Args: never; Returns: Json }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_auto_deposit_enabled: { Args: never; Returns: boolean }
      join_trade: {
        Args: {
          _amount?: number
          _source?: string
          _trade_id: string
          _user_id: string
        }
        Returns: Json
      }
      settle_trade: { Args: { _trade_id: string }; Returns: Json }
      upgrade_plan: {
        Args: { _plan_id: string; _user_id: string }
        Returns: Json
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
    },
  },
} as const
