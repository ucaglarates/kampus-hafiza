# KampüsHafıza

KampüsHafıza, Manisa Celal Bayar Üniversitesi öğrencilerinin bilgi ve
deneyimlerini paylaşabildiği bağımsız bir öğrenci topluluğu uygulamasıdır.

> Bu proje Manisa Celal Bayar Üniversitesi veya herhangi bir sosyal medya
> kuruluşunun resmî ürünü, iştiraki ya da sponsorluk çalışması değildir.

## Özellikler

- `@ogr.cbu.edu.tr` öğrenci e-postasıyla kayıt ve e-posta doğrulama
- Alan seçimi ve beş soruluk süreli doğrulama testi
- Canlı gönderi, yorum, faydalı oyu ve takip sistemi
- Öğrenciler tarafından kurulabilen topluluklar
- Profil ve topluluk görseli yükleme
- XP, seviye ve doğrulanmış katkı sistemi
- Kurucu, moderatör ve moderatör yardımcısı rolleri
- İçerik şikâyeti ve moderasyon merkezi
- KVKK aydınlatması, gizlilik politikası ve kullanım koşulları
- Kullanıcının hesabını ve bağlı verilerini kalıcı olarak silebilmesi
- Telefon, tablet ve masaüstü uyumlu arayüz

## Kullanılan Teknolojiler

- React 19
- TypeScript
- Vite
- Supabase Authentication, Database, Realtime ve Storage
- CSS

## Yerelde Çalıştırma

Projeyi klonladıktan sonra bağımlılıkları yükle:

```bash
npm install
```

`.env.example` dosyasını `.env.local` adıyla kopyala ve kendi Supabase proje
bilgilerini ekle:

```env
VITE_SUPABASE_URL=https://proje-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=publishable-key
```

Geliştirme sunucusunu başlat:

```bash
npm run dev
```

Üretim derlemesini kontrol et:

```bash
npm run build
```

## Veritabanı Kurulumu

`supabase` klasöründeki SQL dosyalarını numara sırasına göre Supabase SQL
Editor'da çalıştır. Politikalar, yetki rolleri, canlı topluluk özellikleri,
görsel yükleme ve hukuki uyum tabloları bu dosyalarda bulunur.

## Güvenlik

- Gizli anahtarlar repoya eklenmez.
- Yetkilendirme yalnızca arayüzde değil Supabase Row Level Security
  politikalarıyla da uygulanır.
- Kullanıcı rolleri normal kullanıcılar tarafından değiştirilemez.
- Şikâyet kayıtları yalnızca bildiren kullanıcı ve yetkili moderatörlerce
  görüntülenebilir.

## Lisans ve Kullanım

Bu depo eğitim ve portfolyo amacıyla paylaşılmaktadır. Marka, üniversite ve
üçüncü taraf içerik hakları kendi sahiplerine aittir.
