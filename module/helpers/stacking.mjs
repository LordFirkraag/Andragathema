/**
 * Κανόνας μη-στοίβαξης (ΑΝΔΡΑΓΑΘΗΜΑ 2Ε)
 *
 * Τα bonus από effects στο ίδιο stat δεν προστίθενται μεταξύ τους — μετράει
 * μόνο το μεγαλύτερο. Το ίδιο ισχύει και για τις ποινές — μετράει μόνο η
 * χειρότερη. Αφορά αποκλειστικά effects (αντικείμενα, ξόρκια), όχι τις βασικές
 * τιμές (π.χ. η προστασία της θωράκισης) ούτε τις καταστάσεις.
 */

/** Συσσωρευτής που κρατά το μεγαλύτερο bonus και τη χειρότερη ποινή. */
export class NonStackingBonus {
  constructor() {
    this.bonus = 0;
    this.penalty = 0;
  }

  add(value) {
    const n = Number(value) || 0;
    if (n > 0) this.bonus = Math.max(this.bonus, n);
    else if (n < 0) this.penalty = Math.min(this.penalty, n);
    return this;
  }

  get total() {
    return this.bonus + this.penalty;
  }
}

/**
 * Συνδυάζει το καθολικό μέρος ενός stat που προέρχεται από effects (δαχτυλίδι,
 * θωράκιση κ.λπ.) με το μέρος που δίνει το ίδιο το όπλο. Δεν αθροίζονται:
 * από τα bonus μετράει το μεγαλύτερο, από τις ποινές η χειρότερη.
 *
 * @param {number} total  Σύνολο που ήδη περιέχει μέσα του το καθολικό μέρος
 * @param {{bonus:number, penalty:number}} globalPart  Το καθολικό μέρος από effects
 * @param {{bonus:number, penalty:number}} weaponPart  Το μέρος του ίδιου του όπλου
 * @returns {number}      Το σύνολο με τα δύο μέρη συνδυασμένα αντί αθροισμένα
 */
export function combineEffectBonus(total, globalPart = {}, weaponPart = {}) {
  return total
    - (globalPart.bonus || 0) - (globalPart.penalty || 0)
    + Math.max(globalPart.bonus || 0, weaponPart.bonus || 0)
    + Math.min(globalPart.penalty || 0, weaponPart.penalty || 0);
}

/**
 * Μαζεύει τα bonus που δίνουν τα effects ενός όπλου στο ίδιο το όπλο.
 * Πολλαπλά effects στο ίδιο stat δεν στοιβάζονται.
 *
 * @param {Item} item                    Το όπλο
 * @param {Function} localizeDamageType  Μεταφράζει το είδος ζημιάς για εμφάνιση
 */
export function getWeaponEffectBonuses(item, localizeDamageType) {
  const meleeAttack = new NonStackingBonus();
  const rangedAttack = new NonStackingBonus();
  const baseDamage = new NonStackingBonus();
  const otherDamageTypes = [];

  if (item.effects && item.effects.size > 0) {
    for (const effect of item.effects) {
      if (effect.disabled || !effect.changes) continue;

      for (const change of effect.changes) {
        const key = change.key;
        if (!key) continue;

        if (key === 'system.combat.meleeAttack.value') {
          meleeAttack.add(change.value);
        } else if (key === 'system.combat.rangedAttack.value') {
          rangedAttack.add(change.value);
        } else if (key === 'system.damage.base') {
          baseDamage.add(change.value);
        } else if (key.startsWith('system.damage.')) {
          const value = Number(change.value) || 0;
          if (value > 0) {
            const damageType = key.replace('system.damage.', '');
            otherDamageTypes.push(`+${value} ${localizeDamageType(damageType)}`);
          }
        }
      }
    }
  }

  return { meleeAttack, rangedAttack, baseDamage, otherDamageTypes };
}
