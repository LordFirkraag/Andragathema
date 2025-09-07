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
      
      // Store the total value for display and calculations with limits (for XP calculations)
      ability.totalValue = Math.max(6, Math.min(25, ability.value + racialMod));
      
      // New override logic:
      // 1. Start with base + racial + additions
      // 2. Apply absolute override if present (mode = 5)
      // 3. Apply conditional override if present and needed (mode = 6)
      
      let calculatedValue = ability.value + racialMod + statusMod; // Base + racial + additions
      
      if (overrideValue !== undefined) {
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
      ability.mod = Math.floor((ability.displayValue - 10) / 2);
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
      
      // Store the total value for display and calculations (NPCs don't need XP limits)
      ability.totalValue = ability.value + racialMod;
      
      // Same override logic as characters:
      // 1. Start with base + racial + additions
      // 2. Apply absolute override if present (mode = 5)
      // 3. Apply conditional override if present and needed (mode = 6)
      
      let calculatedValue = ability.value + racialMod + statusMod; // Base + racial + additions
      
      if (overrideValue !== undefined) {
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
      ability.mod = Math.floor((ability.displayValue - 10) / 2);
    }
    
    // Calculate combat values
    this._calculateCombatValues(systemData);
    
    // Calculate save bonuses
    this._calculateSaves(systemData);
    
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
  }

  /**
   * Calculate ability modifier including racial bonuses and status modifiers
   */
  _getAbilityMod(ability) {
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
    systemData.hasArmorPenalty = armorData.defensePenalty < 0;
    systemData.hasShieldPenalty = shieldPenalties.attackPenalty < 0;
    
    // Melee combat values
    const strMod = this._getAbilityMod(abilities.dyn);
    const meleeStatusMod = statusModifiers.combat.melee || 0;
    const meleeDefenseStatusMod = statusModifiers.combat.meleeDefense || 0;
    
    // Store display value for combat skills (includes status modifiers)
    combat.melee.displayValue = (combat.melee.value || 0) + meleeStatusMod;
    combat.melee.statusMod = meleeStatusMod;
    
    // Add separate attack modifiers (e.g., from frightened effect)
    const meleeAttackStatusMod = statusModifiers.combat.meleeAttack || 0;
    combat.melee.attack = (combat.melee.value || 0) + meleeStatusMod + meleeAttackStatusMod + armorData.attackPenalty + encumbrancePenalties.attackPenalty + shieldPenalties.attackPenalty;
    
    // Melee defense = melee combat skill + melee status mod + melee defense status mod + shield bonus (if any) + armor penalty + encumbrance penalty + shield penalty
    const shieldBonuses = this._getShieldBonus(systemData);
    
    // Check if blinded - ignore melee coefficient (melee combat skill) and shield bonus
    const ignoreMeleeCoeff = statusModifiers.other?.ignoreMeleeCoefficient_override || statusModifiers.other?.ignoreMeleeCoefficient;
    const ignoreShieldCoeff = statusModifiers.other?.ignoreShieldCoefficient_override || statusModifiers.other?.ignoreShieldCoefficient;
    
    const meleeCoeff = ignoreMeleeCoeff ? 0 : (combat.melee.value || 0) + meleeStatusMod;
    const shieldMeleeBonus = ignoreShieldCoeff ? 0 : shieldBonuses.melee;
    
    combat.melee.defense = meleeCoeff + meleeDefenseStatusMod + shieldMeleeBonus + armorData.defensePenalty + encumbrancePenalties.defensePenalty + shieldPenalties.defensePenalty;
    combat.melee.damage = strMod;
    
    // Ranged combat values
    const dexMod = this._getAbilityMod(abilities.epi);
    const rangedStatusMod = statusModifiers.combat.ranged || 0;
    const rangedDefenseStatusMod = statusModifiers.combat.rangedDefense || 0;
    
    // Store display value for ranged combat skill (includes status modifiers)
    combat.ranged.displayValue = (combat.ranged.value || 0) + rangedStatusMod;
    combat.ranged.statusMod = rangedStatusMod;
    
    // NOTE: Dexterity modifier should only be added to damage based on weapon setting, not to attack
    // Add separate attack modifiers (e.g., from frightened effect)
    const rangedAttackStatusMod = statusModifiers.combat.rangedAttack || 0;
    combat.ranged.attack = (combat.ranged.value || 0) + rangedStatusMod + rangedAttackStatusMod + sizeMod.rangedAttack + armorData.attackPenalty + encumbrancePenalties.attackPenalty + shieldPenalties.attackPenalty;
    
    // Ranged defense = dexterity modifier + size modifier + shield bonus (if any) + armor penalty + encumbrance penalty + shield penalty + status modifiers
    // Check if blinded - ignore ranged coefficient (dexterity modifier) and shield bonus
    const ignoreRangedCoeff = statusModifiers.other?.ignoreRangedCoefficient_override || statusModifiers.other?.ignoreRangedCoefficient;
    const ignoreShieldRangedCoeff = statusModifiers.other?.ignoreShieldCoefficient_override || statusModifiers.other?.ignoreShieldCoefficient;
    
    const rangedCoeff = ignoreRangedCoeff ? 0 : dexMod;
    const shieldRangedBonus = ignoreShieldRangedCoeff ? 0 : shieldBonuses.ranged;
    
    combat.ranged.defense = rangedCoeff + rangedDefenseStatusMod + sizeMod.rangedDefense + shieldRangedBonus + armorData.defensePenalty + encumbrancePenalties.defensePenalty + shieldPenalties.defensePenalty;
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
    const kraMod = this._getAbilityMod(abilities.kra);
    const baseResistanceStatusMod = statusModifiers.resistances.base || 0;
    const baseResistanceOverride = statusModifiers.resistances.base_override;
    const baseResistanceCondOverride = statusModifiers.resistances.base_condoverride;
    
    // Apply override logic to base resistance
    let baseResistance = kraMod + sizeMod.antochi + baseResistanceStatusMod; // Calculated value
    
    if (baseResistanceOverride !== undefined) {
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
      
      // Apply override logic to specialized resistance
      let specializedBonus = resistance.base + armorResistance + resistanceStatusMod;
      
      if (resistanceOverride !== undefined) {
        // Absolute override mode (=): use the override value directly
        specializedBonus = resistanceOverride;
        resistance.statusMod = resistanceOverride - resistance.base; // Show effective change
      } else if (resistanceCondOverride !== undefined && specializedBonus < resistanceCondOverride) {
        // Conditional override mode (>=): use override only if it's higher than calculated
        specializedBonus = resistanceCondOverride;
        resistance.statusMod = resistanceCondOverride - resistance.base; // Show effective change
      } else {
        resistance.statusMod = resistanceStatusMod;
      }
      
      resistance.total = baseResistance + specializedBonus;
      resistance.specialized = specializedBonus;
      
      // Track non-zero specialized resistances for display
      if (specializedBonus !== 0) {
        specializedResistances.push({
          label: resistance.label,
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
    
    
    
    // Store status modifiers in flags for template use
    if (!this.flags.andragathima) this.flags.andragathima = {};
    if (!this.flags.andragathima.modifiers) this.flags.andragathima.modifiers = {};
    if (!this.flags.andragathima.modifiers.combat) this.flags.andragathima.modifiers.combat = {};
    
    this.flags.andragathima.modifiers.combat.meleeDefense = meleeDefenseStatusMod;
    this.flags.andragathima.modifiers.combat.rangedDefense = rangedDefenseStatusMod;
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
        defensePenalty: 0,
        armorType: null
      };
    }
    
    // Get the armor item
    const armorItem = this.items.get(torsoSlot.id);
    if (!armorItem || armorItem.type !== 'armor') {
      return {
        resistances: {},
        attackPenalty: 0,
        defensePenalty: 0,
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
    
    return {
      resistances: armorSystem.resistances || {},
      attackPenalty: appliedPenalty, // Now added directly (penalty should be entered as negative in armor sheet)
      defensePenalty: appliedPenalty, // Now added directly (penalty should be entered as negative in armor sheet)
      armorType: armorType
    };
  }

  /**
   * Get shield bonus from equipped shield or weapon in shield slot
   */
  _getShieldBonus(systemData) {
    let meleeBonus = 0;
    let rangedBonus = 0;
    
    // Check for equipped shield items (armor type)
    const shieldItems = this.items.filter(item => 
      item.type === 'armor' && 
      item.system.armorType === 'shield' && 
      item.system.equipped
    );
    
    for (let shield of shieldItems) {
      const bonus = shield.system.defenseBonus || 0;
      meleeBonus += bonus;
      rangedBonus += bonus;
    }
    
    // Check for weapon in shield slot
    const shieldSlot = systemData.equipment?.slots?.shield;
    if (shieldSlot && shieldSlot.id) {
      const shieldWeapon = this.items.get(shieldSlot.id);
      if (shieldWeapon && shieldWeapon.type === 'weapon') {
        const weaponType = shieldWeapon.system.weaponType;
        const isLight = shieldWeapon.system.isLight || false;
        
        if (weaponType === 'aspida_varia' && isLight) {
          // Light shield (Ασπίδες + ελαφρύ όπλο): +2/+2
          meleeBonus += 2;
          rangedBonus += 2;
        } else if (weaponType === 'aspida_varia' && !isLight) {
          // Heavy shield (Ασπίδες χωρίς ελαφρύ όπλο): +2/+4
          meleeBonus += 2;
          rangedBonus += 4;
        } else {
          // Any other weapon: +1/+0
          meleeBonus += 1;
          rangedBonus += 0;
        }
      }
    }
    
    return { melee: meleeBonus, ranged: rangedBonus };
  }

  /**
   * Get shield penalties from equipped shields without proper proficiency
   */
  _getShieldPenalties(systemData) {
    let attackPenalty = 0;
    let defensePenalty = 0;
    
    // Check if character has Aspides skill
    const hasAspidesSkill = systemData.skills?.aspides?.hasSkill || false;
    
    // Check for weapon in shield slot
    const shieldSlot = systemData.equipment?.slots?.shield;
    if (shieldSlot && shieldSlot.id) {
      const shieldWeapon = this.items.get(shieldSlot.id);
      if (shieldWeapon && shieldWeapon.type === 'weapon') {
        const weaponType = shieldWeapon.system.weaponType;
        const isLight = shieldWeapon.system.isLight || false;
        
        if (!hasAspidesSkill && weaponType === 'aspida_varia') {
          if (isLight) {
            // Light shield (Ασπίδες + ελαφρύ όπλο) without skill: -1/-1
            attackPenalty = -1;
            defensePenalty = -1;
          } else {
            // Heavy shield (Ασπίδες χωρίς ελαφρύ όπλο) without skill: -2/-2
            attackPenalty = -2;
            defensePenalty = -2;
          }
        }
        // Other weapons don't get shield penalties
      }
    }
    
    return {
      attackPenalty: attackPenalty,
      defensePenalty: defensePenalty
    };
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
    
    // Αντανακλαστικά (Reflexes) - based on Επιδεξιότητα + encumbrance penalty + status modifiers
    const antStatusMod = statusModifiers.saves.ant || 0;
    saves.ant.value = (saves.ant.base || 0) + this._getAbilityMod(abilities.epi) + encumbrancePenalties.savesPenalty + antStatusMod;
    saves.ant.statusMod = antStatusMod;
    
    // Μυαλό (Mind) - based on Σοφία + status modifiers
    const myaStatusMod = statusModifiers.saves.mya || 0;
    saves.mya.value = (saves.mya.base || 0) + this._getAbilityMod(abilities.sof) + myaStatusMod;
    saves.mya.statusMod = myaStatusMod;
    
    // Σώμα (Body) - based on Κράση + status modifiers
    const somStatusMod = statusModifiers.saves.som || 0;
    saves.som.value = (saves.som.base || 0) + this._getAbilityMod(abilities.kra) + somStatusMod;
    saves.som.statusMod = somStatusMod;
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
          defensePenalty: 0,
          savesPenalty: 0,
          speedMultiplier: 1,
          speedNote: ''
        };
      case 'heavy':
        return {
          attackPenalty: -2,
          defensePenalty: -2,
          savesPenalty: -2,
          speedMultiplier: 2/3,
          speedNote: game.i18n.localize('ANDRAGATHIMA.RunningX3')
        };
      case 'maximum':
        return {
          attackPenalty: -5,
          defensePenalty: -5,
          savesPenalty: -5,
          speedMultiplier: 1/3,
          speedNote: game.i18n.localize('ANDRAGATHIMA.RunningImpossible')
        };
      case 'overloaded':
        return {
          attackPenalty: -10,
          defensePenalty: -10,
          savesPenalty: -10,
          speedMultiplier: 0,
          speedNote: ''
        };
      default:
        return {
          attackPenalty: 0,
          defensePenalty: 0,
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

    // Process all active effects on this actor
    for (const effect of this.effects) {
      if (effect.disabled) continue;
      
      this._processEffectChanges(effect, modifiers);
    }

    // Process effects from equipped items
    this._processEquippedItemEffects(modifiers);
    
    return modifiers;
  }

  /**
   * Process effect changes and add to modifiers
   */
  _processEffectChanges(effect, modifiers) {
    // Special handling for Total Defense condition
    if (effect.statuses && effect.statuses.has("totaldefense")) {
      this._processTotalDefenseEffect(effect, modifiers);
      return;
    }
    
    for (const change of effect.changes) {
      const key = change.key;
      const mode = change.mode;
      let value = change.value;
      
      // Handle boolean values
      if (value === 'true') value = true;
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
          modifiers.abilities[abilityKey] = (modifiers.abilities[abilityKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.abilities[abilityKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.abilities[abilityKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.saves.')) {
        const saveKey = key.split('.')[2]; // e.g., 'ant' from 'system.saves.ant.base'
        if (mode === 2) { // Add mode
          modifiers.saves[saveKey] = (modifiers.saves[saveKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.saves[saveKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.saves[saveKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.combat.')) {
        const combatKey = key.split('.')[2]; // e.g., 'meleeDefense' from 'system.combat.meleeDefense'
        if (mode === 2) { // Add mode
          modifiers.combat[combatKey] = (modifiers.combat[combatKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.combat[combatKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.combat[combatKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.resistances.')) {
        const resistanceKey = key.split('.')[2]; // e.g., 'base' from 'system.resistances.base'
        if (mode === 2) { // Add mode
          modifiers.resistances[resistanceKey] = (modifiers.resistances[resistanceKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.resistances[resistanceKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.resistances[resistanceKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.magic.')) {
        const magicKey = key.split('.')[2]; // e.g., 'level' from 'system.magic.level.value'
        if (mode === 2) { // Add mode
          modifiers.other[magicKey] = (modifiers.other[magicKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.other[magicKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[magicKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.other.')) {
        const otherKey = key.split('.')[2]; // e.g., 'pali' from 'system.other.pali.value'
        if (mode === 2) { // Add mode
          if (typeof value === 'boolean') {
            modifiers.other[otherKey] = value;
          } else {
            modifiers.other[otherKey] = (modifiers.other[otherKey] || 0) + value;
          }
        } else if (mode === 5) { // Override mode
          modifiers.other[otherKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[otherKey + '_condoverride'] = value;
        }
      }
    }
  }

  /**
   * Process Total Defense effect with complex shield and skill logic
   */
  _processTotalDefenseEffect(effect, modifiers) {
    // Base total defense: +4/+0
    let meleeDefenseBonus = 4;
    let rangedDefenseBonus = 0;
    
    // Check if character has a shield equipped
    const shieldSlot = this.system.equipment?.slots?.shield;
    const hasShield = shieldSlot && shieldSlot.id && shieldSlot.id.trim() !== "";
    
    // Check for Projectile Deflection skill (Εκτροπή βλημάτων)
    const hasProjectileDeflection = this.system.skills?.ektropi_vlimaton?.hasSkill;
    
    // Check for Never Unarmed skill (Ποτέ άοπλος)
    const hasNeverUnarmed = this.system.skills?.pote_aoplos?.hasSkill;
    
    // Check if character is holding any weapon that is NOT Fist category
    const quickWeapons = [];
    this.system.equipment?.quickItems?.forEach(quickItem => {
      if (quickItem.id) {
        const item = this.items.get(quickItem.id);
        if (item && item.type === 'weapon') {
          quickWeapons.push({
            name: item.name,
            category: item.system.weaponCategory,
            isFistCategory: item.system.weaponCategory === 'fist'
          });
        }
      }
    });
    
    const isHoldingNonFistWeapon = quickWeapons.some(weapon => !weapon.isFistCategory) || hasShield;
    
    // Apply bonus logic:
    if (hasShield) {
      // Has shield (light or heavy): +4/+4
      rangedDefenseBonus = 4;
    } else if (hasProjectileDeflection && hasNeverUnarmed) {
      // Has both Projectile Deflection and Never Unarmed: always +4/+4
      rangedDefenseBonus = 4;
    } else if (hasProjectileDeflection && isHoldingNonFistWeapon) {
      // Has Projectile Deflection and holding any weapon that is not fist category: +4/+4
      rangedDefenseBonus = 4;
    }
    
    // Apply the modifiers
    modifiers.combat.meleeDefense = (modifiers.combat.meleeDefense || 0) + meleeDefenseBonus;
    modifiers.combat.rangedDefense = (modifiers.combat.rangedDefense || 0) + rangedDefenseBonus;
    
    console.log(`Total Defense DEBUG:`, {
      meleeBonus: meleeDefenseBonus,
      rangedBonus: rangedDefenseBonus,
      hasShield,
      hasProjectileDeflection,
      hasNeverUnarmed,
      isHoldingNonFistWeapon,
      quickWeapons,
      projectileDeflectionSkill: this.system.skills?.ektropi_vlimaton,
      neverUnarmedSkill: this.system.skills?.pote_aoplos
    });
  }

  /**
   * Process effects from equipped items
   */
  _processEquippedItemEffects(modifiers) {
    // Process equipment slot items
    const equipmentSlots = this.system.equipment?.slots || {};
    for (const [slotKey, slotData] of Object.entries(equipmentSlots)) {
      if (slotData.id) {
        const item = this.items.get(slotData.id);
        if (item && item.effects) {
          this._processItemEffects(item, modifiers, 'equipment');
        }
      }
    }

    // Process quick items
    const quickItems = this.system.equipment?.quickItems || [];
    for (const quickItem of quickItems) {
      if (quickItem.id) {
        const item = this.items.get(quickItem.id);
        if (item && item.effects) {
          this._processItemEffects(item, modifiers, 'quick');
        }
      }
    }

    // Process items with equipped system property
    for (const item of this.items) {
      if (item.system.equipped && item.effects) {
        this._processItemEffects(item, modifiers, 'equipped');
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
          this._processItemEffects(item, modifiers, 'misc');
        }
      }
    }
  }

  /**
   * Process effects from a specific item based on its location and settings
   */
  _processItemEffects(item, modifiers, location) {
    const requiresEquipment = item.system.effectsRequireEquipment !== false; // Default true
    
    for (const effect of item.effects) {
      if (effect.disabled) continue;
      
      if (!requiresEquipment) {
        // Item doesn't require equipment - apply all effects always
        this._processEffectChanges(effect, modifiers);
      } else {
        // Item requires equipment - apply based on location
        if (location === 'equipment' || location === 'equipped') {
          // In equipment slot or equipped - apply all effects
          this._processEffectChanges(effect, modifiers);
        } else if (location === 'quick') {
          // In quick items - only apply non-attack/damage effects to character
          this._processNonWeaponSpecificEffects(effect, modifiers);
        }
        // In misc slots - don't apply effects if requires equipment
      }
    }
  }

  /**
   * Process only non-weapon-specific effects for quick items (exclude attack/damage)
   */
  _processNonWeaponSpecificEffects(effect, modifiers) {
    for (const change of effect.changes) {
      const key = change.key;
      const mode = change.mode;
      const value = parseFloat(change.value) || 0;
      
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
          modifiers.abilities[abilityKey] = (modifiers.abilities[abilityKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.abilities[abilityKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.abilities[abilityKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.saves.')) {
        const saveKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          modifiers.saves[saveKey] = (modifiers.saves[saveKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.saves[saveKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.saves[saveKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.combat.') && !isAttackEffect) {
        const combatKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          modifiers.combat[combatKey] = (modifiers.combat[combatKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.combat[combatKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.combat[combatKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.resistances.')) {
        const resistanceKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          modifiers.resistances[resistanceKey] = (modifiers.resistances[resistanceKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.resistances[resistanceKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.resistances[resistanceKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.magic.')) {
        const magicKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          modifiers.other[magicKey] = (modifiers.other[magicKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.other[magicKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[magicKey + '_condoverride'] = value;
        }
      } else if (key.startsWith('system.other.')) {
        const otherKey = key.split('.')[2];
        if (mode === 2) { // Add mode
          modifiers.other[otherKey] = (modifiers.other[otherKey] || 0) + value;
        } else if (mode === 5) { // Override mode
          modifiers.other[otherKey + '_override'] = value;
        } else if (mode === 6) { // Conditional override mode (>=)
          modifiers.other[otherKey + '_condoverride'] = value;
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
   * Calculate character level based on combat, defense, and magic grade
   * @param {Object} systemData   Actor system data
   * @private
   */
  _calculateCharacterLevel(systemData) {
    // 1. Calculate defense + resistance average
    const defenseAverage = (systemData.combat.melee.defense + systemData.baseResistance) / 2;
    
    // 2. Calculate highest attack + damage from quick items
    let highestCombatValue = 0;
    
    // Check items in quick slots for weapons
    const items = this.items || [];
    for (const item of items) {
      if (item.type === 'weapon' && item.system.isQuickItem) {
        const attack = item.system.attack || 0;
        const damage = item.system.damage || 0;
        const combatValue = (attack + damage) / 2;
        highestCombatValue = Math.max(highestCombatValue, combatValue);
      }
    }
    
    // 3. Get magic degree (including status modifiers)
    const statusModifiers = this._getStatusModifiers();
    const baseMagicDegree = systemData.magic?.degree?.value || 0;
    const magicDegreeBonus = statusModifiers.other?.degree || 0;
    const magicDegree = baseMagicDegree + magicDegreeBonus;
    
    // 4. Take the highest of the three values and round it
    const characterLevel = Math.round(Math.max(defenseAverage, highestCombatValue, magicDegree));
    
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