// Supabase aracını projeye dahil ediyoruz.
import { createClient } from "@supabase/supabase-js";

// .env.local dosyasındaki bağlantı bilgilerini alıyoruz.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Bilgiler eksikse anlaşılır bir hata gösteriyoruz.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase ayarları eksik. .env.local dosyasını kontrol et.",
  );
}

// Uygulamanın diğer dosyalarında kullanacağımız Supabase bağlantısı.
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
);