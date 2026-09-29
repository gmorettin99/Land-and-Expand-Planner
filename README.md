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
- **Strumenti attuali**: l'MDM conta PC e cellulari, l'EDR solo i PC. Lo strumento si considera dismesso alla data di rinnovo. Nel grafico la sovrapposizione con l'MDM è in ambra sulla barra principale, quella con l'EDR è una colonna separata. L'EDR attuale conta (sovrapposizione, rinnovo, esiti) solo se il cliente passa all'EDR di Factorial: la casella nella scheda EDR è collegata al pacchetto Automated Compliance o al modulo EDR della proiezione.
- **Proiezione a prezzo di listino**: in fondo al piano, il pulsante apre il canone mese per mese. Per ogni PC si sceglie il pacchetto del quote tool: Operations (MDM + SaaS, 7 €), Automated Compliance (MDM + SaaS + EDR, 12 €) oppure solo moduli à la carte (gestione laptop e desktop, 5 €). I moduli aggiuntivi si sommano on top per PC: integrazione Intune (+3 €), SentinelOne EDR (+5 €, incluso in Compliance), SentinelOne MDR (+12 €, richiede EDR). I cellulari hanno la tariffa à la carte (3 €). Sconto massimo 30%, fatturazione annuale -10%. Il canone di ogni mese copre tutti i dispositivi attivi fino a quel mese. I prezzi stanno in `pricing.js`.
- **Canone degli strumenti attuali**: nella scheda di MDM ed EDR attuali si inserisce quanto paga oggi il cliente al mese. Il tool mostra i dispositivi coperti (PC e cellulari per l'MDM, solo PC per l'EDR) e il costo per dispositivo.
- **Piano di migrazione finale**: sotto la proiezione, mese per mese dall'inizio onboarding fino a flotta completa e all'ultima disdetta. Per ogni mese: dispositivi su Factorial, canone listino (prezzo pieno di pacchetto e moduli scelti nella proiezione), canone finale (con sconto e fatturazione, sincronizzati con la proiezione), canone di ogni strumento attuale con i dispositivi in sovrapposizione e il relativo costo, totale cliente e differenza rispetto alla spesa di oggi. Lo strumento attuale si paga per intero fino alla data di rinnovo; dal mese successivo è disdetto e il suo canone si sottrae. In testa: spesa attuale, canone finale a flotta completa, costo totale della sovrapposizione e variazione mensile a regime.
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
