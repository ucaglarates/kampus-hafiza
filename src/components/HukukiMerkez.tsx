import { useEffect, useState } from "react";

import {
  HUKUKI_SEKMELER,
  HUKUKI_SURUM,
  type HukukiSekme,
} from "../data/hukuki";
import { supabase } from "../lib/supabase";

import "./HukukiMerkez.css";

type HukukiMerkezProps = {
  acik: boolean;
  kapat: () => void;
  zorunlu?: boolean;
  onaylandi?: () => Promise<void> | void;
};

function HukukiIcerik({ sekme }: { sekme: HukukiSekme }) {
  if (sekme === "aydinlatma") {
    return (
      <>
        <h2>Kişisel Verilerin Korunması Aydınlatma Metni</h2>
        <p className="hukuki-surum">Sürüm: {HUKUKI_SURUM}</p>

        <h3>1. Veri sorumlusu ve iletişim</h3>
        <p>
          Kişisel verilerin, KampüsHafıza proje yönetimi tarafından bu
          aydınlatma metninde belirtilen amaçlarla işlenir. Taleplerini
          <a href="mailto:2528002070@ogr.cbu.edu.tr">
            2528002070@ogr.cbu.edu.tr
          </a>
          adresine iletebilirsin.
        </p>

        <h3>2. İşlenen veri kategorileri</h3>
        <ul>
          <li>Kimlik ve iletişim: ad-soyad, öğrenci e-postası.</li>
          <li>
            Eğitim: üniversite, fakülte, bölüm, sınıf ve ilgi alanları.
          </li>
          <li>
            Platform kullanımı: gönderi, yorum, beğeni, takip, topluluk,
            şikâyet, seviye, XP ve doğrulama testi sonuçları.
          </li>
          <li>
            Görsel ve teknik veriler: yüklediğin profil/topluluk görselleri,
            oturum ve güvenlik kayıtları.
          </li>
        </ul>

        <h3>3. İşleme amaçları</h3>
        <p>
          Hesap oluşturmak, öğrenciliği doğrulamak, topluluk özelliklerini
          sunmak, içerikleri denetlemek, kötüye kullanımı önlemek, güvenliği
          sağlamak ve kullanıcı taleplerini cevaplamak amaçlarıyla veriler
          işlenir. Bilgiler, bu amaçların gerektirdiği ölçüyle sınırlı tutulur.
        </p>

        <h3>4. Toplama yöntemi, hukuki sebep ve aktarım</h3>
        <p>
          Veriler kayıt formları, platformdaki işlemlerin ve yüklemelerin
          üzerinden elektronik ortamda toplanır. Sözleşmenin kurulması ve
          ifası, hukuki yükümlülükler, meşru menfaat ve gerekli durumlarda açık
          rıza hukuki sebeplerine dayanılır. Kimlik doğrulama, veritabanı ve
          dosya saklama için Supabase; yayınlama için barındırma hizmeti
          sağlayıcıları teknik hizmet veren olarak kullanılabilir. Kanunen
          zorunlu hâllerde yetkili mercilerle paylaşım yapılabilir.
        </p>
        <p>
          Supabase altyapısının yurt dışındaki sunucuları kullanabilmesi
          nedeniyle yurt dışına veri aktarımı gündeme gelebilir. Bu işlem için
          aydınlatma onayından ayrı açık rıza alınır. Rızanı geri çekmen, yeni
          aktarımların rızaya dayalı kısmını durdurur; hesabın çalışmasını
          etkileyebilir.
        </p>

        <h3>5. Hakların</h3>
        <p>
          Verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, amacına uygun
          kullanılıp kullanılmadığını öğrenme, aktarılan kişileri bilme, düzeltme,
          silme/yok etme, otomatik işleme sonucuna itiraz ve zararın giderilmesini
          isteme haklarına sahipsin. Profil ekranından hesabını silebilir veya
          yukarıdaki iletişim adresine başvurabilirsin.
        </p>
      </>
    );
  }

  if (sekme === "gizlilik") {
    return (
      <>
        <h2>Gizlilik Politikası</h2>
        <p className="hukuki-surum">Sürüm: {HUKUKI_SURUM}</p>
        <h3>Verileri nasıl koruyoruz?</h3>
        <p>
          Hesap erişimi Supabase Authentication ile sağlanır. Yetkilendirme
          kuralları, kullanıcıların başkalarına ait özel işlemleri yapmasını
          engellemek için veritabanı seviyesinde uygulanır. Hiçbir internet
          hizmeti yüzde yüz güvenli değildir; şifreni paylaşmaman ve hesabındaki
          şüpheli işlemleri bildirmen gerekir.
        </p>
        <h3>Görünür içerikler</h3>
        <p>
          Adın, bölümün, profil görselin, gönderilerin, yorumların, toplulukların
          ve takip bilgilerin giriş yapan diğer öğrencilere görünür. Özel veya
          hassas kişisel verilerini gönderilerde paylaşmamalısın.
        </p>
        <h3>Saklama ve silme</h3>
        <p>
          Veriler hesabın açık olduğu ve hizmetin sunulması için gerektiği sürece
          tutulur. Hesabını sildiğinde profilin ve hesabına bağlı içerikler
          kalıcı olarak silinir. Hukuki zorunluluk veya güvenlik incelemesi
          nedeniyle saklanması gereken sınırlı kayıtlar ilgili süre sonunda
          silinir ya da anonimleştirilir.
        </p>
        <h3>Çerezler ve oturum</h3>
        <p>
          Platform yalnızca oturumun ve temel güvenlik özelliklerinin çalışması
          için gerekli teknolojileri kullanır. Reklam veya kullanıcılar arası
          takip amacıyla pazarlama çerezi kullanılmaz.
        </p>
      </>
    );
  }

  if (sekme === "kosullar") {
    return (
      <>
        <h2>Kullanım Koşulları</h2>
        <p className="hukuki-surum">Sürüm: {HUKUKI_SURUM}</p>
        <h3>Bağımsız proje bildirimi</h3>
        <p>
          KampüsHafıza bağımsız bir öğrenci projesidir. Manisa Celal Bayar
          Üniversitesi, X Corp. veya başka bir sosyal medya kuruluşunun resmî
          ürünü, iştiraki ya da sponsorluk çalışması değildir. İlgili kurumların
          adları ve markaları kendi sahiplerine aittir.
        </p>
        <h3>Hesap ve uygunluk</h3>
        <p>
          Platform 18 yaşını doldurmuş MCBÜ öğrencileri içindir. Gerçek ve güncel
          bilgi vermeli, hesabını güvenli tutmalı ve başka bir kişiyi taklit
          etmemelisin. Hesabında yapılan işlemlerden sen sorumlusun.
        </p>
        <h3>Kullanıcı içerikleri</h3>
        <p>
          Paylaştığın içeriğin sahibi sensin. İçeriği platformda göstermek,
          düzenlemek, güvenlik amacıyla incelemek ve topluluk içinde dağıtmak
          için KampüsHafıza'ya sınırlı, münhasır olmayan ve ücretsiz kullanım
          izni verirsin. Yalnızca haklarına sahip olduğun metin ve görselleri
          paylaşabilirsin.
        </p>
        <h3>Moderasyon ve sorumluluk</h3>
        <p>
          Kuralları ihlal eden içerikler incelenebilir, erişimden kaldırılabilir
          ve hesaplar sınırlandırılabilir. Kullanıcı paylaşımları öğrencilerin
          görüşüdür; KampüsHafıza bunların doğruluğunu garanti etmez. Yapay zekâ
          özetleri hata içerebilir ve akademik, hukuki, tıbbi ya da mali danışmanlık
          yerine geçmez.
        </p>
        <h3>Değişiklikler</h3>
        <p>
          Önemli bir değişiklikte metin sürümü yenilenir ve platformu kullanmaya
          devam etmeden önce yeniden onay istenir.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Topluluk Kuralları</h2>
      <p className="hukuki-surum">Sürüm: {HUKUKI_SURUM}</p>
      <ol>
        <li>Hakaret, tehdit, taciz, zorbalık ve nefret söylemi yasaktır.</li>
        <li>Kişileri taklit etmek, yanıltıcı kimlik kullanmak yasaktır.</li>
        <li>
          Başkasının telefonunu, adresini, öğrenci numarasını veya özel
          yazışmasını izinsiz paylaşma.
        </li>
        <li>
          Telif hakkı sana ait olmayan ders notu, kitap, görsel, yazılım veya
          başka içeriği izinsiz yükleme.
        </li>
        <li>Spam, dolandırıcılık, zararlı bağlantı ve yasa dışı içerik yasaktır.</li>
        <li>
          Bilgi aktarırken kaynak belirt, kesin olmayan bilgiyi gerçekmiş gibi
          sunma ve sınav sorularını izinsiz yayımlama.
        </li>
        <li>
          İhlalleri “Şikâyet et” düğmesiyle bildir. Kötü niyetli ve tekrarlanan
          asılsız şikâyetler de ihlal sayılabilir.
        </li>
      </ol>
      <p>
        Moderatörler yalnızca topluluk güvenliği amacıyla işlem yapar. Bir
        moderasyon kararına itiraz etmek için
        <a href="mailto:2528002070@ogr.cbu.edu.tr">
          2528002070@ogr.cbu.edu.tr
        </a>
        adresine içerik bağlantısı ve açıklamayla başvurabilirsin.
      </p>
    </>
  );
}

function HukukiMerkez({
  acik,
  kapat,
  zorunlu = false,
  onaylandi,
}: HukukiMerkezProps) {
  const [sekme, setSekme] = useState<HukukiSekme>("aydinlatma");
  const [aydinlatildi, setAydinlatildi] = useState(false);
  const [kosullariKabul, setKosullariKabul] = useState(false);
  const [yurtDisiRiza, setYurtDisiRiza] = useState(false);
  const [yasOnayi, setYasOnayi] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!acik) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [acik]);

  if (!acik) return null;

  const kabulEt = async () => {
    if (!aydinlatildi || !kosullariKabul || !yurtDisiRiza || !yasOnayi) {
      setHata("Devam etmek için dört ayrı seçeneği de işaretlemelisin.");
      return;
    }

    setKaydediliyor(true);
    setHata("");
    const { error } = await supabase.rpc("accept_legal_terms", {
      accepted_version: HUKUKI_SURUM,
      cross_border_accepted: yurtDisiRiza,
      age_confirmed: yasOnayi,
    });

    if (error) {
      setHata(`Onay kaydedilemedi: ${error.message}`);
      setKaydediliyor(false);
      return;
    }

    await onaylandi?.();
    setKaydediliyor(false);
    kapat();
  };

  return (
    <div className="hukuki-overlay" role="presentation">
      <section
        className="hukuki-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hukuki-baslik"
      >
        <header className="hukuki-panel__ust">
          <div>
            <span className="hukuki-kalkan">◇</span>
            <div>
              <strong id="hukuki-baslik">Güven ve Hukuk Merkezi</strong>
              <small>KampüsHafıza · {HUKUKI_SURUM}</small>
            </div>
          </div>
          {!zorunlu && (
            <button type="button" onClick={kapat} aria-label="Pencereyi kapat">
              ×
            </button>
          )}
        </header>

        {zorunlu && (
          <div className="hukuki-zorunlu-bilgi">
            Platformu kullanmadan önce güncel metinleri okuyup ayrı onaylarını
            vermelisin.
          </div>
        )}

        <div className="hukuki-govde">
          <nav className="hukuki-sekmeler" aria-label="Hukuki metinler">
            {HUKUKI_SEKMELER.map((item) => (
              <button
                className={sekme === item.id ? "aktif" : ""}
                type="button"
                key={item.id}
                onClick={() => setSekme(item.id)}
              >
                {item.ad}
              </button>
            ))}
          </nav>

          <article className="hukuki-metin">
            <HukukiIcerik sekme={sekme} />
          </article>
        </div>

        {zorunlu && (
          <footer className="hukuki-onay-alani">
            <label>
              <input
                type="checkbox"
                checked={aydinlatildi}
                onChange={(event) => setAydinlatildi(event.target.checked)}
              />
              <span>KVKK aydınlatma metnini okudum ve bilgilendirildim.</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={kosullariKabul}
                onChange={(event) => setKosullariKabul(event.target.checked)}
              />
              <span>Kullanım Koşulları ve Topluluk Kuralları'nı kabul ediyorum.</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={yurtDisiRiza}
                onChange={(event) => setYurtDisiRiza(event.target.checked)}
              />
              <span>
                Verilerimin Supabase altyapısı nedeniyle yurt dışına
                aktarılmasına açık rıza veriyorum.
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={yasOnayi}
                onChange={(event) => setYasOnayi(event.target.checked)}
              />
              <span>18 yaşını doldurduğumu beyan ediyorum.</span>
            </label>
            {hata && <p role="alert">{hata}</p>}
            <button
              type="button"
              disabled={kaydediliyor}
              onClick={() => void kabulEt()}
            >
              {kaydediliyor ? "Onay kaydediliyor..." : "Onayla ve devam et"}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

export default HukukiMerkez;

