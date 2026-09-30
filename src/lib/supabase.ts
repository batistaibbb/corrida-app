import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client only if credentials are available
// Otherwise, the app will run in demo mode using localStorage
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

// Check if running in demo mode (no Supabase configured)
export const isDemoMode = !supabase;

// Helper functions for common operations
export const supabaseHelpers = {
  // Upload image to storage
  async uploadImage(file: File, bucket: string = 'event-images'): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase not configured - running in demo mode');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Get public URL for an image
  getImageUrl(path: string, bucket: string = 'event-images'): string {
    if (!supabase) {
      throw new Error('Supabase not configured - running in demo mode');
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicUrl;
  },

  // Invoke Edge Function
  async invokeFunction(functionName: string, body: any = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured - running in demo mode');
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: JSON.stringify(body),
    });

    if (error) throw error;
    return data;
  },
};
