# Piano di ramp-up Factorial IT

Tool interattivo per proporre al cliente un ramp-up graduale su Factorial IT. Mostra quando termina la sovrapposizione con MDM ed EDR attuali, in base alle date di rinnovo.

## Struttura

```
index.html                         pagina del tool
assets/css/styles.css              stile (sistema visivo IT Teams, DM Sans)
assets/js/app.js                   logica di calcolo e rendering
assets/img/factorial-it-logo.png   logo Factorial IT
```

Nessuna dipendenza e nessun build: basta aprire `index.html` nel browser o pubblicare la cartella su GitHub Pages o Netlify.

## Logica

- **Set up**: nei primi mesi dall'inizio onboarding entra solo il pacchetto iniziale.
- **Ramp-up graduale**: dura al massimo il numero di mesi indicato, contati dall'inizio onboarding con il set up incluso (default 3). Il mese successivo è la chiusura, in cui entra tutta la flotta rimanente.
- **Pacchetto mensile**: 10%, 15% o 20% del totale PC e del totale cellulari. Con la curva lineare il pacchetto resta uguale ogni mese, con la progressiva raddoppia mese su mese.
- **Alert di partenza lenta**: scatta quando la chiusura supera il doppio della media dei mesi precedenti. In quel caso suggerisce la percentuale minima per ciascuna curva. La soglia si modifica con `ALERT_RATIO` in `app.js`.
- **Strumenti attuali**: l'MDM conta PC e cellulari, l'EDR solo i PC. Lo strumento si considera dismesso alla data di rinnovo.
- **Ordine di migrazione**: si può partire dalle entità senza strumenti, da quelle con il rinnovo più vicino, oppure seguire l'ordine della lista.

I dati inseriti restano salvati nel browser (localStorage). "Ripristina esempio" riporta ai valori di default.

## Avvio su Git

```
git init
git add .
git commit -m "Piano di ramp-up Factorial IT"
git remote add origin <url-repo>
git push -u origin main
```
