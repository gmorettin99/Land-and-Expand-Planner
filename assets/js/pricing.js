/* Prezzi di listino Factorial IT, per dispositivo al mese (EUR).
   Fonte: Quote Management Tool (repo CalculatorFactorialIT, versione v2),
   https://gmorettin99.github.io/CalculatorFactorialIT/
   Il pacchetto si applica a ogni PC (un dispositivo per dipendente); i moduli aggiuntivi
   si sommano on top alla tariffa à la carte; i cellulari si pagano alla tariffa à la carte.
   Se cambiano i prezzi nel quote tool, aggiorna solo questo file. */
window.PRICING = {
  currency: 'EUR',
  plans: {
    ops:  { cost: 7,  edr: false },  // IT Plan 02 Operations: MDM (device management) + SaaS
    comp: { cost: 12, edr: true },   // IT Plan 03 Automated Compliance: MDM + SaaS + SentinelOne EDR
    alc:  { cost: 5,  edr: false }   // Solo à la carte: Device management — laptops & desktops
  },
  addons: { intune: 3, edr: 5, mdr: 12 },  // on top per PC; MDR richiede EDR
  mob: 3,                                  // Device management — smartphones & tablets
  maxDiscount: 30,                         // sconto massimo nel quote tool
  annualFactor: 0.9                        // fatturazione annuale: -10%
};
