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
    actor = null
  } = {}) {
    
    // Build the roll formula
    const formula = `1d20 + ${modifier}`;
    
    // Create and evaluate the roll
    const roll = new Roll(formula);
    await roll.evaluate();
    
    // Calculate the result
    const total = roll.total;
    const d20Result = roll.dice[0].results[0].result;
    
    // Check for critical (20) or fumble (1)
    const isCritical = d20Result === 20;
    const isFumble = d20Result === 1;
    
    // Calculate success and stages
    const difference = total - targetNumber;
    const success = isCritical ? true : (isFumble ? false : difference >= 0);
    const stage = this.calculateStage(difference, isCritical, isFumble);
    
    // Send roll to chat with custom flavor and format
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${label}<br>${await this.buildChatContent({
        formula,
        total,
        d20Result,
        modifier,
        targetNumber,
        success,
        stage,
        isCritical,
        isFumble,
        opposed
      })}`
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
    const {total, d20Result, modifier} = data;
    
    console.log(`Dice Roll Debug:`, {
      total,
      d20Result,
      modifier
    });
    
    // Format modifier: always show +/− including +0
    let modifierText = '';
    if (modifier > 0) {
      modifierText = ` + ${modifier}`;
    } else if (modifier < 0) {
      modifierText = ` − ${Math.abs(modifier)}`;
    } else {
      modifierText = ` + 0`;
    }
    
    // Simple format with bold and larger result: d20 (X) + Y = <b><larger>Z</larger></b>
    const html = `d20 (${d20Result})${modifierText} = <b><span style="font-size: 1.1em;">${total}</span></b>`;
    
    console.log(`Generated HTML:`, html);
    
    return html;
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
      label: isRanged ? game.i18n.localize('ANDRAGATHIMA.RangedAttack') : game.i18n.localize('ANDRAGATHIMA.MeleeAttack'),
      modifier,
      targetNumber: options.targetNumber || 11,
      actor
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
    
    // Use total value (including racial modifiers) as the raw ability score
    const abilityScore = abilityData.totalValue || abilityData.value;
    
    // Formula: d20 + Ability (raw ability score)
    const modifier = abilityScore + (options.bonus || 0);
    
    const abilityLabels = {
      "dyn": game.i18n.localize('ANDRAGATHIMA.AbilityDynGenitive'),
      "epi": game.i18n.localize('ANDRAGATHIMA.AbilityEpiGenitive'),
      "kra": game.i18n.localize('ANDRAGATHIMA.AbilityKraGenitive'),
      "eyf": game.i18n.localize('ANDRAGATHIMA.AbilityEyfGenitive'),
      "sof": game.i18n.localize('ANDRAGATHIMA.AbilitySofGenitive'),
      "xar": game.i18n.localize('ANDRAGATHIMA.AbilityXarGenitive')
    };
    
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