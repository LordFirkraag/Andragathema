import { AndragathimaRoll } from "../helpers/dice.mjs";

/**
 * Extend the base Actor document for ΑΝΔΡΑΓΑΘΗΜΑ
 * @extends {Actor}
 */
export class AndragathimaActor extends Actor {

  /** @override */
  async update(data, options = {}) {
    // Validate img field to prevent validation errors
    if (data.img !== undefined) {
      if (!data.img || typeof data.img !== 'string' || !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(data.img)) {
        // If img is invalid, remove it from the update data or set to default
        delete data.img;
        console.warn("Invalid image path removed from actor update");
      }
    }
    
    return super.update(data, options);
  }

  /** @override */
  prepareData() {
    // Increment prepare data version for caching
    this._prepareDataVersion = (this._prepareDataVersion || 0) + 1;
    
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  applyActiveEffects() {
    // DO NOT apply active effects automatically to system data
    // We handle them manually in _getStatusModifiers()
    // This prevents the base values from being modified
    return this;
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareDerivedCharacterData(actorData);
    this._prepareDerivedNpcData(actorData);
    this._prepareDerivedContainerData(actorData);
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.andragathima || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
    this._prepareContainerData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here.
    const systemData = actorData.system;
    
    // Apply race modifiers first if set
    if (systemData.details.race.value) {
      this._applyRaceModifiers(systemData);
    }
    
    // Get status modifiers from flags
    const statusModifiers = this._getStatusModifiers();
    
    // Calculate ability modifiers and store total values
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      const racialMod = ability.racialMod || 0;
      const statusMod = statusModifiers.abilities[key] || 0;
      const overrideValue = statusModifiers.abilities[key + '_override'];
      const condOverrideValue = statusModifiers.abilities[key + '_condoverride'];
      const invulnerableValue = statusModifiers.abilities[key + '_invulnerable'];
      
      // Store the total value for display and calculations with limits (for XP calculations)
      ability.totalValue = Math.max(6, Math.min(25, ability.value + racialMod));
      
      // New override logic:
      // 1. Start with base + racial + additions
      // 2. Apply absolute override if present (mode = 5)
      // 3. Apply conditional override if present and needed (mode = 6)
      // 4. Apply invulnerable mode if present (mode = 7) - always succeeds

      let calculatedValue = ability.value + racialMod + statusMod; // Base + racial + additions

      if (invulnerableValue !== undefined) {
        // Invulnerable mode (*): always succeeds, represented as very high value
        ability.displayValue = '*';
        ability.statusMod = '*';
        ability.isInvulnerable = true;
      } else if (overrideValue !== undefined) {
        // Absolute override mode (=): use the override value directly, ignore additions
        ability.displayValue = overrideValue;
        ability.statusMod = overrideValue - (ability.value + racialMod); // Show the effective change
      } else if (condOverrideValue !== undefined && calculatedValue < condOverrideValue) {
        // Conditional override mode (>=): use override only if it's higher than calculated
        ability.displayValue = condOverrideValue;
        ability.statusMod = condOverrideValue - (ability.value + racialMod); // Show the effective change
      } else {
        // Normal mode: base + racial + status (additions)
        ability.displayValue = calculatedValue;
        ability.statusMod = statusMod;
      }
      
      // Calculate modifier from display value (includes status modifiers)
      if (ability.isInvulnerable) {
        ability.mod = '*';
      } else {
        ability.mod = Math.floor((ability.displayValue - 10) / 2);
      }
    }
    
  }

  /**
   * Prepare Character type derived data (after active effects)
   */
  _prepareDerivedCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here.
    const systemData = actorData.system;
    
    // Calculate carrying capacity
    this._calculateCarryingCapacity(systemData);
    
    // Calculate total weight including miscellaneous items
    this._calculateTotalWeight(systemData);
    
    // Calculate combat values (after encumbrance is determined)
    this._calculateCombatValues(systemData);
    
    // Calculate save bonuses (after encumbrance is determined)
    this._calculateSaves(systemData);
    
    // Calculate character level
    this._calculateCharacterLevel(systemData);
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here.
    const systemData = actorData.system;
    
    // Initialize details structure if it doesn't exist
    if (!systemData.details) {
      systemData.details = {};
    }
    if (!systemData.details.size) {
      systemData.details.size = { value: "medium" };
    }
    
    // Apply size modifiers first if set (NPCs use size instead of race)
    if (systemData.details.size.value) {
      this._applySizeModifiers(systemData);
    }
    
    // Get status modifiers from flags
    const statusModifiers = this._getStatusModifiers();
    
    // Calculate ability modifiers and store total values (NPCs don't have racial modifiers)
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      const racialMod = 0; // NPCs don't have racial modifiers
      const statusMod = statusModifiers.abilities[key] || 0;
      const overrideValue = statusModifiers.abilities[key + '_override'];
      const condOverrideValue = statusModifiers.abilities[key + '_condoverride'];
      const invulnerableValue = statusModifiers.abilities[key + '_invulnerable'];
      
      // Store the total value for display and calculations (NPCs don't need XP limits)
      ability.totalValue = ability.value + racialMod;
      
      // Same override logic as characters:
      // 1. Start with base + racial + additions
      // 2. Apply absolute override if present (mode = 5)
      // 3. Apply conditional override if present and needed (mode = 6)
      // 4. Apply invulnerable mode if present (mode = 7) - always succeeds

      let calculatedValue = ability.value + racialMod + statusMod; // Base + racial + additions

      if (invulnerableValue !== undefined) {
        // Invulnerable mode (*): always succeeds, represented as very high value
        ability.displayValue = '*';
        ability.statusMod = '*';
        ability.isInvulnerable = true;
      } else if (overrideValue !== undefined) {
        // Absolute override mode (=): use the override value directly, ignore additions
        ability.displayValue = overrideValue;
        ability.statusMod = overrideValue - (ability.value + racialMod); // Show the effective change
      } else if (condOverrideValue !== undefined && calculatedValue < condOverrideValue) {
        // Conditional override mode (>=): use override only if it's higher than calculated
        ability.displayValue = condOverrideValue;
        ability.statusMod = condOverrideValue - calculatedValue; // Show the effective change from calculated
      } else {
        // Normal mode: use calculated value
        ability.displayValue = calculatedValue;
        ability.statusMod = statusMod; // Show additions only
      }

      // Calculate modifier from display value (what actually gets used in calculations)
      if (ability.isInvulnerable) {
        ability.mod = '*';
      } else {
        ability.mod = Math.floor((ability.displayValue - 10) / 2);
      }
    }
    
    // Calculate combat values
    this._calculateCombatValues(systemData);
    
    // Calculate save bonuses
    this._calculateSaves(systemData);
    
    // Travel and insomnia fatigue thresholds based on Κράση (omit if 0 or invulnerable)
    const npcKraDisplay = systemData.abilities.kra.displayValue;
    if (npcKraDisplay && npcKraDisplay !== '*' && npcKraDisplay > 0) {
      const travelInterval = Math.max(1, Math.floor(npcKraDisplay / 3));
      systemData.travelFatigue = [1, 2, 3, 4].map(n => 6 + n * travelInterval).join('/');
      systemData.insomniaFatigue = [1, 2, 3, 4].map(n => 14 + n * npcKraDisplay).join('/');
    }

    // Calculate carrying capacity for NPCs
    this._calculateNpcCarryingCapacity(systemData);

    // Calculate total weight including miscellaneous items
    this._calculateTotalWeight(systemData);
  }

  /**
   * Prepare NPC type derived data (after active effects)
   */
  _prepareDerivedNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here.
    const systemData = actorData.system;
    
    // Calculate combat values (after encumbrance is determined)
    this._calculateCombatValues(systemData);
    
    // Calculate save bonuses (after encumbrance is determined)
    this._calculateSaves(systemData);
    
    // Calculate NPC level using the same formula as characters
    this._calculateCharacterLevel(systemData);
    
    // Store calculated level in cr.value for NPC display
    systemData.cr.value = systemData.characterLevel;
  }

  /**
   * Calculate ability modifier including racial bonuses and status modifiers
   */
  _getAbilityMod(ability) {
    // If ability is invulnerable, return a very high modifier
    if (ability.isInvulnerable) {
      return 999; // Very high modifier to ensure success
    }

    // Calculate modifier from the display value (base + racial + status)
    const displayValue = ability.displayValue || ability.totalValue || ability.value;
    return Math.floor((displayValue - 10) / 2);
  }

  /**
   * Apply race-based modifiers to abilities and other stats
   */
  _applyRaceModifiers(systemData) {
    const race = systemData.details.race.value;
    const raceData = CONFIG.ANDRAGATHIMA.raceModifiers[race];
    
    if (!raceData) return;
    
    // Apply ability modifiers
    for (let [ability, mod] of Object.entries(raceData.abilities)) {
      if (systemData.abilities[ability]) {
        // Store the racial modifier separately, don't modify base value
        systemData.abilities[ability].racialMod = mod;
      }
    }
    
    // Apply size-based modifiers
    const sizeData = CONFIG.ANDRAGATHIMA.sizeModifiers[raceData.size || 'medium'];
    if (sizeData) {
      systemData.combat.sizeModifiers = sizeData;
    }
    
    // Set base speed
    if (raceData.speed) {
      systemData.combat.speed.base = raceData.speed;
    }
  }

  /**
   * Apply size modifiers to NPC
   */
  _applySizeModifiers(systemData) {
    const size = systemData.details.size.value;
    const sizeData = CONFIG.ANDRAGATHIMA.sizeModifiers[size || 'medium'];
    
    if (!sizeData) return;
    
    // Apply size-based combat modifiers
    systemData.combat.sizeModifiers = sizeData;
    
    // Set base speed based on size
    if (sizeData.speed) {
      systemData.combat.speed.base = sizeData.speed;
    }
    
    // NPCs don't get ability modifiers from size, only combat/speed modifiers
    // The size effects are already applied through sizeModifiers in combat calculations
  }

  /**
   * Calculate combat-related values
   */
  _calculateCombatValues(systemData) {
    const abilities = systemData.abilities;
    const combat = systemData.combat;
    const sizeMod = combat.sizeModifiers || CONFIG.ANDRAGATHIMA.sizeModifiers.medium;
    
    // Get status modifiers
    const statusModifiers = this._getStatusModifiers();
    
    // Get armor bonuses and penalties
    const armorData = this._getArmorData(systemData);
    
    // Get encumbrance penalties
    const encumbrancePenalties = this._getEncumbrancePenalties(systemData);
    
    // Get shield penalties
    const shieldPenalties = this._getShieldPenalties(systemData);
    
    // Store penalty info for template use  
    systemData.hasArmorPenalty = armorData.attackPenalty < 0;
    systemData.hasShieldPenalty = shieldPenalties.attackPenalty < 0;
    
    // Melee combat values
    const strMod = this._getAbilityMod(abilities.dyn);
    const meleeStatusMod = statusModifiers.combat.melee || 0;
    
    // Store display value for combat skills (includes status modifiers)
    combat.melee.displayValue = (combat.melee.value || 0) + meleeStatusMod;
    combat.melee.statusMod = meleeStatusMod;
    
    // Add separate attack modifiers (e.g., from frightened effect)
    const meleeAttackStatusMod = statusModifiers.combat.meleeAttack || 0;
    combat.melee.attack = (combat.melee.value || 0) + meleeStatusMod + meleeAttackStatusMod + armorData.attackPenalty + encumbrancePenalties.attackPenalty + shieldPenalties.attackPenalty;

    // Το καθολικό μέρος από effects (δαχτυλίδια κ.λπ.) που περιέχεται στο attack.
    // Τα όπλα το συγκρίνουν με το δικό τους αντί να προσθέτουν πάνω του.
    combat.melee.attackEffect = {
      bonus: statusModifiers.combat.meleeAttack_effectBonus || 0,
      penalty: statusModifiers.combat.meleeAttack_effectPenalty || 0
    };
    
    combat.melee.damage = strMod;
    
    // Ranged combat values
    const dexMod = this._getAbilityMod(abilities.epi);
    const rangedStatusMod = statusModifiers.combat.ranged || 0;
    
    // Store display value for ranged combat skill (includes status modifiers)
    combat.ranged.displayValue = (combat.ranged.value || 0) + rangedStatusMod;
    combat.ranged.statusMod = rangedStatusMod;
    
    // NOTE: Dexterity modifier should only be added to damage based on weapon setting, not to attack
    // Add separate attack modifiers (e.g., from frightened effect)
    const rangedAttackStatusMod = statusModifiers.combat.rangedAttack || 0;
    combat.ranged.attack = (combat.ranged.value || 0) + rangedStatusMod + rangedAttackStatusMod + sizeMod.rangedAttack + armorData.attackPenalty + encumbrancePenalties.attackPenalty + shieldPenalties.attackPenalty;

    // Το καθολικό μέρος από effects που περιέχεται στο attack (βλ. melee παραπάνω)
    combat.ranged.attackEffect = {
      bonus: statusModifiers.combat.rangedAttack_effectBonus || 0,
      penalty: statusModifiers.combat.rangedAttack_effectPenalty || 0
    };
    
    combat.ranged.damage = 0; // Base ranged damage is typically from weapon
    
    // Grapple and stability
    const paliStatusMod = statusModifiers.other.pali || 0;
    combat.pali.value = (combat.melee.value || 0) + meleeStatusMod + strMod + sizeMod.pali + paliStatusMod;
    
    // Stability uses better of STR or DEX
    const stabilityMod = Math.max(strMod, dexMod);
    // Check for Ακλόνητος skill bonus (+4)
    const aklonhtosBonus = (systemData.skills?.aklonitos?.hasSkill) ? 4 : 0;
    const eystatheiaStatusMod = statusModifiers.other.eystatheia || 0;
    combat.eystatheia.value = (combat.melee.value || 0) + meleeStatusMod + stabilityMod + sizeMod.eystatheia + aklonhtosBonus + eystatheiaStatusMod;
    
    // Initiative = Dexterity modifier + Αστραπιαίος bonus (+4) + other bonuses + status modifiers
    const astrapiαiosBonus = (systemData.skills?.astrapieos?.hasSkill) ? 4 : 0;
    const initiativeStatusMod = statusModifiers.other.initiative || 0;
    combat.initiative.value = dexMod + astrapiαiosBonus + (combat.initiative.bonus || 0) + initiativeStatusMod;
    combat.initiative.statusMod = initiativeStatusMod;
    
    // Apply resistances from Κράση and armor
    // Handle invulnerable abilities properly for resistance calculations
    const kraMod = abilities.kra.isInvulnerable ?
      Math.floor(((abilities.kra.totalValue || abilities.kra.value || 10) - 10) / 2) : // Use base value for resistance calc
      this._getAbilityMod(abilities.kra);

    const baseResistanceStatusMod = statusModifiers.resistances.base || 0;
    const baseResistanceOverride = statusModifiers.resistances.base_override;
    const baseResistanceCondOverride = statusModifiers.resistances.base_condoverride;
    const baseResistanceInvulnerable = statusModifiers.resistances.base_invulnerable;

    // Apply override logic to base resistance
    let baseResistance = kraMod + sizeMod.antochi + baseResistanceStatusMod; // Calculated value

    if (baseResistanceInvulnerable !== undefined) {
      // Invulnerable mode (*): always succeeds
      baseResistance = '*';
    } else if (baseResistanceOverride !== undefined) {
      // Absolute override mode (=): use the override value directly
      baseResistance = baseResistanceOverride;
    } else if (baseResistanceCondOverride !== undefined && baseResistance < baseResistanceCondOverride) {
      // Conditional override mode (>=): use override only if it's higher than calculated
      baseResistance = baseResistanceCondOverride;
    }
    
    // Store base resistance for display
    systemData.baseResistance = baseResistance;
    
    // Calculate specialized resistances
    const specializedResistances = [];
    for (let [key, resistance] of Object.entries(systemData.resistances)) {
      resistance.base = resistance.base || 0;
      const armorResistance = armorData.resistances[key] || 0;
      const resistanceStatusMod = statusModifiers.resistances[key] || 0;
      const resistanceOverride = statusModifiers.resistances[key + '_override'];
      const resistanceCondOverride = statusModifiers.resistances[key + '_condoverride'];
      const resistanceInvulnerable = statusModifiers.resistances[key + '_invulnerable'];

      // Apply override logic to specialized resistance
      let specializedBonus = resistance.base + armorResistance + resistanceStatusMod;
      
      if (resistanceInvulnerable !== undefined) {
        // Invulnerable mode (*): always succeeds
        specializedBonus = '*';
        resistance.statusMod = '*';
        resistance.isInvulnerable = true;
      } else if (resistanceOverride !== undefined) {
        // Absolute override mode (=): use the override value directly
        specializedBonus = resistanceOverride;
        resistance.statusMod = resistanceOverride - resistance.base; // Show effective change
      } else if (resistanceCondOverride !== undefined) {
        // Conditional override mode (>=): the threshold applies to the FINAL total (specialized + kraMod),
        // not just the specialized bonus. So we check if total < threshold and raise specialized
        // only by the deficit, so the final total reaches the threshold.
        const numericBase = (typeof baseResistance === 'number') ? baseResistance : 0;
        const total = specializedBonus + numericBase;
        if (total < resistanceCondOverride) {
          specializedBonus = resistanceCondOverride - numericBase;
          resistance.statusMod = specializedBonus - resistance.base - armorResistance;
        } else {
          resistance.statusMod = resistanceStatusMod;
        }
      } else {
        resistance.statusMod = resistanceStatusMod;
      }
      
      if (specializedBonus === '*' || baseResistance === '*') {
        resistance.total = '*';
        resistance.specialized = specializedBonus;
      } else {
        resistance.total = baseResistance + specializedBonus;
        resistance.specialized = specializedBonus;
      }
      
      // Track non-zero specialized resistances and invulnerable resistances for display
      if (specializedBonus !== 0 || specializedBonus === '*') {
        // Use localized damage type labels instead of template labels
        const damageTypeKey = key; // e.g., 'psyxos', 'fotia', etc.
        const localizedLabel = game.i18n.localize(CONFIG.ANDRAGATHIMA?.damageTypes?.[damageTypeKey]) || resistance.label;

        specializedResistances.push({
          label: localizedLabel,
          value: specializedBonus
        });
      }
    }
    
    // Store specialized resistances for template display
    systemData.specializedResistances = specializedResistances;
    
    // Apply encumbrance penalties to speed
    let baseSpeed = combat.speed.base || 9;
    
    // Check for Γοργοπόδαρος skill bonus (+3 to base speed)
    if (systemData.skills?.gorgopodaros?.hasSkill) {
      baseSpeed += 3;
    }
    
    // Add status modifier to speed
    const speedStatusMod = statusModifiers.other.speed || 0;
    baseSpeed += speedStatusMod;
    
    // Check if character cannot move at all (from status effects like trapped)
    const cannotMove = statusModifiers.other?.cannotMove_override !== undefined ? 
      statusModifiers.other.cannotMove_override : 
      statusModifiers.other?.cannotMove;
    
    if (cannotMove || encumbrancePenalties.speedMultiplier === 0) {
      combat.speed.value = 0;
      combat.speed.encumbranceNote = cannotMove ? '' : encumbrancePenalties.speedNote;
      // Show negative status modifier to make speed appear red when cannotMove
      combat.speed.statusMod = cannotMove ? -baseSpeed : speedStatusMod;
    } else {
      // Apply status effect speed multiplier (e.g., blinded = 2/3 speed)
      const statusSpeedMultiplier = statusModifiers.other?.speedMultiplier_override || statusModifiers.other?.speedMultiplier || 1;
      const finalSpeed = baseSpeed * encumbrancePenalties.speedMultiplier * statusSpeedMultiplier;
      
      
      // Round and ensure minimum speed of 1 (unless encumbrance makes it 0)
      combat.speed.value = Math.max(1, Math.round(finalSpeed));
      combat.speed.encumbranceNote = encumbrancePenalties.speedNote;
      
      // Calculate effective status modifier for display (includes multiplier effects)
      const originalSpeed = baseSpeed * encumbrancePenalties.speedMultiplier;
      const effectiveStatusMod = speedStatusMod + (statusSpeedMultiplier !== 1 ? Math.round(finalSpeed - originalSpeed) : 0);
      combat.speed.statusMod = effectiveStatusMod;
      
    }
    
    // Check if character cannot run (from status effects like blinded)
    const canRun = statusModifiers.other?.canRun_override !== undefined ? statusModifiers.other.canRun_override : statusModifiers.other?.canRun;
    combat.speed.canRunNote = canRun === false ? game.i18n.localize('ANDRAGATHIMA.CannotRun') : '';
    
    // Check if dexterity should be ignored in damage calculations (from status effects like drunk)
    const ignoreDexterityInDamage = statusModifiers.other?.ignoreDexterityInDamage_override !== undefined ? 
      statusModifiers.other.ignoreDexterityInDamage_override : 
      statusModifiers.other?.ignoreDexterityInDamage;
    
    // Ensure other object exists
    if (!systemData.other) {
      systemData.other = {};
    }
    systemData.other.ignoreDexterityInDamage = ignoreDexterityInDamage || false;
    
    
    
    // Travel and insomnia fatigue thresholds based on Κράση (omit if 0 or invulnerable)
    const kraDisplay = abilities.kra.displayValue;
    if (kraDisplay && kraDisplay !== '*' && kraDisplay > 0) {
      const travelInterval = Math.max(1, Math.floor(kraDisplay / 3));
      systemData.travelFatigue = [1, 2, 3, 4].map(n => 6 + n * travelInterval).join('/');
      systemData.insomniaFatigue = [1, 2, 3, 4].map(n => 14 + n * kraDisplay).join('/');
    }

  }

  /**
   * Get armor data including resistances and penalties
   */
  _getArmorData(systemData) {
    // Check for equipped armor in torso slot
    const torsoSlot = systemData.equipment?.slots?.torso;
    if (!torsoSlot || !torsoSlot.id) {
      return {
        resistances: {},
        attackPenalty: 0,
        armorType: null
      };
    }
    
    // Get the armor item
    const armorItem = this.items.get(torsoSlot.id);
    if (!armorItem || armorItem.type !== 'armor') {
      return {
        resistances: {},
        attackPenalty: 0,
        armorType: null
      };
    }
    
    const armorSystem = armorItem.system;
    const armorType = armorSystem.armorType;
    const penalty = armorSystem.penalty || 0;
    
    // Get character's armor skill level
    const armorSkillLevel = systemData.skills?.thorakisi?.level || 0;
    
    // Determine if character is proficient with this armor type
    let requiredSkillLevel = 0;
    switch (armorType) {
      case 'light':
        requiredSkillLevel = 1;
        break;
      case 'medium':
        requiredSkillLevel = 2;
        break;
      case 'heavy':
        requiredSkillLevel = 3;
        break;
      default:
        requiredSkillLevel = 0;
    }
    
    // Apply penalty only if not proficient
    const appliedPenalty = (armorSkillLevel >= requiredSkillLevel) ? 0 : penalty;

    // Get armor resistances
    const resistances = JSON.parse(JSON.stringify(armorSystem.resistances || {}));

    return {
      resistances: resistances,
      attackPenalty: appliedPenalty, // Now added directly (penalty should be entered as negative in armor sheet)
      armorType: armorType
    };
  }

  /**
   * Get shield penalties from equipped shields without proper proficiency
   */
  _getShieldPenalties(systemData) {
    let attackPenalty = 0;
    
    // Check if character has Όπλα skill (shield proficiency requires Όπλα ≥1)
    const hasAspidesSkill = systemData.skills?.opla?.hasSkill || false;
    
    // Check for weapon in shield slot
    const shieldSlot = systemData.equipment?.slots?.shield;
    if (shieldSlot && shieldSlot.id) {
      const shieldWeapon = this.items.get(shieldSlot.id);
      if (shieldWeapon && shieldWeapon.type === 'weapon') {
        const weaponType = shieldWeapon.system.weaponType;
        const isLight = shieldWeapon.system.isLight || false;
        
        if (!hasAspidesSkill && weaponType === 'aspida_varia') {
          if (isLight) {
            // Light shield (Ασπίδες + ελαφρύ όπλο) without skill: -1
            attackPenalty = -1;
          } else {
            // Heavy shield (Ασπίδες χωρίς ελαφρύ όπλο) without skill: -2
            attackPenalty = -2;
          }
        }
        // Other weapons don't get shield penalties
      }
    }
    
    return { attackPenalty: attackPenalty };
  }

  /**
   * Calculate saving throw bonuses
   */
  _calculateSaves(systemData) {
    const abilities = systemData.abilities;
    const saves = systemData.saves;

    // Get encumbrance penalties and status modifiers
    const encumbrancePenalties = this._getEncumbrancePenalties(systemData);
    const statusModifiers = this._getStatusModifiers();

    // Process each save with override logic
    const saveKeys = ['ant', 'mya', 'som'];
    const saveAbilities = { ant: 'epi', mya: 'sof', som: 'kra' };

    for (const saveKey of saveKeys) {
      const statusMod = statusModifiers.saves[saveKey] || 0;
      const overrideValue = statusModifiers.saves[saveKey + '_override'];
      const condOverrideValue = statusModifiers.saves[saveKey + '_condoverride'];
      const invulnerableValue = statusModifiers.saves[saveKey + '_invulnerable'];

      // Check if the underlying ability is invulnerable
      const linkedAbility = abilities[saveAbilities[saveKey]];
      const isAbilityInvulnerable = linkedAbility?.isInvulnerable;

      // Calculate base value
      const abilityMod = this._getAbilityMod(abilities[saveAbilities[saveKey]]);
      const encumbrancePenalty = (saveKey === 'ant') ? encumbrancePenalties.savesPenalty : 0;
      let calculatedValue = (saves[saveKey].base || 0) + abilityMod + encumbrancePenalty + statusMod;

      if (invulnerableValue !== undefined || isAbilityInvulnerable) {
        // Invulnerable mode (*): always succeeds (either save is invulnerable or linked ability is)
        saves[saveKey].value = '*';
        saves[saveKey].statusMod = '*';
        saves[saveKey].isInvulnerable = true;
      } else if (overrideValue !== undefined) {
        // Absolute override mode (=): use the override value directly
        saves[saveKey].value = overrideValue;
        saves[saveKey].statusMod = overrideValue - ((saves[saveKey].base || 0) + abilityMod + encumbrancePenalty);
      } else if (condOverrideValue !== undefined && calculatedValue < condOverrideValue) {
        // Conditional override mode (>=): use override only if it's higher than calculated
        saves[saveKey].value = condOverrideValue;
        saves[saveKey].statusMod = condOverrideValue - ((saves[saveKey].base || 0) + abilityMod + encumbrancePenalty);
      } else {
        // Normal mode: use calculated value
        saves[saveKey].value = calculatedValue;
        saves[saveKey].statusMod = statusMod;
      }
    }
  }

  /**
   * Calculate carrying capacity
   */
  _calculateCarryingCapacity(systemData) {
    // Skip calculation if abilities don't exist (e.g., containers)
    if (!systemData.abilities?.dyn) return;
    
    const str = systemData.abilities.dyn.value + (systemData.abilities.dyn.racialMod || 0);
    const sizeMod = systemData.combat.sizeModifiers?.carryCapacity || 1;
    
    // Strength to carrying capacity table
    const carryingCapacityTable = {
      0: { light: 0, heavy: 0, max: 0 },
      1: { light: 1.5, heavy: 3, max: 5 },
      2: { light: 3, heavy: 6, max: 10 },
      3: { light: 5, heavy: 10, max: 15 },
      4: { light: 7, heavy: 13, max: 20 },
      5: { light: 8, heavy: 16, max: 25 },
      6: { light: 10, heavy: 20, max: 30 },
      7: { light: 11, heavy: 23, max: 35 },
      8: { light: 13, heavy: 26, max: 40 },
      9: { light: 15, heavy: 30, max: 45 },
      10: { light: 17, heavy: 33, max: 50 },
      11: { light: 19, heavy: 38, max: 58 },
      12: { light: 21, heavy: 43, max: 65 },
      13: { light: 25, heavy: 50, max: 75 },
      14: { light: 29, heavy: 58, max: 88 },
      15: { light: 33, heavy: 67, max: 100 },
      16: { light: 38, heavy: 77, max: 115 },
      17: { light: 43, heavy: 87, max: 130 },
      18: { light: 50, heavy: 100, max: 150 },
      19: { light: 58, heavy: 117, max: 175 },
      20: { light: 67, heavy: 133, max: 200 },
      21: { light: 77, heavy: 153, max: 230 },
      22: { light: 87, heavy: 173, max: 260 },
      23: { light: 100, heavy: 200, max: 300 },
      24: { light: 117, heavy: 233, max: 350 },
      25: { light: 133, heavy: 267, max: 400 },
      26: { light: 153, heavy: 307, max: 460 },
      27: { light: 173, heavy: 347, max: 520 },
      28: { light: 200, heavy: 400, max: 600 },
      29: { light: 233, heavy: 467, max: 700 },
      30: { light: 268, heavy: 532, max: 800 },
      31: { light: 308, heavy: 612, max: 920 },
      32: { light: 348, heavy: 692, max: 1040 },
      33: { light: 400, heavy: 800, max: 1200 },
      34: { light: 468, heavy: 932, max: 1400 },
      35: { light: 532, heavy: 1068, max: 1600 },
      36: { light: 612, heavy: 1228, max: 1840 },
      37: { light: 692, heavy: 1388, max: 2080 },
      38: { light: 800, heavy: 1600, max: 2400 },
      39: { light: 932, heavy: 1868, max: 2800 },
      40: { light: 1072, heavy: 2128, max: 3200 },
      41: { light: 1232, heavy: 2448, max: 3680 },
      42: { light: 1392, heavy: 2768, max: 4160 },
      43: { light: 1600, heavy: 3200, max: 4800 },
      44: { light: 1872, heavy: 3728, max: 5600 },
      45: { light: 2128, heavy: 4272, max: 6400 },
      46: { light: 2448, heavy: 4912, max: 7360 },
      47: { light: 2768, heavy: 5552, max: 8320 },
      48: { light: 3200, heavy: 6400, max: 9600 },
      49: { light: 3728, heavy: 7472, max: 11200 },
      50: { light: 4288, heavy: 8512, max: 12800 }
    };
    
    // Get carrying capacity from table, default to strength 0 if not found
    const capacity = carryingCapacityTable[str] || carryingCapacityTable[0];
    
    systemData.attributes.encumbrance = {
      light: capacity.light * sizeMod,
      heavy: capacity.heavy * sizeMod,
      max: capacity.max * sizeMod
    };
  }


  /**
   * Calculate carrying capacity for NPCs (uses size modifiers instead of racial modifiers)
   */
  _calculateNpcCarryingCapacity(systemData) {
    // Skip calculation if abilities don't exist (e.g., containers)
    if (!systemData.abilities?.dyn) return;
    
    // Initialize attributes if it doesn't exist
    if (!systemData.attributes) {
      systemData.attributes = {};
    }
    
    const str = systemData.abilities.dyn.value; // NPCs don't have racialMod
    const sizeMod = systemData.combat.sizeModifiers?.carryCapacity || 1;
    
    // Strength to carrying capacity table (same as characters)
    const carryingCapacityTable = {
      0: { light: 0, heavy: 0, max: 0 },
      1: { light: 1.5, heavy: 3, max: 5 },
      2: { light: 3, heavy: 6, max: 10 },
      3: { light: 5, heavy: 10, max: 15 },
      4: { light: 7, heavy: 13, max: 20 },
      5: { light: 8, heavy: 16, max: 25 },
      6: { light: 10, heavy: 20, max: 30 },
      7: { light: 11, heavy: 23, max: 35 },
      8: { light: 13, heavy: 26, max: 40 },
      9: { light: 15, heavy: 30, max: 45 },
      10: { light: 17, heavy: 33, max: 50 },
      11: { light: 19, heavy: 38, max: 58 },
      12: { light: 21, heavy: 43, max: 65 },
      13: { light: 25, heavy: 50, max: 75 },
      14: { light: 29, heavy: 58, max: 88 },
      15: { light: 33, heavy: 67, max: 100 },
      16: { light: 38, heavy: 77, max: 115 },
      17: { light: 43, heavy: 87, max: 130 },
      18: { light: 50, heavy: 100, max: 150 },
      19: { light: 58, heavy: 117, max: 175 },
      20: { light: 67, heavy: 133, max: 200 },
      21: { light: 77, heavy: 153, max: 230 },
      22: { light: 87, heavy: 173, max: 260 },
      23: { light: 100, heavy: 200, max: 300 },
      24: { light: 117, heavy: 233, max: 350 },
      25: { light: 133, heavy: 267, max: 400 },
      26: { light: 153, heavy: 307, max: 460 },
      27: { light: 173, heavy: 347, max: 520 },
      28: { light: 200, heavy: 400, max: 600 },
      29: { light: 233, heavy: 467, max: 700 },
      30: { light: 268, heavy: 532, max: 800 },
      31: { light: 308, heavy: 612, max: 920 },
      32: { light: 348, heavy: 692, max: 1040 },
      33: { light: 400, heavy: 800, max: 1200 },
      34: { light: 468, heavy: 932, max: 1400 },
      35: { light: 532, heavy: 1068, max: 1600 },
      36: { light: 612, heavy: 1228, max: 1840 },
      37: { light: 692, heavy: 1388, max: 2080 },
      38: { light: 800, heavy: 1600, max: 2400 },
      39: { light: 932, heavy: 1868, max: 2800 },
      40: { light: 1072, heavy: 2128, max: 3200 },
      41: { light: 1232, heavy: 2448, max: 3680 },
      42: { light: 1392, heavy: 2768, max: 4160 },
      43: { light: 1600, heavy: 3200, max: 4800 },
      44: { light: 1872, heavy: 3728, max: 5600 },
      45: { light: 2128, heavy: 4272, max: 6400 },
      46: { light: 2448, heavy: 4912, max: 7360 },
      47: { light: 2768, heavy: 5552, max: 8320 },
      48: { light: 3200, heavy: 6400, max: 9600 },
      49: { light: 3728, heavy: 7472, max: 11200 },
      50: { light: 4288, heavy: 8512, max: 12800 }
    };
    
    // Get carrying capacity from table, default to strength 0 if not found
    const capacity = carryingCapacityTable[str] || carryingCapacityTable[0];
    
    systemData.attributes.encumbrance = {
      light: capacity.light * sizeMod,
      heavy: capacity.heavy * sizeMod,
      max: capacity.max * sizeMod
    };
  }

  /**
   * Calculate total weight from all equipment including miscellaneous items
   */
   _calculateTotalWeight(systemData) {
    // Skip complex weight calculations for containers - they have their own method
    if (this.type === 'container') return;
    
    let totalWeight = 0;
    
    // Add weight from coins
    const coinWeight = this._calculateCoinWeight(systemData);
    totalWeight += coinWeight;
    
    // Add weight from items in inventory
    for (let item of this.items) {
      if (item.system.weight && item.system.quantity) {
        totalWeight += item.system.weight * item.system.quantity;
      } else if (item.system.weight) {
        totalWeight += item.system.weight;
      }
    }
    
    // Miscellaneous weight is now calculated from actual items in slots
    
    // Store total weight and calculate encumbrance status
    if (systemData.equipment) {
      systemData.equipment.totalWeight = Math.round(totalWeight * 10) / 10; // Round to 1 decimal place
      
      // Determine encumbrance status (only if encumbrance is defined)
      const encumbrance = systemData.attributes?.encumbrance;
      if (encumbrance) {
        if (totalWeight <= encumbrance.light) {
          systemData.equipment.encumbranceStatus = 'light';
          systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceLight');
        } else if (totalWeight <= encumbrance.heavy) {
          systemData.equipment.encumbranceStatus = 'heavy';
          systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceHeavy');
        } else if (totalWeight <= encumbrance.max) {
          systemData.equipment.encumbranceStatus = 'maximum';
          systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceMaximum');
        } else {
          systemData.equipment.encumbranceStatus = 'overloaded';
          systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceExcessive');
        }
      } else {
        // Default encumbrance status for NPCs without carrying capacity
        systemData.equipment.encumbranceStatus = 'light';
        systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceLight');
      }
    }
  }

  /**
   * Calculate weight from coins (gold: 0.003 kg each, silver: 0.0036 kg each, copper: 0.002 kg each)
   */
  _calculateCoinWeight(systemData) {
    const gold = parseInt(systemData.equipment?.gold || 0) || 0;
    const silver = parseInt(systemData.equipment?.silver || 0) || 0;
    const copper = parseInt(systemData.equipment?.copper || 0) || 0;
    
    const goldWeight = gold * 0.003;
    const silverWeight = silver * 0.0036;
    const copperWeight = copper * 0.002;
    
    // Store individual coin weights for tooltip display
    systemData.equipment.goldWeight = Math.round(goldWeight * 1000) / 1000; // Round to 3 decimal places
    systemData.equipment.silverWeight = Math.round(silverWeight * 1000) / 1000;
    systemData.equipment.copperWeight = Math.round(copperWeight * 1000) / 1000;
    
    return goldWeight + silverWeight + copperWeight;
  }

  /**
   * Get encumbrance penalties based on load status
   */
  _getEncumbrancePenalties(systemData) {
    const encumbranceStatus = systemData.equipment?.encumbranceStatus || 'light';
    
    switch (encumbranceStatus) {
      case 'light':
        return {
          attackPenalty: 0,
          savesPenalty: 0,
          speedMultiplier: 1,
          speedNote: ''
        };
      case 'heavy':
        return {
          attackPenalty: -2,
          savesPenalty: -2,
          speedMultiplier: 2/3,
          speedNote: game.i18n.localize('ANDRAGATHIMA.RunningX3')
        };
      case 'maximum':
        return {
          attackPenalty: -5,
          savesPenalty: -5,
          speedMultiplier: 1/3,
          speedNote: game.i18n.localize('ANDRAGATHIMA.RunningImpossible')
        };
      case 'overloaded':
        return {
          attackPenalty: -10,
          savesPenalty: -10,
          speedMultiplier: 0,
          speedNote: ''
        };
      default:
        return {
          attackPenalty: 0,
          savesPenalty: 0,
          speedMultiplier: 1,
          speedNote: ''
        };
    }
  }

  /**
   * Get status modifiers from flags and Active Effects
   */
  _getStatusModifiers() {
    // Simple caching based on prepareData cycle
    if (this._cachedStatusModifiers && this._lastPrepareDataVersion === this._prepareDataVersion) {
      return this._cachedStatusModifiers;
    }
    
    const flags = this.flags.andragathima || {};
    const flagModifiers = flags.modifiers || {};
    
    // Get Active Effects modifiers
    const activeEffectModifiers = this._getActiveEffectModifiers();
    
    // Helper function to apply overrides
    const applyOverrides = (flagMods, aeMods) => {
      const result = { ...flagMods };
      
      // First add all non-override modifiers
      for (const [key, value] of Object.entries(aeMods)) {
        if (!key.endsWith('_override') && !key.endsWith('_condoverride')) {
          result[key] = (result[key] || 0) + value;
        }
      }
      
      // Then apply overrides (they are kept separate with _override suffix)
      for (const [key, value] of Object.entries(aeMods)) {
        if (key.endsWith('_override')) {
          result[key] = value; // Keep override with its _override suffix
        }
      }
      
      // Finally apply conditional overrides (they are kept separate with _condoverride suffix)
      for (const [key, value] of Object.entries(aeMods)) {
        if (key.endsWith('_condoverride')) {
          result[key] = value; // Keep conditional override with its _condoverride suffix
        }
      }
      
      return result;
    };

    // Merge flag modifiers with Active Effect modifiers
    const result = {
      abilities: applyOverrides(flagModifiers.abilities || {}, activeEffectModifiers.abilities),
      saves: applyOverrides(flagModifiers.saves || {}, activeEffectModifiers.saves),
      combat: applyOverrides(flagModifiers.combat || {}, activeEffectModifiers.combat),
      resistances: applyOverrides(flagModifiers.resistances || {}, activeEffectModifiers.resistances),
      other: applyOverrides(flagModifiers.other || {}, activeEffectModifiers.other)
    };
    
    // Cache the result for this prepareData cycle
    this._cachedStatusModifiers = result;
    this._lastPrepareDataVersion = this._prepareDataVersion;
    
    return result;
  }

  /**
   * Get modifiers from Active Effects and equipped item effects
   */
  _getActiveEffectModifiers() {
    const modifiers = {
      abilities: {},
      saves: {},
      combat: {},
      resistances: {},
      other: {}
    };

    // Non-stacking buckets: για κάθε stat κρατάμε ξεχωριστά το μεγαλύτερο bonus
    // και τη χειρότερη ποινή, ώστε να μη στοιβάζονται μεταξύ τους. Ισχύει για
    // effects αντικειμένων/ξορκιών — οι καταστάσεις αθροίζονται κανονικά.
    const stacks = {
      abilities: {},
      saves: {},
      combat: {},
      resistances: {},
      other: {}
    };

    // Process all active effects on this actor
    for (const effect of this.effects) {
      if (effect.disabled) continue;

      // Καταστάσεις (κόπωση, τρόμος κ.λπ.) συσσωρεύονται: περνάμε stacks = null
      this._processEffectChanges(effect, modifiers, this._isConditionEffect(effect) ? null : stacks);
    }

    // Process effects from equipped items
    this._processEquippedItemEffects(modifiers, stacks);

    this._mergeNonStacking(modifiers, stacks);

    return modifiers;
  }

  /**
   * Είναι το effect κατάσταση (κόπωση, τρόμος, μέθη κ.λπ.);
   * Οι καταστάσεις συσσωρεύονται κανονικά, σε αντίθεση με τα bonus αντικειμένων.
   */
  _isConditionEffect(effect) {
    return (effect.statuses?.size ?? 0) > 0;
  }

  /**
   * Καταγράφει ένα mode-2 (Add) modifier.
   * Με stacks: τα bonus δεν στοιβάζονται μεταξύ τους (μετράει μόνο το μεγαλύτερο)
   * και το ίδιο ισχύει για τις ποινές (μετράει μόνο η χειρότερη).
   * Χωρίς stacks: κανονικό άθροισμα, όπως πριν.
   */
  _recordModifier(modifiers, stacks, category, key, value) {
    if (!stacks) {
      modifiers[category][key] = (modifiers[category][key] || 0) + value;
      return;
    }

    let bucket = stacks[category][key];
    if (!bucket) bucket = stacks[category][key] = { bonus: 0, penalty: 0 };

    if (value > 0) bucket.bonus = Math.max(bucket.bonus, value);
    else if (value < 0) bucket.penalty = Math.min(bucket.penalty, value);
  }

  /**
   * Ενώνει τα non-stacking buckets με τα υπόλοιπα modifiers.
   */
  _mergeNonStacking(modifiers, stacks) {
    for (const [category, keys] of Object.entries(stacks)) {
      for (const [key, bucket] of Object.entries(keys)) {
        modifiers[category][key] = (modifiers[category][key] || 0) + bucket.bonus + bucket.penalty;

        // Κρατάμε ξεχωριστά τα δύο μέρη, ώστε τα bonus/ποινές των όπλων να
        // συγκρίνονται μαζί τους αντί να προστίθενται (βλ. combineEffectBonus)
        if (bucket.bonus > 0) modifiers[category][key + '_effectBonus'] = bucket.bonus;
        if (bucket.penalty < 0) modifiers[category][key + '_effectPenalty'] = bucket.penalty;
      }
    }
  }

  /**
   * Process effect changes and add to modifiers
   */
  _processEffectChanges(effect, modifiers, stacks = null) {

    for (const change of effect.changes) {
      const key = change.key;
      const mode = change.mode;
      let value = change.value;

      // Resolve @βμ / @mr keyword to the actor's base magic rank
      if (typeof value === 'string' && (value.trim() === '@βμ' || value.trim() === '@mr')) {
        value = this.system.magic?.degree?.value || 0;
        if (value === 0) continue;
      }
      // Handle boolean values
      else if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (typeof value === 'boolean') value = value;
      else {
        value = parseFloat(value) || 0;
        if (value === 0) continue;
      }
      
      // Map system paths to modifier categories
      if (key.startsWith('system.abilities.')) {
        const abilityKey = key.split('.')[2]; // e.g., 'dyn' from 'system.abilities.dyn.value'
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'abilities', abilityKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.abilities[abilityKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.abilities[abilityKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.abilities[abilityKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.saves.')) {
        const saveKey = key.split('.')[2]; // e.g., 'ant' from 'system.saves.ant.base'
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'saves', saveKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.saves[saveKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.saves[saveKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.saves[saveKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.combat.')) {
        const combatKey = key.split('.')[2]; // e.g., 'meleeAttack' from 'system.combat.meleeAttack.value'
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'combat', combatKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.combat[combatKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.combat[combatKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.combat[combatKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.resistances.')) {
        const resistanceKey = key.split('.')[2]; // e.g., 'base' from 'system.resistances.base'
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'resistances', resistanceKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.resistances[resistanceKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.resistances[resistanceKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.resistances[resistanceKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.magic.')) {
        const magicKey = key.split('.')[2]; // e.g., 'level' from 'system.magic.level.value'
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'other', magicKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.other[magicKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[magicKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.other[magicKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.other.')) {
        const otherKey = key.split('.')[2]; // e.g., 'pali' from 'system.other.pali.value'
        if (mode === 2) { // Add mode
          if (typeof value === 'boolean') {
            modifiers.other[otherKey] = value;
          } else {
            this._recordModifier(modifiers, stacks, 'other', otherKey, value);
          }
        } else if (mode === 5) { // Override mode
          modifiers.other[otherKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[otherKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.other[otherKey + '_invulnerable'] = value;
        }
      }
    }
  }

  /**
   * Process effects from equipped items
   */
  _processEquippedItemEffects(modifiers, stacks = null) {
    // Process equipment slot items
    const equipmentSlots = this.system.equipment?.slots || {};
    for (const [slotKey, slotData] of Object.entries(equipmentSlots)) {
      if (slotData.id) {
        const item = this.items.get(slotData.id);
        if (item && item.effects) {
          this._processItemEffects(item, modifiers, 'equipment', stacks);
        }
      }
    }

    // Process quick items
    const quickItems = this.system.equipment?.quickItems || [];
    for (const quickItem of quickItems) {
      if (quickItem.id) {
        const item = this.items.get(quickItem.id);
        if (item && item.effects) {
          this._processItemEffects(item, modifiers, 'quick', stacks);
        }
      }
    }

    // Process items with equipped system property
    for (const item of this.items) {
      if (item.system.equipped && item.effects) {
        this._processItemEffects(item, modifiers, 'equipped', stacks);
      }
    }

    // Process items in misc slots that don't require equipment (effectsRequireEquipment = false)
    for (const item of this.items) {
      if (item.system.effectsRequireEquipment === false && item.effects) {
        // Skip if already processed in other categories
        if (item.system.equipped) continue;
        
        const isInEquipmentSlot = Object.values(equipmentSlots).some(slot => slot.id === item.id);
        const isInQuickItems = quickItems.some(quickItem => quickItem.id === item.id);
        
        if (!isInEquipmentSlot && !isInQuickItems) {
          this._processItemEffects(item, modifiers, 'misc', stacks);
        }
      }
    }
  }

  /**
   * Process effects from a specific item based on its location and settings
   */
  _processItemEffects(item, modifiers, location, stacks = null) {
    const requiresEquipment = item.system.effectsRequireEquipment !== false; // Default true

    for (const effect of item.effects) {
      if (effect.disabled) continue;

      // Αν το αντικείμενο επιβάλλει κατάσταση, αυτή συσσωρεύεται κανονικά —
      // ο κανόνας μη-στοίβαξης αφορά μόνο τα bonus μαγικών αντικειμένων/ξορκιών
      const effectStacks = this._isConditionEffect(effect) ? null : stacks;

      // Τα bonus επίθεσης/ζημιάς ενός όπλου ισχύουν μόνο για το ίδιο το όπλο και
      // εφαρμόζονται στο φύλλο χαρακτήρα ανά όπλο — ποτέ καθολικά. Αλλιώς ένα όπλο
      // στο δεύτερο χέρι (slot ασπίδας) θα έδινε το bonus του και στο άλλο όπλο,
      // ενώ στον εαυτό του θα μετρούσε δύο φορές.
      const applyAll = () => item.type === 'weapon'
        ? this._processNonWeaponSpecificEffects(effect, modifiers, effectStacks)
        : this._processEffectChanges(effect, modifiers, effectStacks);

      if (!requiresEquipment) {
        // Item doesn't require equipment - apply all effects always
        applyAll();
      } else {
        // Item requires equipment - apply based on location
        if (location === 'equipment' || location === 'equipped') {
          // In equipment slot or equipped - apply all effects
          applyAll();
        } else if (location === 'quick') {
          // In quick items - only apply non-attack/damage effects to character
          this._processNonWeaponSpecificEffects(effect, modifiers, effectStacks);
        }
        // In misc slots - don't apply effects if requires equipment
      }
    }
  }

  /**
   * Process only non-weapon-specific effects for quick items (exclude attack/damage)
   */
  _processNonWeaponSpecificEffects(effect, modifiers, stacks = null) {
    for (const change of effect.changes) {
      const key = change.key;
      const mode = change.mode;
      const rawValue = change.value;
      const value = (typeof rawValue === 'string' && (rawValue.trim() === '@βμ' || rawValue.trim() === '@mr'))
        ? (this.system.magic?.degree?.value || 0)
        : (parseFloat(rawValue) || 0);

      if (value === 0) continue;

      // Skip attack and damage related effects for weapons in quick slots
      const isAttackEffect = key.startsWith('system.combat.') && 
                           (key.includes('Attack') || key.includes('attack'));
      const isDamageEffect = key.startsWith('system.damage.');
      
      if (isAttackEffect || isDamageEffect) {
        continue; // Skip these effects for quick items
      }
      
      // Process all other effects normally (abilities, saves, resistances, etc.)
      if (key.startsWith('system.abilities.')) {
        const abilityKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'abilities', abilityKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.abilities[abilityKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.abilities[abilityKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.abilities[abilityKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.saves.')) {
        const saveKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'saves', saveKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.saves[saveKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.saves[saveKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.saves[saveKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.combat.') && !isAttackEffect) {
        const combatKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'combat', combatKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.combat[combatKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.combat[combatKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.combat[combatKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.resistances.')) {
        const resistanceKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'resistances', resistanceKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.resistances[resistanceKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.resistances[resistanceKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.resistances[resistanceKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.magic.')) {
        const magicKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'other', magicKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.other[magicKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[magicKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.other[magicKey + '_invulnerable'] = value;
        }
      } else if (key.startsWith('system.other.')) {
        const otherKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          this._recordModifier(modifiers, stacks, 'other', otherKey, value);
        } else if (mode === 5) { // Override mode
          modifiers.other[otherKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[otherKey + '_condoverride'] = value;
        } else if (mode === 7) { // Invulnerable mode (*)
          modifiers.other[otherKey + '_invulnerable'] = value;
        }
      }
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  /**
   * Roll an Ability Check
   * @param {String} abilityId    The ability id (e.g. "dyn")
   * @param {Object} options      Options for the roll
   */
  async rollAbilityCheck(abilityId, options = {}) {
    return await AndragathimaRoll.rollAbilityCheck(this, abilityId, options);
  }

  /**
   * Roll a Saving Throw
   * @param {String} saveId    The save id (e.g. "ant")
   * @param {Object} options   Options for the roll
   */
  async rollSave(saveId, options = {}) {
    const save = this.system.saves[saveId];
    if (!save) {
      console.error(`Save ${saveId} not found`);
      return;
    }

    const saveLabels = {
      "ant": game.i18n.localize('ANDRAGATHIMA.SaveAntGenitive'),
      "mya": game.i18n.localize('ANDRAGATHIMA.SaveMyaGenitive'),
      "som": game.i18n.localize('ANDRAGATHIMA.SaveSomGenitive')
    };

    const label = `${game.i18n.localize('ANDRAGATHIMA.AvoidanceRoll')} ${saveLabels[saveId]}`;

    // Check if the save is invulnerable (always succeeds)
    if (save.isInvulnerable) {
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
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: messageContent,
        flavor: label,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL
      });

      return { result: "success", invulnerable: true };
    }

    const modifier = save.value;

    return await AndragathimaRoll.basicRoll({
      label: label,
      modifier: modifier,
      targetNumber: options.target || 11,
      actor: this
    });
  }

  /**
   * Roll an Attack
   * @param {Object} options   Options for the roll
   */
  async rollAttack(options = {}) {
    const combat = this.system.combat;
    const isRanged = options.ranged || false;
    
    const modifier = isRanged ? combat.ranged.attack : combat.melee.attack;
    const label = isRanged ? game.i18n.localize('ANDRAGATHIMA.RangedAttack') : game.i18n.localize('ANDRAGATHIMA.MeleeAttack');

    // Create the roll
    const roll = await new Roll(`1d20 + ${modifier}`, this.getRollData()).evaluate({async: true});

    // Check for critical hit (natural 20)
    const d20 = roll.dice[0].results[0].result;
    const critical = d20 === 20;
    const fumble = d20 === 1;

    // Determine success
    const target = options.target || 11;
    const total = roll.total;
    const success = critical ? true : (fumble ? false : total >= target);
    const difference = total - target;
    const stage = Math.floor(Math.abs(difference) / 5) + 1;

    // Prepare chat message
    const speaker = ChatMessage.getSpeaker({actor: this});
    
    let flavor = label;
    if (critical) flavor += " - ΚΑΙΡΙΟ ΠΛΗΓΜΑ!";
    if (fumble) flavor += " - ΚΡΙΣΙΜΗ ΑΠΟΤΥΧΙΑ!";
    
    // Send to chat
    await roll.toMessage({
      speaker: speaker,
      flavor: flavor,
      flags: {
        andragathima: {
          type: "attack",
          ranged: isRanged,
          success: success,
          critical: critical,
          fumble: fumble,
          stage: success ? stage : -stage
        }
      }
    });

    return {roll, success, critical, fumble};
  }

  /**
   * Calculate character level based on combat, Άμυνα, and magic grade
   * @param {Object} systemData   Actor system data
   * @private
   */
  _calculateCharacterLevel(systemData) {
    // 1. Άμυνα (η παλιά Αντοχή). Ήταν ο μέσος όρος άμυνας + αντοχής· τώρα που
    // η παλιά άμυνα καταργήθηκε, μένει σκέτη η Άμυνα.
    // Handle invulnerable base resistance (*) by using a high numeric value (30) for calculation
    const amynaValue = systemData.baseResistance === '*' ? 30 : (parseFloat(systemData.baseResistance) || 0);
    
    // 2. Calculate highest attack + damage from quick items only
    let highestCombatValue = 0;

    // Check quick slots for weapons - use same logic as Record tab
    for (let i = 0; i < 8; i++) {
      const quickItem = systemData.equipment?.quickItems?.[i];
      if (quickItem?.id) {
        const item = this.items.get(quickItem.id);
        if (item && item.type === 'weapon') {
          // Use processWeaponForRecord to get the same calculated values as Record tab
          const weaponData = window.processWeaponForRecord ? window.processWeaponForRecord(this, item, false) : null;
          if (weaponData) {
            const meleeAttack = weaponData.system.meleeAttackWithPenalty || 0;
            const rangedAttack = weaponData.system.rangedAttackWithPenalty || 0;
            const weaponDamage = weaponData.system.weaponDamage || 0;

            // Use highest attack value (melee or ranged)
            const highestAttack = Math.max(meleeAttack, rangedAttack);
            const combatValue = (highestAttack + weaponDamage) / 2;
            highestCombatValue = Math.max(highestCombatValue, combatValue);
          }
        }
      }
    }
    
    // 3. Get magic degree (including status modifiers)
    const statusModifiers = this._getStatusModifiers();
    const baseMagicDegree = systemData.magic?.degree?.value || 0;
    const magicDegreeBonus = statusModifiers.other?.degree || 0;
    const magicDegree = baseMagicDegree + magicDegreeBonus;
    
    // 4. Take the highest of the three values, round it, minimum 0
    const characterLevel = Math.max(0, Math.round(Math.max(amynaValue, highestCombatValue, magicDegree)));
    
    // Store the calculated level
    systemData.characterLevel = characterLevel;
  }

  /**
   * Prepare Container type specific data
   */
  _prepareContainerData(actorData) {
    if (actorData.type !== 'container') return;

    // Make modifications to data here.
    const systemData = actorData.system;
    
    // Initialize miscellaneous items if not present
    if (!systemData.miscellaneous) {
      systemData.miscellaneous = {
        items: []
      };
    }
    
    // Ensure we have exactly 20 slots
    const items = systemData.miscellaneous.items || [];
    while (items.length < 20) {
      items.push({ id: "", name: "", img: "", quantity: 0 });
    }
    systemData.miscellaneous.items = items.slice(0, 20); // Keep only first 20
  }

  /**
   * Prepare Container type derived data (after active effects)
   */
  _prepareDerivedContainerData(actorData) {
    if (actorData.type !== 'container') return;

    // Container actors don't need complex derived data calculations
    const systemData = actorData.system;
    
    // Initialize equipment structure if needed
    if (!systemData.equipment) {
      systemData.equipment = {};
    }
    
    // Calculate only total weight for containers (without encumbrance)
    let totalWeight = 0;
    for (let item of this.items) {
      if (item.system.weight && item.system.quantity) {
        totalWeight += item.system.weight * item.system.quantity;
      } else if (item.system.weight) {
        totalWeight += item.system.weight;
      }
    }
    
    systemData.equipment.totalWeight = Math.round(totalWeight * 10) / 10;
    
    // Set default encumbrance for containers (they don't have capacity limits)
    systemData.equipment.encumbranceStatus = 'light';
    systemData.equipment.encumbranceLabel = game.i18n.localize('ANDRAGATHIMA.EncumbranceLight');
  }

}