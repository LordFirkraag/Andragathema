/**
 * Extend the basic Item for ΑΝΔΡΑΓΑΘΗΜΑ
 * @extends {Item}
 */
export class AndragathimaItem extends Item {
  
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    
    // Get the Item's data
    const itemData = this;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.system;
    
    // Prepare data by item type
    switch (itemData.type) {
      case 'weapon':
        this._prepareWeaponData(itemData);
        break;
      case 'armor':
        this._prepareArmorData(itemData);
        break;
      case 'ammunition':
        this._prepareAmmunitionData(itemData);
        break;
      case 'spell':
        this._prepareSpellData(itemData);
        break;
      case 'skill':
        this._prepareSkillData(itemData);
        break;
    }
  }
  
  /**
   * Prepare weapon-specific data
   */
  _prepareWeaponData(itemData) {
    const data = itemData.system;
    
    // Calculate total attack bonus
    if (this.actor && this.actor.type !== 'container') {
      const actorData = this.actor.system;
      const isRanged = data.weaponType === 'ranged' || data.weaponType === 'thrown';
      
      if (isRanged) {
        data.totalAttack = (data.attack?.bonus || 0) + (actorData.combat?.ranged?.attack || 0);
      } else {
        data.totalAttack = (data.attack?.bonus || 0) + (actorData.combat?.melee?.attack || 0);
      }
      
      // Calculate weapon damage (coefficient + ability modifier)
      const weaponCoefficient = data.damage?.coefficient || 0;
      let abilityMod = 0;
      
      if (data.ability === 'dyn') {
        abilityMod = actorData.abilities?.dyn?.mod || 0;
      } else if (data.ability === 'epi') {
        abilityMod = actorData.abilities?.epi?.mod || 0;
      } else if (data.ability === 'dyn_epi') {
        const dynMod = actorData.abilities?.dyn?.mod || 0;
        const epiMod = actorData.abilities?.epi?.mod || 0;
        abilityMod = Math.max(dynMod, epiMod);
      }
      
      // Get weapon damage modifier from status effects
      const statusModifiers = this.actor?._getStatusModifiers() || { other: {} };
      const weaponDamageModifier = statusModifiers.other?.weaponDamage || 0;
      
      data.weaponDamage = weaponCoefficient + abilityMod + (data.twoHandedDamageBonus || 0) + weaponDamageModifier;
      
      // Display damage type
      const damageTypes = {
        'diatrisi': game.i18n.localize('ANDRAGATHIMA.DamageDiatrisi'),
        'kroysi': game.i18n.localize('ANDRAGATHIMA.DamageKroysi'), 
        'tomi': game.i18n.localize('ANDRAGATHIMA.DamageTomi'),
        'diatrisi_kroysi': game.i18n.localize('ANDRAGATHIMA.DamageDiatrisiKroysi'),
        'diatrisi_tomi': game.i18n.localize('ANDRAGATHIMA.DamageDiatrisiTomi'),
        'kroysi_tomi': game.i18n.localize('ANDRAGATHIMA.DamageKroysiTomi')
      };
      data.damageTypeDisplay = damageTypes[data.damageType] || data.damageType || '';
      
      // Calculate range display
      this._calculateRangeDisplay(data, actorData);
      
      // Calculate weapon proficiency penalty
      data.proficiencyPenalty = this._calculateWeaponProficiencyPenalty(data.weaponType, actorData);
      data.hasProficiencyPenalty = data.proficiencyPenalty < 0;
      
      // Calculate strength requirement penalty
      data.strengthPenalty = this._calculateStrengthRequirementPenalty(data.strength, actorData);
      data.hasStrengthPenalty = data.strengthPenalty < 0;
      
      // Calculate ranged weapon penalty (-2/0 for melee attack only)
      data.rangedWeaponPenalty = this._calculateRangedWeaponPenalty(data.isRanged);
      data.hasRangedWeaponPenalty = data.rangedWeaponPenalty < 0;
      
      // Calculate two-handed damage bonus (+1 damage if not light, not ranged, and shield slot empty)
      data.twoHandedDamageBonus = this._calculateTwoHandedDamageBonus(data.isLight, data.isRanged, actorData);
      data.hasTwoHandedDamageBonus = data.twoHandedDamageBonus > 0;
    } else {
      // For containers or items without actors, set default values
      data.totalAttack = data.attack?.bonus || 0;
      data.weaponDamage = (data.damage?.coefficient || 0) + (data.twoHandedDamageBonus || 0);
      data.proficiencyPenalty = 0;
      data.hasProficiencyPenalty = false;
      data.strengthPenalty = 0;
      data.hasStrengthPenalty = false;
      data.rangedWeaponPenalty = 0;
      data.hasRangedWeaponPenalty = false;
      data.twoHandedDamageBonus = 0;
      data.hasTwoHandedDamageBonus = false;
    }
  }
  
  /**
   * Prepare armor-specific data
   */
  _prepareArmorData(itemData) {
    const data = itemData.system;
    
    // Calculate total protection values if equipped
    if (data.equipped && this.actor) {
      // Apply armor resistances to actor when equipped
      // This would be handled in the actor's prepareData method
    }
  }
  
  /**
   * Prepare ammunition-specific data
   */
  _prepareAmmunitionData(itemData) {
    const data = itemData.system;
    
    // Ensure quantity is at least 0
    if (data.quantity < 0) {
      data.quantity = 0;
    }
    
    // Calculate total weight based on quantity
    if (data.weight && data.quantity) {
      data.totalWeight = data.weight * data.quantity;
    } else {
      data.totalWeight = 0;
    }
  }
  
  /**
   * Prepare spell-specific data
   */
  _prepareSpellData(itemData) {
    const data = itemData.system;
    
    // Calculate spell power if actor is available and not a container
    if (this.actor && this.actor.type !== 'container') {
      const actorData = this.actor.system;
      // Base power plus caster's relevant ability modifier
      const abilityMod = actorData.abilities?.eyf?.mod || 0; // Using Intelligence for spells
      data.totalPower = (data.power?.value || 0) + abilityMod;
    } else {
      // For containers or items without actors, use base power only
      data.totalPower = data.power?.value || 0;
    }
  }
  
  /**
   * Prepare skill-specific data
   */
  _prepareSkillData(itemData) {
    const data = itemData.system;
    
    // Calculate experience cost based on level
    const level = data.level || 0;
    const costs = [0, 1, 3, 6]; // Experience costs per level
    data.experienceCost = costs[level] || 0;
    
    // Calculate total cost including prerequisites
    if (data.requirements && this.actor) {
      // Check if actor meets requirements
      data.meetsRequirements = this._checkRequirements(data.requirements);
    }
  }
  
  /**
   * Check if requirements are met
   */
  _checkRequirements(requirements) {
    if (!this.actor || !requirements) return true;
    
    // Parse requirements string and check against actor
    // This is a simplified version - expand based on your needs
    return true;
  }
  
  /**
   * Calculate range display based on multiplier and fixed values
   */
  _calculateRangeDisplay(data, actorData) {
    const multiplier = data.range?.multiplier || 0;
    const fixed = data.range?.fixed || 0;
    
    if (fixed > 0) {
      // Fixed range takes priority
      data.range.calculatedRange = fixed;
      data.range.displayText = `${fixed}`;
    } else if (multiplier > 0 && actorData?.abilities?.dyn) {
      // Calculate based on character's Strength (use display value including status modifiers)
      const strValue = actorData.abilities.dyn.displayValue || actorData.abilities.dyn.totalValue || actorData.abilities.dyn.value || 10;
      const calculatedRange = strValue * multiplier;
      data.range.calculatedRange = calculatedRange;
      data.range.displayText = `${calculatedRange}`;
    } else {
      // No range
      data.range.calculatedRange = 0;
      data.range.displayText = "";
    }
  }

  /**
   * Calculate weapon proficiency penalty based on weapon type and actor skills
   */
  _calculateWeaponProficiencyPenalty(weaponType, actorData) {
    if (!weaponType || !actorData?.skills) return 0;
    
    // No penalty weapons
    const noPenaltyWeapons = ['macheri', 'sfendoni', 'ravdi', 'riptari'];
    if (noPenaltyWeapons.includes(weaponType)) return 0;
    
    // Always -2 penalty
    if (weaponType === 'autosxedio') return -2;
    
    // Special skill requirements
    if (weaponType === 'grothies') {
      const hasPotheAoplos = actorData.skills.potheAoplos?.hasSkill;
      return hasPotheAoplos ? 0 : -2;
    }
    
    if (weaponType === 'aspida_varia') {
      const hasAspides = actorData.skills.aspides?.hasSkill;
      return hasAspides ? 0 : -2;
    }
    
    // Όπλα skill level requirements
    const oplaSkillLevel = actorData.skills.opla?.level || 0;
    
    // Level 1+ required weapons
    const level1Weapons = ['dory', 'vallistra', 'drepani', 'ropalo'];
    if (level1Weapons.includes(weaponType)) {
      return oplaSkillLevel >= 1 ? 0 : -2;
    }
    
    // Level 2+ required weapons
    const level2Weapons = ['longi', 'spathi', 'tsekoiri', 'toxo', 'frageli'];
    if (level2Weapons.includes(weaponType)) {
      return oplaSkillLevel >= 2 ? 0 : -2;
    }
    
    // Level 3+ required weapons
    const level3Weapons = ['pyrovolo', 'mastigio'];
    if (level3Weapons.includes(weaponType)) {
      return oplaSkillLevel >= 3 ? 0 : -2;
    }
    
    // Default no penalty for other weapon types
    return 0;
  }
  
  /**
   * Calculate strength requirement penalty based on weapon strength requirement and character strength
   */
  _calculateStrengthRequirementPenalty(weaponStrength, actorData) {
    // If no strength requirement, no penalty
    if (!weaponStrength || weaponStrength <= 0) return 0;
    
    // Get character's effective strength (use display value including status modifiers)
    const characterStrength = actorData?.abilities?.dyn?.displayValue || actorData?.abilities?.dyn?.totalValue || actorData?.abilities?.dyn?.value || 10;
    
    // Check if shield slot is empty - gives +10 to effective strength
    const shieldSlot = actorData?.equipment?.slots?.shield;
    const shieldSlotEmpty = !shieldSlot || !shieldSlot.id || shieldSlot.id.trim() === "";
    
    const effectiveStrength = shieldSlotEmpty ? characterStrength + 10 : characterStrength;
    
    // Apply -2/-2 penalty if effective strength is less than weapon requirement
    return effectiveStrength < weaponStrength ? -2 : 0;
  }
  
  /**
   * Calculate ranged weapon penalty (-2/0 for melee attack only)
   */
  _calculateRangedWeaponPenalty(isRanged) {
    // If weapon is ranged, apply -2 to melee attack only (not ranged attack)
    return isRanged ? -2 : 0;
  }
  
  /**
   * Calculate two-handed damage bonus (+1 if not light, not ranged, and shield slot empty)
   */
  _calculateTwoHandedDamageBonus(isLight, isRanged, actorData) {
    // If weapon is light or ranged, no bonus
    if (isLight || isRanged) return 0;
    
    // Check if shield slot is empty
    const shieldSlot = actorData?.equipment?.slots?.shield;
    const shieldSlotEmpty = !shieldSlot || !shieldSlot.id || shieldSlot.id.trim() === "";
    
    // Apply +1 damage bonus if shield slot is empty
    return shieldSlotEmpty ? 1 : 0;
  }
  
  /**
   * Roll the item for use
   */
  async roll() {
    const item = this;
    const actor = this.actor;
    
    if (!actor) {
      return ui.notifications.warn(game.i18n.localize("ANDRAGATHIMA.Messages.NoItemFound"));
    }
    
    // Handle different item types
    switch (item.type) {
      case 'weapon':
        return this._rollWeapon();
      case 'spell':
        return this._rollSpell();
      case 'skill':
        return this._rollSkill();
      default:
        return this._displayItem();
    }
  }
  
  /**
   * Roll a weapon attack
   */
  async _rollWeapon() {
    const itemData = this.system;
    const actorData = this.actor.system;
    const isRanged = itemData.weaponType === 'ranged' || itemData.weaponType === 'thrown';
    
    // Roll dialog for modifiers
    const dialogData = {
      title: `${this.name} - ${game.i18n.localize("ANDRAGATHIMA.RollAttack")}`,
      content: `
        <div class="andragathima-roll-dialog">
          <div class="form-group">
            <label>${game.i18n.localize("ANDRAGATHIMA.Bonus")}</label>
            <input type="number" name="bonus" value="0" />
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("ANDRAGATHIMA.Target")}</label>
            <input type="number" name="target" value="11" />
          </div>
        </div>
      `,
      buttons: {
        attack: {
          icon: '<i class="fas fa-sword"></i>',
          label: game.i18n.localize("ANDRAGATHIMA.Attack"),
          callback: async (html) => {
            const bonus = parseInt(html.find('[name="bonus"]').val()) || 0;
            const target = parseInt(html.find('[name="target"]').val()) || 11;
            
            // Roll attack
            const attackRoll = await this._makeAttackRoll(bonus, target, isRanged);
            
            // If hit, offer to roll damage
            if (attackRoll.success) {
              this._promptDamageRoll(attackRoll.critical);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ANDRAGATHIMA.Cancel")
        }
      },
      default: "attack"
    };
    
    new Dialog(dialogData).render(true);
  }
  
  /**
   * Make an attack roll
   */
  async _makeAttackRoll(bonus, target, isRanged) {
    const itemData = this.system;
    const actorData = this.actor.system;
    
    // Calculate total modifier
    let modifier = itemData.attack?.bonus || 0;
    if (isRanged) {
      modifier += actorData.combat.ranged.attack;
    } else {
      modifier += actorData.combat.melee.attack;
    }
    modifier += bonus;
    
    // Create and evaluate roll
    const roll = await new Roll(`1d20 + ${modifier}`).evaluate({async: true});
    
    // Check for critical/fumble
    const d20 = roll.dice[0].results[0].result;
    const critical = d20 === 20;
    const fumble = d20 === 1;
    const success = critical ? true : (fumble ? false : roll.total >= target);
    
    // Calculate success stage
    const difference = roll.total - target;
    const stage = Math.floor(Math.abs(difference) / 5) + 1;
    
    // Build flavor text
    let flavor = `<div class="andragathima-chat-message">
      <h3>${this.name} - ${isRanged ? game.i18n.localize('ANDRAGATHIMA.RangedAttack') : game.i18n.localize('ANDRAGATHIMA.MeleeAttack')}</h3>`;
    
    if (critical) {
      flavor += `<div class="critical">⚔️ ${game.i18n.localize('ANDRAGATHIMA.CriticalHit')} ⚔️</div>`;
    } else if (fumble) {
      flavor += `<div class="fumble">💀 ${game.i18n.localize('ANDRAGATHIMA.CriticalMiss')} 💀</div>`;
    } else if (success) {
      flavor += `<div class="success">${game.i18n.localize('ANDRAGATHIMA.Success')}${stage > 1 ? ` (${stage}${game.i18n.localize('ANDRAGATHIMA.ChatStage')})` : ''}!</div>`;
    } else {
      flavor += `<div class="failure">${game.i18n.localize('ANDRAGATHIMA.Failure')}${stage > 1 ? ` (${stage}${game.i18n.localize('ANDRAGATHIMA.ChatStage')})` : ''}</div>`;
    }
    
    flavor += `</div>`;
    
    // Send to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: flavor
    });
    
    return {success, critical, fumble, stage};
  }
  
  /**
   * Prompt for damage roll
   */
  async _promptDamageRoll(critical = false) {
    const itemData = this.system;
    
    const dialogData = {
      title: `${this.name} - ${game.i18n.localize("ANDRAGATHIMA.RollDamage")}`,
      content: `
        <div class="andragathima-roll-dialog">
          <p>${critical ? game.i18n.localize('ANDRAGATHIMA.CriticalHitDamageBonus') : ""}</p>
          <div class="form-group">
            <label>${game.i18n.localize("ANDRAGATHIMA.Bonus")}</label>
            <input type="number" name="bonus" value="${critical ? 5 : 0}" />
          </div>
        </div>
      `,
      buttons: {
        damage: {
          icon: '<i class="fas fa-tint"></i>',
          label: game.i18n.localize("ANDRAGATHIMA.Damage"),
          callback: async (html) => {
            const bonus = parseInt(html.find('[name="bonus"]').val()) || 0;
            await this._makeDamageRoll(bonus);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ANDRAGATHIMA.Cancel")
        }
      },
      default: "damage"
    };
    
    new Dialog(dialogData).render(true);
  }
  
  /**
   * Make a damage roll
   */
  async _makeDamageRoll(bonus) {
    const itemData = this.system;
    const actorData = this.actor.system;
    const isRanged = itemData.weaponType === 'ranged' || itemData.weaponType === 'thrown';
    
    // Calculate total damage
    let damage = itemData.damage?.base || 0;
    if (!isRanged) {
      damage += actorData.combat.melee.damage;
    }
    damage += bonus;
    
    // Create and evaluate roll
    const roll = await new Roll(`1d20 + ${damage}`).evaluate({async: true});
    
    // Get damage type label
    const damageType = CONFIG.ANDRAGATHIMA.damageTypes[itemData.damageType] || itemData.damageType;
    
    // Build flavor text
    const flavor = `<div class="andragathima-chat-message">
      <h3>${this.name} - ${game.i18n.localize('ANDRAGATHIMA.Damage')}</h3>
      <div class="damage-type">${game.i18n.localize('ANDRAGATHIMA.DamageTypeLabel')}: ${damageType}</div>
      <div class="damage-total">${game.i18n.localize('ANDRAGATHIMA.Damage')}: ${roll.total}</div>
    </div>`;
    
    // Send to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: flavor
    });
    
    return roll;
  }
  
  /**
   * Roll a spell
   */
  async _rollSpell() {
    const itemData = this.system;
    const actorData = this.actor.system;
    
    // Calculate spell power
    const abilityMod = actorData.abilities.eyf.mod || 0;
    const power = (itemData.power?.value || 0) + abilityMod;
    
    // Create and evaluate roll
    const roll = await new Roll(`1d20 + ${power}`).evaluate({async: true});
    
    // Build flavor text
    const flavor = `<div class="andragathima-chat-message">
      <h3>${this.name}</h3>
      <div class="spell-school">${itemData.school || game.i18n.localize('ANDRAGATHIMA.DefaultSpellSchool')}</div>
      <div class="spell-power">${game.i18n.localize('ANDRAGATHIMA.SpellPower')}: ${roll.total}</div>
      <div class="spell-level">${game.i18n.localize('ANDRAGATHIMA.SpellLevel')}: ${itemData.level || 0}</div>
    </div>`;
    
    // Send to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: flavor
    });
    
    return roll;
  }
  
  /**
   * Roll a skill check
   */
  async _rollSkill() {
    const itemData = this.system;
    const actorData = this.actor.system;
    
    // Skills might have different modifiers based on the skill
    // This is a simplified version
    const level = itemData.level || 0;
    const bonus = level * 2; // +2 per skill level
    
    // Create and evaluate roll
    const roll = await new Roll(`1d20 + ${bonus}`).evaluate({async: true});
    
    // Build flavor text
    const flavor = `<div class="andragathima-chat-message">
      <h3>${this.name}</h3>
      <div class="skill-level">${game.i18n.localize('ANDRAGATHIMA.SkillLevel')}: ${level}</div>
      <div class="skill-bonus">${game.i18n.localize('ANDRAGATHIMA.Bonus')}: +${bonus}</div>
    </div>`;
    
    // Send to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: flavor
    });
    
    return roll;
  }
  
  /**
   * Display item details in chat
   */
  async _displayItem() {
    const itemData = this.system;
    
    // Build chat content
    let content = `<div class="andragathima-chat-message">
      <h3>${this.name}</h3>`;
    
    if (this.img) {
      content += `<img src="${this.img}" width="50" height="50" style="float: left; margin-right: 10px;" />`;
    }
    
    if (itemData.description) {
      content += `<div class="item-description">${itemData.description}</div>`;
    }
    
    // Add item-specific details
    switch (this.type) {
      case 'equipment':
        if (itemData.quantity) content += `<div>${game.i18n.localize('ANDRAGATHIMA.Quantity')}: ${itemData.quantity}</div>`;
        if (itemData.weight) content += `<div>${game.i18n.localize('ANDRAGATHIMA.Weight')}: ${itemData.weight} kg</div>`;
        if (itemData.price?.value) content += `<div>${game.i18n.localize('ANDRAGATHIMA.Price')}: ${itemData.price.value} ${itemData.price.denomination}</div>`;
        break;
      case 'armor':
        content += `<div>${game.i18n.localize('ANDRAGATHIMA.ArmorType')}: ${itemData.armorType}</div>`;
        if (itemData.penalty) content += `<div>${game.i18n.localize('ANDRAGATHIMA.ArmorPenalty')}: ${itemData.penalty}</div>`;
        break;
    }
    
    content += `</div>`;
    
    // Send to chat
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      content: content
    });
  }
}