/* Prezzi di listino à la carte, per dispositivo al mese (EUR).
   Fonte: Factorial IT Quote Management Tool (repo CalculatorFactorialIT, versione v2).
   Se cambiano i prezzi nel quote tool, aggiorna solo questo file. */
window.PRICING = {
  currency: 'EUR',
  pc:  { lap: 5, intune: 3 },   // Device management: laptops & desktops / with Intune integration
  mob: { mob: 3 },              // Device management: smartphones & tablets
  sec: { edr: 5, mdr: 12 },     // SentinelOne EDR; MDR richiede EDR (EDR + MDR = 17)
  maxDiscount: 30,              // sconto massimo consentito nel quote tool
  annualFactor: 0.9             // fatturazione annuale: -10%
};
