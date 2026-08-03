// ============================================================
// 1. SORU TİPİ
// ============================================================
export type DogrulamaSorusu = {
  id: string;
  alan: string;
  zorluk: 1 | 2 | 3 | 4 | 5;
  soru: string;
  secenekler: string[];
  dogruCevap: number;
};

type AlanKavrami = {
  kavram: string;
  aciklama: string;
};

// ============================================================
// 2. BİLGİ ALANLARINA GÖRE KAVRAMLAR
// Her alanda kolaydan zora doğru beş kavram bulunur.
// Bu yapıdan toplam 75 farklı soru üretilir.
// ============================================================
const alanKavramlari: Record<string, AlanKavrami[]> = {
  JavaScript: [
    { kavram: "Değişken", aciklama: "Program çalışırken bir değeri isimle saklayan yapı" },
    { kavram: "Promise", aciklama: "Gelecekte tamamlanacak eş zamansız işlemi temsil eden nesne" },
    { kavram: "Event Loop", aciklama: "Çağrı yığını ile görev kuyruklarını koordine eden çalışma mekanizması" },
    { kavram: "Closure", aciklama: "Bir fonksiyonun oluşturulduğu kapsamdaki değişkenlere erişimini koruması" },
    { kavram: "Prototype", aciklama: "Nesneler arasında özellik ve metot mirası kurulmasını sağlayan zincir" },
  ],
  React: [
    { kavram: "Prop", aciklama: "Bir bileşene dışarıdan aktarılan salt okunur bilgi" },
    { kavram: "State", aciklama: "Bileşenin zamanla değişebilen yerel verisi" },
    { kavram: "Effect", aciklama: "Bileşeni dış sistemlerle eşitlemek için kullanılan yan etki mekanizması" },
    { kavram: "Key", aciklama: "Listedeki elemanların kimliğini React'e bildiren benzersiz değer" },
    { kavram: "Reconciliation", aciklama: "Eski ve yeni arayüz ağaçlarının karşılaştırılarak gerekli güncellemelerin bulunması" },
  ],
  TypeScript: [
    { kavram: "Tip çıkarımı", aciklama: "Değişken türünün açıkça yazılmadan değerinden anlaşılması" },
    { kavram: "Union type", aciklama: "Bir değerin birden fazla olası türden birini alabilmesi" },
    { kavram: "Interface", aciklama: "Bir nesnenin sahip olması gereken alanların sözleşmesi" },
    { kavram: "Generic", aciklama: "Tür bilgisini tekrar kullanılabilir bir parametre olarak taşıyan yapı" },
    { kavram: "Type narrowing", aciklama: "Kontroller yardımıyla geniş bir türün daha özel türe indirgenmesi" },
  ],
  Python: [
    { kavram: "List comprehension", aciklama: "Tek ifadeyle yeni liste oluşturmaya yarayan kısa yazım" },
    { kavram: "Generator", aciklama: "Değerleri tek seferde değil ihtiyaç oldukça üreten yapı" },
    { kavram: "Decorator", aciklama: "Bir fonksiyonun davranışını kaynak kodunu değiştirmeden saran yapı" },
    { kavram: "Context manager", aciklama: "Kaynakların giriş ve çıkış işlemlerini with bloğuyla güvenli yöneten yapı" },
    { kavram: "GIL", aciklama: "CPython'da aynı anda tek iş parçacığının Python bytecode çalıştırmasını sağlayan kilit" },
  ],
  Java: [
    { kavram: "JVM", aciklama: "Derlenmiş Java bytecode'unu çalıştıran sanal makine" },
    { kavram: "Interface", aciklama: "Sınıfların uygulayacağı davranış sözleşmesini tanımlayan yapı" },
    { kavram: "Kalıtım", aciklama: "Bir sınıfın başka bir sınıfın özellik ve davranışlarını devralması" },
    { kavram: "Garbage Collector", aciklama: "Artık erişilemeyen nesnelerin belleğini otomatik temizleyen sistem" },
    { kavram: "Stream API", aciklama: "Veri koleksiyonları üzerinde bildirimsel işlem zincirleri kuran API" },
  ],
  "C#": [
    { kavram: "CLR", aciklama: ".NET kodunun çalışmasını ve yönetilmesini sağlayan çalışma ortamı" },
    { kavram: "Delegate", aciklama: "Belirli imzaya sahip metotlara güvenli biçimde referans veren tür" },
    { kavram: "LINQ", aciklama: "Koleksiyonlar üzerinde sorgu benzeri işlemler yapmayı sağlayan teknoloji" },
    { kavram: "Nullable type", aciklama: "Normal değerinin yanında null da taşıyabilen değer türü" },
    { kavram: "async/await", aciklama: "Eş zamansız işlemleri okunabilir akışla yönetmeye yarayan dil yapısı" },
  ],
  Algoritmalar: [
    { kavram: "Doğrusal arama", aciklama: "Elemanları başlangıçtan sona tek tek kontrol eden arama yöntemi" },
    { kavram: "İkili arama", aciklama: "Sıralı dizide arama aralığını her adımda yarıya indiren yöntem" },
    { kavram: "Big O", aciklama: "Algoritmanın girdi büyüdükçe kaynak kullanımındaki artışı ifade eden gösterim" },
    { kavram: "Dinamik programlama", aciklama: "Örtüşen alt problemlerin sonuçlarını saklayarak tekrar hesabı önleyen yaklaşım" },
    { kavram: "Böl ve yönet", aciklama: "Problemi küçük parçalara ayırıp sonuçları birleştiren tasarım yaklaşımı" },
  ],
  "Veri Yapıları": [
    { kavram: "Yığın", aciklama: "Son giren elemanın ilk çıktığı LIFO veri yapısı" },
    { kavram: "Kuyruk", aciklama: "İlk giren elemanın ilk çıktığı FIFO veri yapısı" },
    { kavram: "Hash tablosu", aciklama: "Anahtarları hash fonksiyonuyla konumlara eşleyen veri yapısı" },
    { kavram: "Ağaç", aciklama: "Düğümlerin ebeveyn ve çocuk ilişkileriyle düzenlendiği hiyerarşik yapı" },
    { kavram: "Graf", aciklama: "Düğümler ve bu düğümler arasındaki kenarlardan oluşan ilişki yapısı" },
  ],
  Veritabanı: [
    { kavram: "Primary key", aciklama: "Tablodaki her satırı benzersiz biçimde tanımlayan alan" },
    { kavram: "Foreign key", aciklama: "Başka tablodaki satırla ilişki kuran referans alanı" },
    { kavram: "Index", aciklama: "Okuma sorgularını hızlandırmak için ek arama yapısı oluşturan özellik" },
    { kavram: "Normalizasyon", aciklama: "Veri tekrarını ve güncelleme tutarsızlıklarını azaltan tablo tasarım süreci" },
    { kavram: "Transaction", aciklama: "Birden fazla işlemi tek ve tutarlı bir bütün olarak çalıştıran yapı" },
  ],
  "Backend Geliştirme": [
    { kavram: "API", aciklama: "Farklı yazılım parçalarının belirli kurallarla iletişim kurduğu arayüz" },
    { kavram: "REST", aciklama: "Kaynakları HTTP yöntemleriyle yöneten servis mimarisi yaklaşımı" },
    { kavram: "Middleware", aciklama: "İstek ile cevap arasındaki işlem zincirinde çalışan ara katman" },
    { kavram: "Cache", aciklama: "Sık kullanılan veriyi daha hızlı erişim için geçici saklayan katman" },
    { kavram: "Load balancer", aciklama: "Gelen trafiği birden fazla sunucuya dağıtan bileşen" },
  ],
  "Mobil Uygulama": [
    { kavram: "Native uygulama", aciklama: "Belirli bir işletim sistemi için platformun kendi araçlarıyla geliştirilen uygulama" },
    { kavram: "Responsive tasarım", aciklama: "Arayüzün farklı ekran boyutlarına uyum sağlaması" },
    { kavram: "Uygulama yaşam döngüsü", aciklama: "Uygulamanın açılma, arka plana geçme ve kapanma durumları" },
    { kavram: "Yerel depolama", aciklama: "Verinin cihaz üzerinde çevrim dışı erişilebilir biçimde saklanması" },
    { kavram: "Push notification", aciklama: "Uygulama açık değilken sunucudan cihaza gönderilebilen bildirim" },
  ],
  "Yapay Zekâ": [
    { kavram: "Özellik", aciklama: "Modelin tahmin üretirken kullandığı ölçülebilir girdi değişkeni" },
    { kavram: "Denetimli öğrenme", aciklama: "Etiketli örneklerden girdi ve çıktı ilişkisini öğrenen yaklaşım" },
    { kavram: "Doğrulama kümesi", aciklama: "Model ayarlarını seçerken performansı ölçmek için ayrılan veri" },
    { kavram: "Overfitting", aciklama: "Modelin eğitim verisini ezberleyip yeni veride kötü sonuç vermesi" },
    { kavram: "Gradient descent", aciklama: "Kayıp fonksiyonunu azaltmak için parametreleri adım adım güncelleyen yöntem" },
  ],
  "Siber Güvenlik": [
    { kavram: "Hash", aciklama: "Veriyi sabit uzunluklu ve tek yönlü özete dönüştüren işlem" },
    { kavram: "Şifreleme", aciklama: "Veriyi doğru anahtar olmadan okunamayacak biçime dönüştürme işlemi" },
    { kavram: "MFA", aciklama: "Kimlik doğrulamada birden fazla bağımsız kanıt kullanılmasını gerektiren yöntem" },
    { kavram: "SQL injection", aciklama: "Güvensiz girdilerle veritabanı sorgusunun yapısını değiştirmeyi hedefleyen saldırı" },
    { kavram: "XSS", aciklama: "Zararlı istemci kodunun başka kullanıcıların tarayıcısında çalıştırılması saldırısı" },
  ],
  "Bilgisayar Ağları": [
    { kavram: "IP adresi", aciklama: "Ağ üzerindeki bir arayüzü tanımlayan mantıksal adres" },
    { kavram: "DNS", aciklama: "Alan adlarını IP adreslerine çeviren dağıtık isim sistemi" },
    { kavram: "TCP", aciklama: "Sıralı ve güvenilir veri aktarımı sağlayan bağlantı yönelimli protokol" },
    { kavram: "HTTP", aciklama: "Web istemcileri ile sunucular arasında kaynak aktarımını tanımlayan protokol" },
    { kavram: "Subnet", aciklama: "Bir IP ağını daha küçük mantıksal ağlara ayıran yapı" },
  ],
  "Staj ve Kariyer": [
    { kavram: "Öz geçmiş", aciklama: "Eğitim, beceri ve deneyimleri kısa biçimde sunan başvuru belgesi" },
    { kavram: "Portfolyo", aciklama: "Yapılan projeleri ve üretim becerisini somut örneklerle gösteren koleksiyon" },
    { kavram: "STAR yöntemi", aciklama: "Mülakat yanıtını durum, görev, eylem ve sonuç sırasıyla kuran teknik" },
    { kavram: "Networking", aciklama: "Mesleki bilgi ve fırsat paylaşımı için sürdürülen ilişki ağı" },
    { kavram: "Teknik mülakat", aciklama: "Adayın problem çözme ve alan bilgisinin uygulamalı değerlendirildiği görüşme" },
  ],
};

// ============================================================
// 3. KAVRAMLARDAN ÇOKTAN SEÇMELİ SORU ÜRETME
// ============================================================
const sorulariOlustur = (): DogrulamaSorusu[] => {
  return Object.entries(alanKavramlari).flatMap(
    ([alan, kavramlar]) =>
      kavramlar.map((konu, indeks) => {
        const digerKavramlar = kavramlar
          .filter((_, digerIndeks) => digerIndeks !== indeks)
          .map((item) => item.kavram);

        const dogruCevap = (indeks * 2 + alan.length) % 4;
        const secenekler = digerKavramlar.slice(0, 3);
        secenekler.splice(dogruCevap, 0, konu.kavram);

        return {
          id: `${alan.toLocaleLowerCase("tr-TR").replaceAll(" ", "-")}-${indeks + 1}`,
          alan,
          zorluk: (indeks + 1) as 1 | 2 | 3 | 4 | 5,
          soru: `“${konu.aciklama}” tanımı hangi kavrama aittir?`,
          secenekler,
          dogruCevap,
        };
      }),
  );
};

export const soruHavuzu = sorulariOlustur();
