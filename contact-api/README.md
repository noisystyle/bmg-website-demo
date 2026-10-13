# Moduli contatti — SMTP Keliweb

Il sito, BeViral e la landing inviano JSON a `https://bemarketinggroup.it/contact-api/index.php`.
Le pagine possono restare su GitHub Pages o in anteprima locale: soltanto l’endpoint deve essere su hosting PHP.

## Configurazione server

- Endpoint: `domains/bemarketinggroup.it/public_html/contact-api/`.
- Configurazione: `domains/bemarketinggroup.it/private/bmg-mail.php`, ricavata da `config.example.php`.
- Password: `domains/bemarketinggroup.it/private/bmg-smtp-password.txt`, solo la password SMTP, senza virgolette.
- Permessi: directory privata 700, file privati 600. Non caricare mai la directory privata dentro public_html e non inserirla in Git.
- Mittente autenticato: `noreply@bemarketinggroup.it`.
- Destinatario fisso: `info@bemarketinggroup.it`.
- SMTP: `mail.bemarketinggroup.it`, 587, STARTTLS, verifica TLS attiva.
- Reply-To: indirizzo del visitatore; il visitatore non può scegliere il destinatario o il mittente SMTP.

PHPMailer 7.1.1 è incluso da https://github.com/PHPMailer/PHPMailer/releases/tag/v7.1.1 con la sua licenza LGPL-2.1. Nessuna installazione Composer è necessaria sul server.

## Comportamento e limiti

Il messaggio di successo viene mostrato soltanto dopo l’accettazione SMTP. Non certifica che l’email sia arrivata in Posta in arrivo: controllare anche spam e tracciamento email. Gli errori preservano i campi; non sono previsti tentativi automatici. BeViral apre Calendly solo dopo il successo dell’invio.

Il server valida campi e origine, limita dimensioni e tentativi (10 per IP/ora, 100 totali/24 ore) e controlla un campo antispam nascosto. I contatori in cartella privata contengono IP sotto forma di hash, non messaggi o indirizzi email. Turnstile è obbligatorio: il server verifica il token con Cloudflare, compresi hostname e azione del modulo, prima di accedere a SMTP. Un token mancante, falso, scaduto o riutilizzato non consente invii.

Origini ammesse: dominio BMG con e senza www; noisystyle.github.io; bemarketinggroup-del.github.io; localhost/127.0.0.1 sulle porte 8080 e 8081. Per nuovi domini aggiornare la lista in index.php. Le pagine inviano il percorso senza query string; la landing aggiunge soltanto il nome hotel richiesto.

## Verifica

Nel repository del sito:

```sh
node --test tests/contact-mail.test.cjs
npx --yes @php-wasm/cli@3.1.58 -l contact-api/index.php
```

`tests/contact-api.py` verifica via HTTP validazione e preflight: eseguirlo **solo su un server locale senza credenziali SMTP**, perché contiene un payload valido per verificare la risposta 503 di configurazione mancante. Non usarlo sul servizio di produzione.

## Cloudflare Turnstile

Widget: `BMG — moduli sito e landing`, modalità Managed, pre-clearance disattivata.
Site key pubblica in `assets/js/contact-mail.js`. La chiave segreta è soltanto nel file `domains/bemarketinggroup.it/private/bmg-turnstile-secret.txt`, permessi 600.
Il widget autorizza `bemarketinggroup.it` (e sottodomini), `noisystyle.github.io`, `bemarketinggroup-del.github.io`, `localhost`, `127.0.0.1`. Il backend permette solo le origini elencate esplicitamente in index.php e controlla l'hostname restituito da Cloudflare contro quello dell'origine.
Il server richiede PHP con estensione cURL e accesso HTTPS a `challenges.cloudflare.com`. In caso di configurazione mancante o errore di verifica l'invio resta bloccato.

Il browser rinnova la verifica dopo ogni tentativo che usa un token. I token sono monouso e scadono dopo cinque minuti. Per aggiungere un nuovo dominio aggiornare sia il widget Cloudflare sia l'allowlist del backend.
Documentazione: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Stato al 13 ottobre 2026

Endpoint e verifica Turnstile installati su Keliweb. Noreply invia tramite SMTP Keliweb; `info@bemarketinggroup.it` riceve su Google Workspace. MX impostato a `1 smtp.google.com.`, verificato su tutti e quattro i nameserver Keliweb. Consegna locale disabilitata. SPF aggiornato per consentire Google e l'hosting Keliweb. Backup DNS precedente nella cartella mail-config-backup accanto ai repository.

Passati 15 controlli HTTP locali, 9 test JavaScript e 8 verifiche delle risposte Turnstile. In produzione le richieste senza token o con token falso rispondono 403. Due invii reali, uno dal sito e uno dalla landing con Turnstile attivo, hanno avuto successo e sono stati verificati nella Posta in arrivo Gmail del destinatario. Le precedenti due prove SMTP sono anch'esse presenti nelle rispettive conversazioni.

Sito pubblicato su https://bemarketinggroup.it/ e landing su https://bemarketinggroup.it/hospitality/. HTTPS automatico, 496 file statici verificati e Turnstile visualizzato correttamente su entrambi gli indirizzi pubblici. Repository locali sul Desktop aggiornati; nessun push GitHub effettuato. Gli screenshot delle verifiche sono nella cartella verifiche accanto ai repository.
