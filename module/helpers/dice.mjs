/**
 * ΑΝΔΡΑΓΑΘΗΜΑ Dice Rolling System
 * Implements the core d20 mechanics with staged success
 */

export class AndragathimaRoll {
  
  /**
   * Perform a basic d20 roll against target 11
   * @param {Object} rollData - Data for the roll
   * @param {string} rollData.label - Label for the roll
   * @param {number} rollData.modifier - Total modifier to the roll
   * @param {number} rollData.targetNumber - Target number (default 11)
   * @param {boolean} rollData.opposed - Is this an opposed roll?
   * @param {Actor} rollData.actor - Actor making the roll
   * @returns {Promise<Roll>}
   */
  static async basicRoll({
    label = game.i18n.localize('ANDRAGATHIMA.DiceLabel'),
    modifier = 0,
    targetNumber = 11,
    opposed = false,
    actor = null,
    combatRoll = false   // true μόνο για επίθεση/άμυνα — ενεργοποιεί advantage από Ολοκληρωτική Άμυνα
  } = {}) {

    // Read actor-level bonuses from active effects (via the custom modifier system)
    const statusMods = actor?._getStatusModifiers?.();
    const globalBonus = statusMods?.combat?.globalBonus ?? 0;
    const luckBonus = statusMods?.combat?.luckBonus ?? 0;

    // Ολοκληρωτική Άμυνα: advantage μόνο σε ζαριές μάχης (επίθεση/άμυνα)
    const hasAdvantage = combatRoll && (actor?.effects.some(
      e => !e.disabled && e.statuses?.has('totaldefense')
    ) ?? false);

    // Apply global bonus to modifier
    const effectiveModifier = modifier + globalBonus;

    // Build the roll formula
    const formula = `1d20 + ${effectiveModifier}`;

    // Πρώτο ζάρι
    const roll = new Roll(formula);
    await roll.evaluate();
    const d20First = roll.dice[0].results[0].result;
    let d20Second = null;
    let roll2 = null;

    // Δεύτερο ζάρι για advantage
    if (hasAdvantage) {
      roll2 = new Roll(`1d20`);
      await roll2.evaluate();
      d20Second = roll2.dice[0].results[0].result;
    }

    // Το κρατημένο αποτέλεσμα: το μεγαλύτερο από τα δύο (ή μόνο το πρώτο)
    const d20Kept = (d20Second !== null && d20Second > d20First) ? d20Second : d20First;

    // Apply luck bonus: shifts the d20 result, clamped to [1, 20]
    const effectiveD20 = luckBonus !== 0
      ? Math.min(20, Math.max(1, d20Kept + luckBonus))
      : d20Kept;
    const total = effectiveD20 + effectiveModifier;

    // Check for critical (20) or fumble (1) based on effective d20
    const isCritical = effectiveD20 === 20;
    const isFumble = effectiveD20 === 1;

    // Calculate success and stages
    const difference = total - targetNumber;
    const success = isCritical ? true : (isFumble ? false : difference >= 0);
    const stage = this.calculateStage(difference, isCritical, isFumble);

    // Χτίζουμε το περιεχόμενο του μηνύματος
    const chatContent = await this.buildChatContent({
      formula,
      total,
      d20First,
      d20Second,            // null αν δεν υπάρχει advantage
      modifier: effectiveModifier,
      targetNumber,
      success,
      stage,
      isCritical,
      isFumble,
      opposed
    });

    // Χρησιμοποιούμε ChatMessage.create() αντί roll.toMessage() για να αποφύγουμε
    // το native roll display που θα έδειχνε πάντα το πρώτο ζάρι ως αποτέλεσμα
    const rolls = roll2 ? [roll, roll2] : [roll];
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: label,
      content: chatContent,
      rolls: rolls,
      type: CONST.CHAT_MESSAGE_STYLES?.OTHER ?? CONST.CHAT_MESSAGE_TYPES?.OTHER ?? 0
    });
    
    return {roll, success, stage, isCritical, isFumble};
  }
  
  /**
   * Calculate the success stage based on difference from target
   * @param {number} difference - Difference from target number
   * @param {boolean} isCritical - Was it a natural 20?
   * @param {boolean} isFumble - Was it a natural 1?
   * @returns {number} Stage of success/failure
   */
  static calculateStage(difference, isCritical = false, isFumble = false) {
    if (isCritical) return Math.max(1, Math.floor(difference / 5) + 1);
    if (isFumble) return Math.min(-1, Math.floor(difference / 5) - 1);
    
    // Calculate stage based on 5-point increments
    if (difference >= 0) {
      return Math.floor(difference / 5) + 1;
    } else {
      return Math.ceil(difference / 5) - 1;
    }
  }
  
  /**
   * Build the chat message content
   * @param {Object} data - Roll result data
   * @returns {Promise<string>} HTML content for chat message
   */
  static async buildChatContent(data) {
    const {total, d20First, d20Second, modifier} = data;

    // Format modifier: always show +/− including +0
    let modifierText = '';
    if (modifier > 0) {
      modifierText = ` + ${modifier}`;
    } else if (modifier < 0) {
      modifierText = ` − ${Math.abs(modifier)}`;
    } else {
      modifierText = ` + 0`;
    }

    // Advantage: εμφανίζουμε και τα δύο ζάρια, bold αυτό που κρατήθηκε (το μεγαλύτερο)
    let diceText;
    if (d20Second !== null && d20Second !== undefined) {
      const firstWins = d20First >= d20Second;
      const first  = firstWins ? `<b>${d20First}</b>` : `${d20First}`;
      const second = firstWins ? `${d20Second}` : `<b>${d20Second}</b>`;
      diceText = `d20 (${first}, ${second})`;
    } else {
      diceText = `d20 (${d20First})`;
    }

    return `${diceText}${modifierText} = <b><span style="font-size: 1.1em;">${total}</span></b>`;
  }
  
  /**
   * Roll for Attack
   * @param {Actor} actor - The attacking actor
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollAttack(actor, options = {}) {
    const actorData = actor.system;
    const isRanged = options.ranged || false;
    
    // Calculate modifier
    let modifier = 0;
    if (isRanged) {
      modifier = actorData.combat.ranged.attack;
    } else {
      modifier = actorData.combat.melee.attack;
    }
    
    // Add any additional modifiers
    modifier += options.bonus || 0;
    
    return this.basicRoll({
      label: isRanged ? game.i18n.localize('ANDRAGATHIMA.RangedAttack') : 'Ζαριά Μάχης',
      modifier,
      targetNumber: options.targetNumber || 11,
      actor,
      combatRoll: !isRanged   // advantage μόνο στη Ζαριά Μάχης (melee)
    });
  }
  
  /**
   * Roll for Defense
   * @param {Actor} actor - The defending actor
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollDefense(actor, options = {}) {
    const actorData = actor.system;
    const isRanged = options.ranged || false;
    
    // Calculate modifier
    let modifier = 0;
    if (isRanged) {
      modifier = actorData.combat.ranged.defense;
    } else {
      modifier = actorData.combat.melee.defense;
    }
    
    // Add any additional modifiers
    modifier += options.bonus || 0;
    
    return this.basicRoll({
      label: isRanged ? game.i18n.localize('ANDRAGATHIMA.RangedDefense') : game.i18n.localize('ANDRAGATHIMA.MeleeDefense'),
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
  
  /**
   * Roll for Damage
   * @param {Actor} actor - The actor dealing damage
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollDamage(actor, options = {}) {
    const actorData = actor.system;
    const damageType = options.damageType || "tomi";
    const baseDamage = options.baseDamage || 0;
    
    // Calculate modifier
    let modifier = baseDamage;
    if (options.ranged) {
      modifier += actorData.combat.ranged.damage;
    } else {
      modifier += actorData.combat.melee.damage;
    }
    
    // Add critical damage if applicable
    if (options.critical) {
      modifier += 5;
    }
    
    // Add any additional modifiers
    modifier += options.bonus || 0;
    
    const result = await this.basicRoll({
      label: `Ζημιά (${CONFIG.ANDRAGATHIMA.damageTypes[damageType]})`,
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
    
    result.damageType = damageType;
    return result;
  }
  
  /**
   * Roll for Resistance/Antochi
   * @param {Actor} actor - The actor resisting damage
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollResistance(actor, options = {}) {
    const actorData = actor.system;
    const damageType = options.damageType || "tomi";
    
    // Get resistance modifier for damage type
    const modifier = actorData.resistances[damageType].value || 0;
    
    return this.basicRoll({
      label: `Αντοχή (${CONFIG.ANDRAGATHIMA.damageTypes[damageType]})`,
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
  
  /**
   * Roll a Saving Throw (Ζαριά Αποφυγής)
   * @param {Actor} actor - The actor making the save
   * @param {string} saveType - Type of save (ant/mya/som)
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollSave(actor, saveType, options = {}) {
    const actorData = actor.system;
    const save = actorData.saves[saveType];
    
    if (!save) {
      ui.notifications.error(`Invalid save type: ${saveType}`);
      return null;
    }
    
    // Calculate modifier based on linked ability
    const ability = save.ability;
    const abilityMod = Math.floor((actorData.abilities[ability].value - 10) / 2);
    const modifier = save.value + abilityMod + (options.bonus || 0);
    
    const saveLabels = {
      "ant": game.i18n.localize('ANDRAGATHIMA.SaveAnt'),
      "mya": game.i18n.localize('ANDRAGATHIMA.SaveMya'),
      "som": game.i18n.localize('ANDRAGATHIMA.SaveSom')
    };
    
    return this.basicRoll({
      label: `Ζαριά Αποφυγής: ${saveLabels[saveType]}`,
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
  
  /**
   * Roll an Ability Check (Δοκιμασία Ικανότητας)
   * @param {Actor} actor - The actor making the check
   * @param {string} ability - The ability being checked
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollAbilityCheck(actor, ability, options = {}) {
    const actorData = actor.system;
    const abilityData = actorData.abilities[ability];

    if (!abilityData) {
      ui.notifications.error(`Invalid ability: ${ability}`);
      return null;
    }

    const abilityLabels = {
      "dyn": game.i18n.localize('ANDRAGATHIMA.AbilityDynGenitive'),
      "epi": game.i18n.localize('ANDRAGATHIMA.AbilityEpiGenitive'),
      "kra": game.i18n.localize('ANDRAGATHIMA.AbilityKraGenitive'),
      "eyf": game.i18n.localize('ANDRAGATHIMA.AbilityEyfGenitive'),
      "sof": game.i18n.localize('ANDRAGATHIMA.AbilitySofGenitive'),
      "xar": game.i18n.localize('ANDRAGATHIMA.AbilityXarGenitive')
    };

    // Check if the ability is invulnerable (always succeeds)
    if (abilityData.isInvulnerable) {
      const messageContent = `
        <div class="andragathima-roll">
          <div class="dice-result">
            <div class="dice-formula">
              <span class="invulnerable-result">*</span>
            </div>
            <div class="dice-tooltip">
              <div class="dice-total">${game.i18n.localize('ANDRAGATHIMA.AlwaysSucceeds')}</div>
            </div>
          </div>
        </div>`;

      await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor}),
        content: messageContent,
        flavor: `${game.i18n.localize('ANDRAGATHIMA.Test')} ${abilityLabels[ability]}`,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL
      });

      return { result: "success", invulnerable: true };
    }

    // Use total value (including racial modifiers) as the raw ability score
    const abilityScore = abilityData.totalValue || abilityData.value;

    // Formula: d20 + Ability (raw ability score)
    const modifier = abilityScore + (options.bonus || 0);

    return this.basicRoll({
      label: `${game.i18n.localize('ANDRAGATHIMA.Test')} ${abilityLabels[ability]}`,
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
  
  /**
   * Roll for Grapple (Πάλη)
   * @param {Actor} actor - The grappling actor
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollGrapple(actor, options = {}) {
    const actorData = actor.system;
    
    // Calculate modifier: melee combat + STR + size (use total value including racial modifiers)
    const strValue = actorData.abilities.dyn.totalValue || actorData.abilities.dyn.value;
    const strMod = Math.floor((strValue - 10) / 2);
    const sizeMod = CONFIG.ANDRAGATHIMA.sizeModifiers[actorData.details.size.value]?.pali || 0;
    const modifier = actorData.combat.pali.value + strMod + sizeMod + (options.bonus || 0);
    
    return this.basicRoll({
      label: game.i18n.localize('ANDRAGATHIMA.GrappleDiceLabel'),
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
  
  /**
   * Roll for Stability (Ευστάθεια)
   * @param {Actor} actor - The actor rolling for stability
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Roll results
   */
  static async rollStability(actor, options = {}) {
    const actorData = actor.system;
    
    // Calculate modifier: melee combat + max(STR, DEX) + size (use total values including racial modifiers)
    const strValue = actorData.abilities.dyn.totalValue || actorData.abilities.dyn.value;
    const dexValue = actorData.abilities.epi.totalValue || actorData.abilities.epi.value;
    const strMod = Math.floor((strValue - 10) / 2);
    const dexMod = Math.floor((dexValue - 10) / 2);
    const abilityMod = Math.max(strMod, dexMod);
    const sizeMod = CONFIG.ANDRAGATHIMA.sizeModifiers[actorData.details.size.value]?.eystatheia || 0;
    const modifier = actorData.combat.eystatheia.value + abilityMod + sizeMod + (options.bonus || 0);
    
    return this.basicRoll({
      label: game.i18n.localize('ANDRAGATHIMA.StabilityDiceLabel'),
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
    });
  }
}