# Piano di ramp-up Factorial IT

Tool interattivo per proporre al cliente un ramp-up graduale su Factorial IT. Mostra quando termina la sovrapposizione con MDM ed EDR attuali, in base alle date di rinnovo.

## Struttura

```
index.html                         pagina del tool
assets/css/styles.css              stile (palette rossa Factorial della mappa ecosistema, DM Sans)
assets/js/app.js                   logica di calcolo e rendering
assets/js/i18n.js                  testi in italiano, inglese, spagnolo, portoghese e tedesco
assets/js/pricing.js               prezzi di listino dei moduli (dal Quote Management Tool)
assets/img/factorial-it-logo.png   logo Factorial IT
```

Nessuna dipendenza e nessun build: basta aprire `index.html` nel browser o pubblicare la cartella su GitHub Pages o Netlify.

## Logica

- **Set up**: nei primi mesi dall'inizio onboarding entra solo il pacchetto iniziale.
- **Ramp-up graduale**: dura al massimo il numero di mesi indicato, contati dall'inizio onboarding con il set up incluso (default 3). Il mese successivo è la chiusura, in cui entra tutta la flotta rimanente.
- **Pacchetto mensile**: 10%, 15% o 20% del totale PC e del totale cellulari. Con la curva lineare il pacchetto resta uguale ogni mese, con la progressiva raddoppia mese su mese.
- **Alert di partenza lenta**: scatta quando la chiusura supera il doppio della media dei mesi precedenti. In quel caso suggerisce la percentuale minima per ciascuna curva. La soglia si modifica con `ALERT_RATIO` in `app.js`.
- **Strumenti attuali**: l'MDM conta PC e cellulari, l'EDR solo i PC. Lo strumento si considera dismesso alla data di rinnovo. Nel grafico la sovrapposizione con l'MDM è in ambra sulla barra principale, quella con l'EDR è una colonna separata. L'EDR attuale conta (sovrapposizione, rinnovo, esiti) solo se il cliente passa all'EDR di Factorial: la casella nella scheda EDR è collegata alla voce "Sicurezza PC" della proiezione.
- **Proiezione a prezzo di listino**: in fondo al piano, il pulsante apre il costo mese per mese. Si scelgono i moduli per PC (gestione laptop e desktop o con integrazione Intune, SentinelOne EDR o EDR + MDR) e per cellulari, lo sconto (max 30%) e la fatturazione annuale (-10%). Ogni mese si pagano i dispositivi attivati fino a quel mese. I prezzi stanno in `pricing.js` e vanno aggiornati lì se cambiano nel quote tool.
- **Ordine di migrazione**: si può partire dalle entità senza strumenti, da quelle con il rinnovo più vicino, oppure seguire l'ordine della lista.

Il tool si apre vuoto: si inseriscono i dati del cliente e il piano compare appena ci sono data di inizio onboarding e flotta. "Carica esempio" compila un caso dimostrativo, "Nuovo piano" svuota tutti i campi. La lingua si sceglie dal menu in alto (IT, EN, ES, PT, DE): alla prima apertura segue la lingua del browser. I dati inseriti e la lingua restano salvati nel browser (localStorage).

## Avvio su Git

```
git init
git add .
git commit -m "Piano di ramp-up Factorial IT"
git remote add origin <url-repo>
git push -u origin main
```
