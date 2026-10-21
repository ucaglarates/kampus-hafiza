import { useState } from "react";
import { Badge, Button, Card, Icon } from "./ui/primitives";
import "./LandingPage.css";

type Props = {
  onLogin: () => void;
  onRegister: () => void;
  onLegal: () => void;
  sessionLoading: boolean;
};
const topics = [
  {
    icon: "code" as const,
    title: "Yazılım & teknoloji",
    description:
      "İlk satır koddan ilk projene. Birlikte üret, deneyimlerden öğren.",
    tags: ["React", "Python", "Projeler"],
    label: "01",
  },
  {
    icon: "book" as const,
    title: "Dersler & kaynaklar",
    description:
      "Zorlandığın derste yalnız değilsin. Notları, yöntemleri ve kaynakları keşfet.",
    tags: ["Ders notları", "Çalışma grupları"],
    label: "02",
  },
  {
    icon: "briefcase" as const,
    title: "Staj & kariyer",
    description:
      "Başvurudan ilk iş gününe. Bu yoldan geçen öğrencilerin deneyimleri.",
    tags: ["Staj", "CV", "Mülakat"],
    label: "03",
  },
];
const examples = [
  {
    category: "Yazılım",
    name: "Deniz",
    initials: "D",
    field: "Yazılım Mühendisliği",
    title: "İlk React projemde keşke daha önce bilseydim dediğim 5 şey",
    body: "Her şeyi aynı anda öğrenmeye çalışmak yerine küçük bir projeyle başlamak gerçekten fark yaratıyor.",
    tag: "React",
    icon: "code" as const,
  },
  {
    category: "Dersler",
    name: "Ece",
    initials: "E",
    field: "Bilgisayar Mühendisliği",
    title: "Algoritma çalışırken işime yarayan kaynaklar",
    body: "Konuyu okuduktan sonra küçük bir problemi kendin çöz. Çalışma grubumuzda en çok bu yöntem işe yaradı.",
    tag: "Ders rehberi",
    icon: "book" as const,
  },
  {
    category: "Kariyer",
    name: "Mert",
    initials: "M",
    field: "Yönetim Bilişim Sistemleri",
    title: "İlk staj başvurumu nasıl hazırladım?",
    body: "CV’de yalnızca bildiğin araçları sıralamak yerine yaptığın projeleri ve katkını anlatmak iyi bir başlangıç.",
    tag: "Staj",
    icon: "briefcase" as const,
  },
];

export default function LandingPage({
  onLogin,
  onRegister,
  onLegal,
  sessionLoading,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState("Tümü");
  const example =
    examples.find((item) => item.category === category) ?? examples[0];
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <a className="skip-link" href="#ana-icerik">
        İçeriğe geç
      </a>
      <header className="landing-nav">
        <div className="landing-container landing-nav__inner">
          <a
            className="landing-brand"
            href="#sayfa-basi"
            aria-label="KampüsHafıza ana sayfa"
          >
            <span className="brand-mark">
              <Icon name="layers" />
            </span>
            <strong>
              Kampüs<span>Hafıza</span>
            </strong>
          </a>
          <nav className="landing-nav__links" aria-label="Ana menü">
            <a href="#alanlar">Keşfet</a>
            <a href="#nasil-calisir">Nasıl çalışır?</a>
            <a href="#topluluk">Topluluk</a>
          </nav>
          <div className="landing-nav__actions">
            <Button variant="ghost" onClick={onLogin} disabled={sessionLoading}>
              {sessionLoading ? "Yükleniyor…" : "Giriş yap"}
            </Button>
            <Button className="nav-join" onClick={onRegister}>
              Katıl <Icon name="arrow" />
            </Button>
            <Button
              variant="outline"
              className="mobile-toggle"
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={menuOpen}
              aria-controls="mobil-gezinme"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobil-gezinme"
            className="mobile-links"
            aria-label="Mobil menü"
          >
            <a href="#alanlar" onClick={closeMenu}>
              Keşfet
            </a>
            <a href="#nasil-calisir" onClick={closeMenu}>
              Nasıl çalışır?
            </a>
            <a href="#topluluk" onClick={closeMenu}>
              Topluluk
            </a>
            <Button
              onClick={() => {
                closeMenu();
                onRegister();
              }}
            >
              Topluluğa katıl
            </Button>
          </nav>
        )}
      </header>
      <main id="ana-icerik">
        <section
          className="landing-container landing-hero"
          aria-labelledby="hero-title"
        >
          <div className="landing-hero__copy">
            <Badge>
              <span className="status-dot" /> MCBÜ öğrencilerinin ortak hafızası
            </Badge>
            <h1 id="hero-title">
              Kampüste öğrendiklerin,
              <br />
              <span>kampüste kalsın.</span>
            </h1>
            <p>
              Bir ders notu, ilk stajın, iyi ki dediğin bir tavsiye. Deneyimini
              paylaş, birbirinden öğrenen bir topluluğun parçası ol.
            </p>
            <div className="landing-hero__actions">
              <Button onClick={onRegister}>
                Topluluğa katıl <Icon name="arrow" />
              </Button>
              <a className="button button--outline" href="#alanlar">
                Alanları keşfet
              </a>
            </div>
            <div className="hero-footnote">
              <Icon name="check" />
              <span>Öğrenci e-postanla katıl. Bilgiyi birlikte büyüt.</span>
            </div>
          </div>
          <div className="feed-preview">
            <div className="preview-caption">
              <span>
                <Icon name="layers" /> KAMPÜSTEN BİR KESİT
              </span>
              <Badge>Örnek içerik</Badge>
            </div>
            <Card className="preview-window">
              <div className="preview-window__heading">
                <div>
                  <strong>Kampüs akışı</strong>
                  <span>Yeni bir şey öğrenmek için doğru yerdesin.</span>
                </div>
                <Icon name="users" />
              </div>
              <div
                className="preview-filters"
                role="group"
                aria-label="Örnek içerik kategorisi"
              >
                {["Tümü", "Yazılım", "Dersler", "Kariyer"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <article
                className="preview-post"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="preview-author">
                  <span className="preview-avatar">{example.initials}</span>
                  <div>
                    <strong>
                      {example.name} <span>· Örnek paylaşım</span>
                    </strong>
                    <small>{example.field}</small>
                  </div>
                  <Icon name={example.icon} />
                </div>
                <h2>{example.title}</h2>
                <p>{example.body}</p>
                <Badge>{example.tag}</Badge>
                <div className="preview-post__footer">
                  <span>
                    <Icon name="heart" /> Faydalı bul
                  </span>
                  <span>
                    <Icon name="message" /> Sohbete katıl
                  </span>
                </div>
              </article>
              <div className="preview-invitation">
                <span className="preview-invitation__icon">
                  <Icon name="plus" />
                </span>
                <div>
                  <strong>Sıradaki katkı senin olabilir.</strong>
                  <span>Bir deneyimin, birinin yolunu açabilir.</span>
                </div>
              </div>
            </Card>
            <div className="preview-note">
              <span className="status-dot" /> Gerçek deneyimler. Ortak bilgi.
              Yeni bağlantılar.
            </div>
          </div>
        </section>
        <div className="landing-features">
          <div className="landing-container">
            {[
              { icon: "book" as const, label: "Öğrenciden öğrenciye bilgi" },
              {
                icon: "users" as const,
                label: "İlgi alanına göre topluluklar",
              },
              {
                icon: "check" as const,
                label: "Doğrulanmış öğrenci hesapları",
              },
            ].map((item) => (
              <span key={item.label}>
                <Icon name={item.icon} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <section className="landing-container landing-section" id="alanlar">
          <div className="landing-section__heading">
            <div>
              <span className="section-kicker">KEŞFET</span>
              <h2>Merak ettiğin yerden başla.</h2>
              <p>Birlikte öğrenmenin tek bir konusu yok.</p>
            </div>
            <a href="#nasil-calisir" className="text-link">
              Nasıl katılırım? <Icon name="arrow" />
            </a>
          </div>
          <div className="landing-topics">
            {topics.map((topic) => (
              <Card className="landing-topic" key={topic.title}>
                <div className="landing-topic__top">
                  <span className="topic-icon">
                    <Icon name={topic.icon} />
                  </span>
                  <span>{topic.label}</span>
                </div>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <div className="topic-badges">
                  {topic.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <button
                  type="button"
                  className="topic-link"
                  onClick={onRegister}
                  aria-label={`${topic.title} topluluğuna katıl`}
                >
                  Paylaşımları keşfet <Icon name="arrow" />
                </button>
              </Card>
            ))}
          </div>
        </section>
        <section
          className="landing-container landing-section landing-how"
          id="nasil-calisir"
        >
          <div>
            <span className="section-kicker">NASIL ÇALIŞIR?</span>
            <h2>
              Tanış. Öğren.
              <br />
              Bir iz bırak.
            </h2>
            <p>
              İlk adım için uzman olmana gerek yok.
              <br />
              Paylaşacak bir deneyimin olması yeterli.
            </p>
          </div>
          <ol className="landing-steps">
            {[
              {
                title: "Öğrenci hesabını oluştur",
                text: "@ogr.cbu.edu.tr adresinle kayıt ol ve e-postanı doğrula.",
              },
              {
                title: "İlgi alanlarını seç",
                text: "Sana yakın konuları bul, kısa alan testini tamamla.",
              },
              {
                title: "Topluluğa katkıda bulun",
                text: "Soru sor, deneyimini paylaş ve faydalı katkılarla XP kazan.",
              },
            ].map((step, i) => (
              <li key={step.title}>
                <span className="step-number">0{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="landing-container landing-cta" id="topluluk">
          <div>
            <Badge>
              <Icon name="users" /> BİRLİKTE DAHA FAZLASI
            </Badge>
            <h2>
              Senin deneyimin,
              <br />
              bir başkasının başlangıcı.
            </h2>
            <p>Kampüsün hafızasında sana da yer var.</p>
          </div>
          <Button onClick={onRegister}>
            İlk adımı at <Icon name="arrow" />
          </Button>
        </section>
      </main>
      <footer className="landing-container landing-footer">
        <div>
          <a className="landing-brand" href="#sayfa-basi">
            <span className="brand-mark">
              <Icon name="layers" />
            </span>
            <strong>KampüsHafıza</strong>
          </a>
          <p>Öğrenciden öğrenciye, bugünden yarına.</p>
        </div>
        <div>
          <button type="button" onClick={onLegal}>
            Gizlilik ve koşullar
          </button>
          <small>
            Bağımsız öğrenci projesi. MCBÜ ile resmî bağlantısı yoktur.
          </small>
          <span>© 2026 KampüsHafıza</span>
        </div>
      </footer>
    </>
  );
}
