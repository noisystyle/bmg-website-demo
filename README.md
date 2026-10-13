# BMG — Be Marketing Group · Sito Web

Sito statico HTML/CSS/JS, senza framework e senza fase di build.

---

## Avvio locale

```bash
# Opzione A — npx serve (consigliato)
npx serve .
# poi apri http://localhost:3000

# Opzione B — Python
python3 -m http.server 8080
# poi apri http://localhost:8080

# Opzione C — VS Code Live Server
# Click destro su index.html → Open with Live Server
```

> ⚠️ Alcuni browser bloccano `fetch()` su `file://`. Usa sempre un server locale.

---

## Struttura del progetto

```
/
├── index.html              ← Homepage BMG
├── beviral.html            ← Pagina BeViral (sub-brand)
├── projects/               ← Case study clienti
│   ├── bellevue-syrene.html
│   ├── grand-hotel-aminta.html
│   ├── grand-hotel-la-favorita.html
│   ├── vetera-matera.html
│   ├── zest-restaurant.html
│   └── grand-hotel-europa-palace.html
├── assets/
│   ├── css/
│   │   ├── site.css        ← Homepage: design system, layout e responsive
│   │   ├── global.css      ← Stili condivisi dalle pagine legacy
│   │   ├── home.css        ← Stili specifici homepage
│   │   ├── beviral.css     ← Stili pagina BeViral
│   │   ├── projects.css    ← Stili pagine case study
│   │   └── responsive.css  ← Tutti i breakpoint @media
│   ├── js/
│   │   ├── site.js         ← Interazioni progressive della homepage
│   │   └── image-slot.js   ← Componente usato dalle pagine legacy
│   └── images/
│       ├── logos/          ← Logo BeViral blu e bianco
│       ├── homepage/       ← Hero slideshow (PNG + video mobile)
│       ├── beviral/        ← Sticker PNG + frame iPhone
│       ├── portfolio/      ← Foto clienti WebP (400/800/1200w)
│       └── ui/             ← Logo BMG e icone UI
├── data/
│   └── images.js           ← Mapping centralizzato immagini + guida Cloudinary
├── docs/
│   ├── FILE-MAP.md         ← Mappa completa dei file
│   └── UPDATE-GUIDE.md     ← Come aggiornare dopo un export da Claude Design
└── README.md
```

---

## Deploy

### GitHub Pages
1. **Settings → Pages → Source:** branch `main`, cartella `/`
2. Live su: `https://bemarketinggroup-del.github.io/big_website_official/`

### Netlify / Vercel (drag & drop, zero config)
1. Comprimi la cartella in `.zip`
2. Trascina su [netlify.com/drop](https://netlify.com/drop)

### Dominio personalizzato
Crea file `CNAME` nella root:
```
bemarketinggroup.it
```

---

## Tecnologie

| Tecnologia | Versione | Uso |
|---|---|---|
| HTML semantico | HTML5 | Struttura e accessibilità |
| CSS Custom Properties | — | Design system e responsive |
| JavaScript vanilla | ES2020+ | Header, parola variabile e reveal progressivi |
| IntersectionObserver | — | Animazioni scroll progressive enhancement |
| Phosphor Icons | 2.1.2 | Sistema di icone |

---

## Branch

| Branch | Scopo |
|---|---|
| `main` | Produzione attiva |
| `backup/pre-refactor` | Snapshot prima della riorganizzazione |

**Be Marketing Group** · bemarketinggroup@gmail.com


## Pubblicazione Keliweb — 13 ottobre 2026

Online: https://bemarketinggroup.it/

HTTPS automatico. Il sito principale include BeViral e le pagine progetto; la landing si trova in `/hospitality/`. I moduli usano l’endpoint condiviso `/contact-api/index.php`, SMTP Keliweb e Cloudflare Turnstile. Configurazioni e chiavi restano nella cartella privata esterna a public_html. Pubblicazione effettuata dal gestore file DirectAdmin; repository GitHub non aggiornati.

### Pubblicazione automatica

Il workflow `.github/workflows/deploy-keliweb.yml` pubblica il sito dopo ogni push sul branch `main` e può essere avviato manualmente dalla scheda **Actions** di GitHub.

Configurare una sola volta in **Settings → Secrets and variables → Actions**:

- secret `KELIWEB_FTP_USERNAME`
- secret `KELIWEB_FTP_PASSWORD`
- variabile facoltativa `KELIWEB_WEB_ROOT` se l’account FTP non è confinato direttamente a `public_html`

Il deploy usa `git-ftp` su FTPES cifrato: dopo il primo avvio trasferisce soltanto i file cambiati e rimuove dal server quelli eliminati dal repository. Le cartelle private, la documentazione, i test e i file Git non vengono caricati.
