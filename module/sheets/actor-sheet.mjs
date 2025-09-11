import { AndragathimaRoll } from "../helpers/dice.mjs";

/**
 * Extend the basic ActorSheet for ΑΝΔΡΑΓΑΘΗΜΑ
 * @extends {ActorSheet}
 */
export class AndragathimaActorSheet extends ActorSheet {


  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["andragathima", "sheet", "actor"],
      template: "systems/andragathima/templates/actor/actor-sheet.html",
      width: 800,
      height: 680,
      tabs: [{ navSelector: ".vertical-tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }


  /** @override */
  get template() {
    return `systems/andragathima/templates/actor/${this.actor.type}-sheet.html`;
  }

  /** @override */
  async _render(force, options = {}) {
    await super._render(force, options);
    
    // Set container window size after rendering
    if (this.actor.type === 'container') {
      this.setPosition({
        width: 380,
        height: 290
      });
    }
    
    // Set note window size after rendering (taller for rich text editor)
    if (this.actor.type === 'note') {
      this.setPosition({
        width: 600,
        height: 500
      });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet.
    const context = await super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Add GM/Assistant check for template use
    context.isGMOrAssistant = game.user.role >= CONST.USER_ROLES.ASSISTANT;
    
    // Check if actor is dead for greyscale effect
    context.isDead = this.document.effects.some(effect => !effect.disabled && effect.statuses?.has("dead"));

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._applyStatusModifiersToMagic(context);
      this._prepareItems(context);
      this._prepareCharacterData(context);
      this._prepareMiscEquipmentSlots(context);
      this._prepareAvailableElements(context);
      
      // Equipment data - no weight calculations
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._applyStatusModifiersToMagic(context);
      this._prepareItems(context);
      this._prepareNpcData(context);
      this._prepareMiscEquipmentSlots(context);
      this._prepareAvailableElements(context);
      
      // Also call character preparation for shared functionality, but make it safe for NPCs
      try {
        this._prepareCharacterDataShared(context);
      } catch(e) {
        // If character data preparation fails for NPCs, continue
        console.warn('NPC character data preparation failed:', e);
      }
    }

    // Prepare Container data and items.
    if (actorData.type == 'container') {
      this._prepareContainerData(context);
    }

    // Prepare Note data
    if (actorData.type == 'note') {
      this._prepareNoteData(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = this._prepareActiveEffects(this.actor.effects);

    // Add CONFIG data
    context.config = CONFIG.ANDRAGATHIMA;
    
    // Prepare quick weapons for display
    this._prepareQuickWeapons(context);

    // Prepare enriched equipment data with actual item properties
    this._prepareEnrichedEquipment(context);

    // Pre-process tooltips for all equipment slots and quick items
    this._prepareEquipmentTooltips(context);

    return context;
  }

  /**
   * Prepare active effects for display
   */
  _prepareActiveEffects(effects) {
    // Categories for effects
    const categories = {
      temporary: [],
      passive: [],
      inactive: [],
      allEffects: []
    };

    // Iterate through effects, allocating to containers and preparing tooltips
    for (let e of effects) {
      // Create tooltip for this effect
      let tooltip = `<strong>${e.name}</strong>`;
      
      // Check if this is a system status effect with a description
      // Try multiple ways to identify system status effects
      let systemStatusEffect = null;
      
      // Method 1: Check by effect source/origin
      if (e.origin) {
        systemStatusEffect = CONFIG.ANDRAGATHIMA.statusEffects.find(se => 
          e.name === game.i18n.localize(se.name) || e.name === se.name
        );
      }
      
      // Method 2: Check by name matching
      if (!systemStatusEffect) {
        systemStatusEffect = CONFIG.ANDRAGATHIMA.statusEffects.find(se => 
          e.name === game.i18n.localize(se.name) || 
          e.name.toLowerCase() === game.i18n.localize(se.name).toLowerCase()
        );
      }
      
      if (systemStatusEffect && systemStatusEffect.description) {
        // Use the localized description for system status effects
        const description = game.i18n.localize(systemStatusEffect.description);
        tooltip += `<br>${description}`;
      } else if (e.description) {
        // Use the effect's own description if available
        tooltip += `<br>${e.description}`;
      } else if (e.changes && e.changes.length > 0) {
        // Fallback to showing changes for custom effects
        for (let change of e.changes) {
          if (change.key && change.value) {
            // Convert system paths to readable labels
            const label = this._getEffectChangeLabel(change.key);
            const modeSymbol = change.mode === 2 ? "+" : (change.mode === 5 ? "=" : (change.mode === 6 ? ">=" : "×"));
            tooltip += `<br>${label} ${modeSymbol}${change.value}`;
          }
        }
      }
      
      // Add tooltip to effect object
      e.tooltip = tooltip;
      
      // Categorize effects
      if (e.disabled) categories.inactive.push(e);
      else if (e.isTemporary) categories.temporary.push(e);
      else categories.passive.push(e);
      
      // Add all effects to allEffects array for grid display
      categories.allEffects.push(e);
    }

    return categories;
  }

  /**
   * Convert system paths to readable Greek labels
   */
  _getEffectChangeLabel(key) {
    const labelMap = {
      'system.abilities.dyn.value': 'Δύναμη',
      'system.abilities.epi.value': 'Επιδεξιότητα', 
      'system.abilities.kra.value': 'Κράση',
      'system.abilities.eyf.value': 'Ευφυΐα',
      'system.abilities.sof.value': 'Σοφία',
      'system.abilities.xar.value': 'Χάρισμα',
      'system.abilities.dyn.modifier': 'Δύναμη (τροποποιητής)',
      'system.abilities.epi.modifier': 'Επιδεξιότητα (τροποποιητής)',
      'system.abilities.kra.modifier': 'Κράση (τροποποιητής)',
      'system.abilities.xar.modifier': 'Χάρισμα (τροποποιητής)',
      'system.saves.ant.base': 'Αντανακλαστικά',
      'system.saves.mya.base': 'Μυαλό',
      'system.saves.som.base': 'Σώμα',
      'system.saves.ant.modifier': 'Αντανακλαστικά (τροποποιητής)',
      'system.combat.melee.value': 'Σώμα με σώμα',
      'system.combat.ranged.value': 'Μακρόθεν',
      'system.combat.meleeAttack.modifier': 'Επίθεση σώμα με σώμα (τροποποιητής)',
      'system.combat.rangedAttack.modifier': 'Επίθεση μακρόθεν (τροποποιητής)',
      'system.combat.meleeDefense.value': 'Άμυνα σώμα με σώμα',
      'system.combat.rangedDefense.value': 'Άμυνα μακρόθεν',
      'system.combat.meleeDefense.modifier': 'Άμυνα σώμα με σώμα (τροποποιητής)',
      'system.combat.rangedDefense.modifier': 'Άμυνα εξ αποστάσεως (τροποποιητής)',
      'system.combat.meleeDefense.ignoreMeleeCoefficient': 'Αγνόηση συντελεστή δεξιότητας (άμυνα σ.μ.σ.)',
      'system.combat.rangedDefense.ignoreRangedCoefficient': 'Αγνόηση συντελεστή δεξιότητας (άμυνα εξ αποστάσεως)',
      'system.combat.meleeDefense.ignoreShieldCoefficient': 'Αγνόηση συντελεστή ασπίδας (άμυνα σ.μ.σ.)',
      'system.combat.rangedDefense.ignoreShieldCoefficient': 'Αγνόηση συντελεστή ασπίδας (άμυνα εξ αποστάσεως)',
      'system.combat.initiative.value': 'Πρωτοβουλία',
      'system.other.initiative': 'Πρωτοβουλία (τροποποιητής)',
      'system.resistances.base': 'Αντοχή',
      'system.resistances.diatrisi': 'Αντοχή διάτρησης',
      'system.resistances.kroysi': 'Αντοχή κρούσης',
      'system.resistances.tomi': 'Αντοχή τομής',
      'system.resistances.keravnos': 'Αντοχή κεραυνού',
      'system.resistances.oxy': 'Αντοχή οξέος',
      'system.resistances.fotia': 'Αντοχή φωτιάς',
      'system.resistances.psyxos': 'Αντοχή ψύχους',
      'system.resistances.magiki': 'Αντοχή μαγικής ενέργειας',
      'system.other.pali.value': 'Πάλη',
      'system.other.eystatheia.value': 'Ευστάθεια',
      'system.other.speed.value': 'Ταχύτητα',
      'system.movement.speed': 'Ταχύτητα κίνησης',
      'system.other.canRun': 'Δυνατότητα τρεξίματος',
      'system.other.speedMultiplier': 'Πολλαπλασιαστής ταχύτητας',
      'system.magic.level.value': 'Επίπεδο μάγου',
      'system.magic.degree.value': 'Βαθμός μαγείας'
    };
    
    return labelMap[key] || key;
  }

  /**
   * Prepare shared data for both characters and NPCs
   */
  _prepareCharacterDataShared(context) {
    // This method contains shared functionality that works for both characters and NPCs
    // No race-specific or experience-specific code here
    
    // Add basic context data that both characters and NPCs need
    // (Currently this is empty but can be extended with shared functionality)
  }
  
  /**
   * Prepare character-specific data
   */
  _prepareCharacterData(context) {
    // Call shared preparation first
    this._prepareCharacterDataShared(context);
    
    // Add race options
    context.raceChoices = CONFIG.ANDRAGATHIMA.races;
    
    // Add current race features
    const currentRace = context.system.details.race.value;
    
    if (currentRace) {
      const raceData = CONFIG.ANDRAGATHIMA.raceModifiers[currentRace];
      const rawFeatures = raceData?.features || [];
      context.raceFeatures = rawFeatures.map(feature => game.i18n.localize(feature));
      
      // Add localized race name for placeholder
      const raceKey = CONFIG.ANDRAGATHIMA.races[currentRace];
      context.currentRaceName = raceKey ? game.i18n.localize(raceKey) : game.i18n.localize("ANDRAGATHIMA.SelectRace");
    } else {
      context.raceFeatures = [];
      context.currentRaceName = game.i18n.localize("ANDRAGATHIMA.SelectRace");
    }
    
    // Calculate experience spent
    const system = context.system;
    
    // Ensure experience structure exists
    if (!system.details.experience) {
      system.details.experience = { value: 0, spent: 0, remaining: 0 };
    }
    let totalExp = 0;
    
    // Add racial experience cost
    if (system.details.race.value) {
      const raceData = CONFIG.ANDRAGATHIMA.raceModifiers[system.details.race.value];
      if (raceData && raceData.experienceCost) {
        totalExp += raceData.experienceCost;
      }
    }
    
    // Add experience from abilities (use totalValue if available, otherwise calculate)
    for (let ability of Object.values(system.abilities)) {
      const abilityValue = ability.totalValue || (ability.value + (ability.racialMod || 0));
      totalExp += this._calculateAbilityExp(abilityValue);
    }
    
    // Add experience from combat abilities (costs +2 for each +1)
    if (system.combat.melee && system.combat.melee.value > 0) {
      totalExp += system.combat.melee.value * 2;
    }
    if (system.combat.ranged && system.combat.ranged.value > 0) {
      totalExp += system.combat.ranged.value * 2;
    }
    
    // Store encumbrance penalty info for template use
    const encumbranceStatus = system.equipment?.encumbranceStatus || 'light';
    system.hasEncumbrancePenalty = encumbranceStatus !== 'light';
    
    // Add experience for base saves
    for (let [saveKey, save] of Object.entries(system.saves)) {
      
      // Add experience only for base save value
      if (save.base > 0) {
        totalExp += save.base;
      }
    }
    
    // Add experience from skills (1 point per level)
    for (let skill of Object.values(system.skills)) {
      if (skill.hasSkill && skill.level > 0) {
        // Each skill level costs 1 experience point
        totalExp += skill.level;
      }
    }
    
    // Add experience from magic (Mage Level × Magic Degree)
    if (system.magic && system.magic.level && system.magic.degree) {
      const mageLevel = system.magic.level.value || 0;
      const magicDegree = system.magic.degree.value || 0;
      totalExp += mageLevel * magicDegree;
      
      // Add experience for spells in spellbook (1 point per spell if Degree > 0 and Level > 0)
      if (mageLevel > 0 && magicDegree > 0) {
        const spellCount = this.actor.items.filter(item => item.type === "spell").length;
        totalExp += spellCount;
      }
    }
    
    // Add experience from items if they exist
    if (context.skills) {
      for (let item of context.skills) {
        totalExp += item.system.experienceCost || 0;
      }
    }
    
    system.details.experience.spent = totalExp;
    system.details.experience.remaining = system.details.experience.value - totalExp;
    
  }

  /**
   * Prepare NPC-specific data
   */
  _prepareNpcData(context) {
    const systemData = context.system;
    
    // Ensure details and size structure exists first
    if (!systemData.details) {
      systemData.details = {};
    }
    if (!systemData.details.size) {
      systemData.details.size = { value: "medium" };
    }
    
    // Add size options
    context.sizeChoices = CONFIG.ANDRAGATHIMA.sizes;
    
    // Add localized size name for placeholder - same pattern as character sheet
    const currentSize = systemData.details.size.value || 'medium';
    const sizeKey = CONFIG.ANDRAGATHIMA.sizes[currentSize];
    
    // Provide safe fallback to hardcoded values if localization fails
    try {
      const localizedName = sizeKey ? game.i18n.localize(sizeKey) : game.i18n.localize("ANDRAGATHIMA.SizeMedium");
      context.currentSizeName = localizedName && typeof localizedName === 'string' ? localizedName : 'Μέσο';
    } catch (e) {
      console.warn('Failed to localize size name for NPC:', e);
      context.currentSizeName = 'Μέσο';
    }
    
    // Ensure displayTitle is always a string, never an object
    const displayTitle = systemData.details.displayTitle;
    context.displayTitleString = (typeof displayTitle === 'object' && displayTitle.value) ? displayTitle.value : (typeof displayTitle === 'string' ? displayTitle : '');
      
    // NPCs don't have races, so no race features
    context.raceFeatures = [];
    
    // Set default target numbers for new NPCs
    if (!this.actor.flags.andragathima?.useTargetNumbers && this.actor.flags.andragathima?.useTargetNumbers !== false) {
      // This is a new NPC, set target numbers to true
      this.actor.setFlag('andragathima', 'useTargetNumbers', true);
    }
    
    // Calculate spent experience points for NPCs
    if (!systemData.details.experience) {
      systemData.details.experience = { value: 0, spent: 0 };
    }
    systemData.details.experience.spent = this._calculateTotalSpentExperience();
  }

  /**
   * Calculate experience cost for an ability score
   */
  _calculateAbilityExp(score) {
    // Base cost increases with higher scores
    return score - 10;
  }

  /**
   * Prepare miscellaneous equipment slots
   */
  _prepareMiscEquipmentSlots(context) {
    // Create array of 20 slots
    context.miscEquipmentSlots = new Array(20).fill(null);
    
    // Get all items that are not equipped in specific equipment slots (excluding spells)
    const unequippedItems = Array.from(this.actor.items).filter(item => {
      // Exclude spells from misc slots
      if (item.type === "spell") return false;
      
      // Check if item is in equipment slots
      const slots = this.actor.system.equipment?.slots || {};
      const quickItems = this.actor.system.equipment?.quickItems || [];
      
      // Check if item is in equipment slots
      for (let slotData of Object.values(slots)) {
        if (slotData.id && slotData.id === item.id) {
          return false; // Item is equipped in an equipment slot
        }
      }
      
      // Check if item is in quick items
      for (let quickItem of quickItems) {
        if (quickItem.id && quickItem.id === item.id) {
          return false; // Item is in quick items
        }
      }
      
      return true; // Item is not equipped anywhere, should go to misc slots
    });
    
    // Place items in misc slots based on their stored misc slot index
    unequippedItems.forEach((item) => {
      const miscSlotIndex = item.flags?.andragathima?.miscSlotIndex;
      
      if (miscSlotIndex !== undefined && miscSlotIndex !== null && 
          miscSlotIndex >= 0 && miscSlotIndex < 20 && 
          context.miscEquipmentSlots[miscSlotIndex] === null) {
        // Place item in its stored slot position
        context.miscEquipmentSlots[miscSlotIndex] = item;
      }
    });
    
    // Place remaining items (without stored positions) in first available slots
    unequippedItems.forEach((item) => {
      const miscSlotIndex = item.flags?.andragathima?.miscSlotIndex;
      
      if (miscSlotIndex === undefined || miscSlotIndex === null || 
          context.miscEquipmentSlots[miscSlotIndex] !== item) {
        // Find first available slot
        for (let i = 0; i < 20; i++) {
          if (context.miscEquipmentSlots[i] === null) {
            context.miscEquipmentSlots[i] = item;
            break;
          }
        }
      }
    });
  }

  /**
   * Prepare quick weapons for display in character stats
   */
  _prepareQuickWeapons(context) {
    context.quickWeapons = [];
    context.shieldWeapons = [];
    
    const quickItems = this.actor.system.equipment?.quickItems || [];
    
    for (let quickItem of quickItems) {
      if (quickItem.id) {
        const item = this.actor.items.get(quickItem.id);
        if (item && item.type === 'weapon') {
          // Create a copy with calculated attack values including all penalties
          const weaponData = foundry.utils.duplicate(item);
          const proficiencyPenalty = item.system.proficiencyPenalty || 0;
          const strengthPenalty = item.system.strengthPenalty || 0;
          const rangedWeaponPenalty = item.system.rangedWeaponPenalty || 0;
          
          // Check for weapon specialization bonus
          const weaponSpecializationBonus = this._getWeaponSpecializationBonus(item.system.weaponType);
          
          // Get weapon-specific effects (attack and damage bonuses)
          let weaponMeleeAttackBonus = 0;
          let weaponRangedAttackBonus = 0;
          let weaponBaseDamageBonus = 0;
          let weaponOtherDamageTypes = [];
          
          if (item.effects && item.effects.size > 0) {
            for (let effect of item.effects) {
              if (!effect.disabled && effect.changes) {
                for (let change of effect.changes) {
                  if (change.key === 'system.combat.meleeAttack.value') {
                    weaponMeleeAttackBonus += Number(change.value) || 0;
                  } else if (change.key === 'system.combat.rangedAttack.value') {
                    weaponRangedAttackBonus += Number(change.value) || 0;
                  } else if (change.key === 'system.damage.base') {
                    weaponBaseDamageBonus += Number(change.value) || 0;
                  } else if (change.key && change.key.startsWith('system.damage.') && change.key !== 'system.damage.base') {
                    const damageType = change.key.replace('system.damage.', '');
                    const value = Number(change.value) || 0;
                    if (value > 0) {
                      const localizedDamageType = this._getLocalizedDamageType(damageType);
                      weaponOtherDamageTypes.push(`+${value} ${localizedDamageType}`);
                    }
                  }
                }
              }
            }
          }

          // Calculate attack values: 
          // - Melee: all penalties apply + weapon-specific melee attack bonus
          // - Ranged: all penalties except ranged weapon penalty (which only affects melee) + weapon-specific ranged attack bonus
          weaponData.system.meleeAttackWithPenalty = this.actor.system.combat.melee.attack + proficiencyPenalty + strengthPenalty + rangedWeaponPenalty + weaponSpecializationBonus + weaponMeleeAttackBonus;
          weaponData.system.rangedAttackWithPenalty = this.actor.system.combat.ranged.attack + proficiencyPenalty + strengthPenalty + weaponSpecializationBonus + weaponRangedAttackBonus;
          
          // Recalculate weapon damage to ensure two-handed bonus is current
          const weaponCoefficient = item.system.damage?.coefficient || 0;
          let abilityMod = 0;
          
          // Check if dexterity should be ignored in damage calculation (e.g., drunk status)
          const ignoreDexterity = this.actor.system.other.ignoreDexterityInDamage || false;
          
          if (item.system.ability === 'dyn') {
            abilityMod = this.actor.system.abilities.dyn.mod || 0;
          } else if (item.system.ability === 'epi') {
            abilityMod = ignoreDexterity ? 0 : (this.actor.system.abilities.epi.mod || 0);
          } else if (item.system.ability === 'dyn_epi') {
            const dynMod = this.actor.system.abilities.dyn.mod || 0;
            const epiMod = ignoreDexterity ? 0 : (this.actor.system.abilities.epi.mod || 0);
            abilityMod = Math.max(dynMod, epiMod);
          }
          
          // Calculate two-handed damage bonus dynamically
          let twoHandedDamageBonus = 0;
          if (!item.system.isLight && !item.system.isRanged) {
            const shieldSlot = this.actor.system.equipment?.slots?.shield;
            const shieldSlotEmpty = !shieldSlot || !shieldSlot.id || shieldSlot.id.trim() === "";
            twoHandedDamageBonus = shieldSlotEmpty ? 1 : 0;
          }
          
          // Get weapon damage modifier from status effects
          const statusModifiers = this.actor._getStatusModifiers();
          const weaponDamageModifier = statusModifiers.other?.weaponDamage || 0;
          
          weaponData.system.weaponDamage = weaponCoefficient + abilityMod + twoHandedDamageBonus + weaponBaseDamageBonus + weaponDamageModifier;
          
          // Create damage display with additional damage types
          let damageDisplay = item.system.damageTypeDisplay || '';
          if (weaponOtherDamageTypes.length > 0) {
            if (damageDisplay) {
              damageDisplay += ', ' + weaponOtherDamageTypes.join(', ');
            } else {
              damageDisplay = weaponOtherDamageTypes.join(', ');
            }
          }
          
          // Preserve other weapon properties
          weaponData.system.damageTypeDisplay = damageDisplay;
          weaponData.system.range.displayText = item.system.range.displayText;
          weaponData.system.range.text = item.system.range.displayText;
          
          // Check if weapon has range capability (either multiplier OR fixed range > 0)
          const hasRange = (item.system.range?.multiplier || 0) > 0 || (item.system.range?.fixed || 0) > 0;
          weaponData.system.hasRange = hasRange;
          
          // Check if there are any penalties that should show red (weapon proficiency, strength, armor, shield, or encumbrance)
          // Note: ranged weapon penalty does NOT make numbers red as it's a design feature, not a real penalty
          const hasArmorPenalty = this.actor.system.hasArmorPenalty || false;
          const hasProficiencyPenalty = proficiencyPenalty < 0;
          const hasStrengthPenalty = strengthPenalty < 0;
          const hasShieldPenalty = this.actor.system.hasShieldPenalty || false;
          const hasEncumbrancePenalty = context.system.hasEncumbrancePenalty || false;
          weaponData.system.hasAnyNonShieldPenalty = hasArmorPenalty || hasProficiencyPenalty || hasStrengthPenalty || hasShieldPenalty || hasEncumbrancePenalty;
          
          context.quickWeapons.push(weaponData);
        }
      }
    }
    
    // Check shield slot for weapons
    const shieldSlot = this.actor.system.equipment?.slots?.shield;
    if (shieldSlot && shieldSlot.id) {
      const item = this.actor.items.get(shieldSlot.id);
      if (item && item.type === 'weapon') {
        // Check if character has Αμφιδέξιος skill (for off-hand penalty)
        const hasAmfidexios = this.actor.system.skills?.amfidexios?.hasSkill || false;
        
        // Check if character has Aspides skill (for shield proficiency)
        const hasAspidesSkill = this.actor.system.skills?.aspides?.hasSkill || false;
        
        // Calculate all penalties for shield slot weapon
        const weaponData = foundry.utils.duplicate(item);
        const proficiencyPenalty = item.system.proficiencyPenalty || 0;
        const strengthPenalty = item.system.strengthPenalty || 0;
        const rangedWeaponPenalty = item.system.rangedWeaponPenalty || 0;
        const offHandPenalty = hasAmfidexios ? 0 : -2;
        
        // Calculate shield proficiency penalty for shield weapons
        let shieldProficiencyPenalty = 0;
        if (!hasAspidesSkill) {
          const weaponType = item.system.weaponType;
          const isLight = item.system.isLight || false;
          
          if (weaponType === 'aspida_varia') {
            if (isLight) {
              // Light shield (Ασπίδες + ελαφρύ όπλο) without Aspides skill: -1/-1
              shieldProficiencyPenalty = -1;
            } else {
              // Heavy shield (Ασπίδες χωρίς ελαφρύ όπλο) without Aspides skill: -2/-2
              shieldProficiencyPenalty = -2;
            }
          }
        }
        
        // Total shield penalty is off-hand + proficiency
        const totalShieldPenalty = offHandPenalty + shieldProficiencyPenalty;
        
        // Check for weapon specialization bonus
        const weaponSpecializationBonus = this._getWeaponSpecializationBonus(item.system.weaponType);
        
        // Get weapon-specific effects (attack and damage bonuses)
        let weaponMeleeAttackBonus = 0;
        let weaponRangedAttackBonus = 0;
        let weaponBaseDamageBonus = 0;
        let weaponOtherDamageTypes = [];
        
        if (item.effects && item.effects.size > 0) {
          for (let effect of item.effects) {
            if (!effect.disabled && effect.changes) {
              for (let change of effect.changes) {
                if (change.key === 'system.combat.meleeAttack.value') {
                  weaponMeleeAttackBonus += Number(change.value) || 0;
                } else if (change.key === 'system.combat.rangedAttack.value') {
                  weaponRangedAttackBonus += Number(change.value) || 0;
                } else if (change.key === 'system.damage.base') {
                  weaponBaseDamageBonus += Number(change.value) || 0;
                } else if (change.key && change.key.startsWith('system.damage.') && change.key !== 'system.damage.base') {
                  const damageType = change.key.replace('system.damage.', '');
                  const value = Number(change.value) || 0;
                  if (value > 0) {
                    const localizedDamageType = this._getLocalizedDamageType(damageType);
                    weaponOtherDamageTypes.push(`+${value} ${localizedDamageType}`);
                  }
                }
              }
            }
          }
        }
        
        weaponData.system.shieldPenalty = totalShieldPenalty;
        
        // Calculate attack values: 
        // - Melee: all penalties apply + weapon-specific melee attack bonus
        // - Ranged: all penalties except ranged weapon penalty (which only affects melee) + weapon-specific ranged attack bonus
        weaponData.system.meleeAttackWithPenalty = this.actor.system.combat.melee.attack + proficiencyPenalty + strengthPenalty + rangedWeaponPenalty + totalShieldPenalty + weaponSpecializationBonus + weaponMeleeAttackBonus;
        weaponData.system.rangedAttackWithPenalty = this.actor.system.combat.ranged.attack + proficiencyPenalty + strengthPenalty + totalShieldPenalty + weaponSpecializationBonus + weaponRangedAttackBonus;
        
        // Recalculate weapon damage to ensure two-handed bonus is current
        const weaponCoefficient = item.system.damage?.coefficient || 0;
        let abilityMod = 0;
        
        // Check if dexterity should be ignored in damage calculation (e.g., drunk status)
        const ignoreDexterity = this.actor.system.other.ignoreDexterityInDamage || false;
        
        if (item.system.ability === 'dyn') {
          abilityMod = this.actor.system.abilities.dyn.mod || 0;
        } else if (item.system.ability === 'epi') {
          abilityMod = ignoreDexterity ? 0 : (this.actor.system.abilities.epi.mod || 0);
        } else if (item.system.ability === 'dyn_epi') {
          const dynMod = this.actor.system.abilities.dyn.mod || 0;
          const epiMod = ignoreDexterity ? 0 : (this.actor.system.abilities.epi.mod || 0);
          abilityMod = Math.max(dynMod, epiMod);
        }
        
        // Calculate two-handed damage bonus dynamically (always 0 for shield weapons since shield slot is occupied)
        let twoHandedDamageBonus = 0;
        // Note: Shield weapons never get two-handed bonus since shield slot is occupied
        
        // Get weapon damage modifier from status effects
        const statusModifiers = this.actor._getStatusModifiers();
        const weaponDamageModifier = statusModifiers.other?.weaponDamage || 0;
        
        weaponData.system.weaponDamage = weaponCoefficient + abilityMod + twoHandedDamageBonus + weaponBaseDamageBonus + weaponDamageModifier;
        
        // Create damage display with additional damage types
        let damageDisplay = item.system.damageTypeDisplay || '';
        if (weaponOtherDamageTypes.length > 0) {
          if (damageDisplay) {
            damageDisplay += ', ' + weaponOtherDamageTypes.join(', ');
          } else {
            damageDisplay = weaponOtherDamageTypes.join(', ');
          }
        }
        
        // Preserve other weapon properties
        weaponData.system.damageTypeDisplay = damageDisplay;
        weaponData.system.range.displayText = item.system.range.displayText;
        weaponData.system.range.text = item.system.range.displayText;
        
        // Check if weapon has range capability (either multiplier OR fixed range > 0)
        const hasRange = (item.system.range?.multiplier || 0) > 0 || (item.system.range?.fixed || 0) > 0;
        weaponData.system.hasRange = hasRange;
        
        // Check if there are any penalties that should show red (weapon proficiency, strength, armor, shield proficiency, or encumbrance, but NOT off-hand or ranged weapon)
        // Note: ranged weapon penalty and off-hand penalty do NOT make numbers red as they are design features, not real penalties
        const hasArmorPenalty = this.actor.system.hasArmorPenalty || false;
        const hasProficiencyPenalty = proficiencyPenalty < 0;
        const hasStrengthPenalty = strengthPenalty < 0;
        const hasShieldProficiencyPenalty = shieldProficiencyPenalty < 0;
        const hasEncumbrancePenalty = context.system.hasEncumbrancePenalty || false;
        weaponData.system.hasAnyNonShieldPenalty = hasArmorPenalty || hasProficiencyPenalty || hasStrengthPenalty || hasShieldProficiencyPenalty || hasEncumbrancePenalty;
        
        context.shieldWeapons.push(weaponData);
      }
    }
  }

  /**
   * Get localized damage type name
   */
  _getLocalizedDamageType(damageType) {
    const damageTypeMap = {
      'diatrisi': 'ANDRAGATHIMA.DamageDiatrisi',
      'kroysi': 'ANDRAGATHIMA.DamageKroysi', 
      'tomi': 'ANDRAGATHIMA.DamageTomi',
      'keravnos': 'ANDRAGATHIMA.DamageKeravnos',
      'oxy': 'ANDRAGATHIMA.DamageOxy',
      'fotia': 'ANDRAGATHIMA.DamageFotia',
      'psyxos': 'ANDRAGATHIMA.DamagePsyxos',
      'magiki': 'ANDRAGATHIMA.DamageMagiki',
      'synthlipsi': 'ANDRAGATHIMA.DamageSynthlipsi'
    };
    
    const localizationKey = damageTypeMap[damageType];
    if (localizationKey) {
      return game.i18n.localize(localizationKey);
    }
    
    // Fallback to the original damage type if no mapping found
    return damageType;
  }

  /**
   * Get weapon specialization bonus for a specific weapon type
   */
  _getWeaponSpecializationBonus(weaponType) {
    const eidikeysiOpla = this.actor.system.skills?.eidikeysi_sta_opla;
    
    if (!eidikeysiOpla?.hasSkill || !eidikeysiOpla?.category || !weaponType) {
      return 0;
    }
    
    // Check if the weapon type matches the specialization category
    if (weaponType === eidikeysiOpla.category) {
      return 2; // +2/+2 bonus for specialized weapon category
    }
    
    return 0;
  }

  /**
   * Organize and classify Items for Character sheets.
   */
  _prepareItems(context) {
    // Initialize containers.
    const weapons = [];
    const armor = [];
    const equipment = [];
    const skills = [];
    const allSpells = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: []
    };

    // Sort context.items by sort value to ensure proper ordering
    const sortedItems = Array.from(context.items).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    // Iterate through items, allocating to containers
    for (let i of sortedItems) {
      i.img = i.img || "icons/svg/item-bag.svg";
      
      // Append to respective lists
      if (i.type === 'weapon') {
        weapons.push(i);
      }
      else if (i.type === 'armor') {
        armor.push(i);
      }
      else if (i.type === 'equipment') {
        equipment.push(i);
      }
      else if (i.type === 'skill') {
        skills.push(i);
      }
      else if (i.type === 'spell') {
        allSpells.push(i);
        if (i.system.level != undefined) {
          spells[i.system.level].push(i);
        }
      }
    }

    // Assign and return
    context.weapons = weapons;
    context.armor = armor;
    context.equipment = equipment;
    context.skills = skills;
    
    // Prepare spell tooltips and check for insufficient effective degree
    const spellsWithTooltips = allSpells.map(spell => {
      const requirements = this._checkSpellRequirements(spell, context);
      return {
        ...spell,
        tooltip: this._createSpellTooltip(spell, requirements),
        isInsufficient: requirements.effectiveDegree <= 0
      };
    });
    
    context.spells = spellsWithTooltips; // Simple array for template
    context.spellsByLevel = spells; // Keep the old structure for compatibility
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Setup instant tooltips
    this._setupInstantTooltips(html);

    // Points tab lock/unlock toggle
    html.find('.points-lock-toggle').click(this._onPointsLockToggle.bind(this));
    
    // Experience points field (GM/Assistant only)
    html.find('.experience-points-field').change(this._onExperiencePointsChange.bind(this));
    
    // Update points tab state based on lock status
    this._updatePointsTabState(html);
    
    // Handle visibility of GM/Assistant controls
    this._updateGMControlsVisibility(html);
    
    // Update button states based on lock status only
    this._updateButtonStates(html);
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
    
    // Setup manual sticky behavior for points header

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));


    // Note: Inventory item deletion is handled by specific slot handlers (_onItemDelete for misc, _onRemoveItem for equipment/quick)

    // Active Effect management
    html.find(".effect-control").click(ev => this._onManageActiveEffect(ev));
    html.find(".add-effect-slot").click(ev => {
      this._hideTooltip(); // Hide tooltip when clicking
      this._onManageActiveEffect(ev);
    });
    html.find(".effect-delete").click(ev => {
      ev.stopPropagation(); // Prevent bubbling to parent effect slot
      this._hideTooltip(); // Hide tooltip when clicking
      this._onManageActiveEffect(ev);
    });
    html.find(".effect-slot.has-effect").click(ev => {
      this._hideTooltip(); // Hide tooltip when clicking
      this._onManageActiveEffect(ev);
    });
    
    // Add right-click toggle functionality for effects
    html.find(".effect-slot.has-effect").on("contextmenu", ev => {
      ev.preventDefault();
      this._hideTooltip(); // Hide tooltip when right-clicking
      this._onToggleActiveEffect(ev);
    });
    
    // Add right-click toggle functionality for weapons in quick slots and shield slot
    html.find(".item-slot[data-slot-type='quick'] .item-image-container").on("contextmenu", ev => {
      ev.preventDefault();
      this._onToggleWeaponDisplay(ev);
    });
    
    html.find(".item-slot[data-slot-type='shield'] .item-image-container").on("contextmenu", ev => {
      ev.preventDefault();
      this._onToggleWeaponDisplay(ev);
    });
    
    // Setup effect tooltips manually since they use data attributes
    html.find(".effect-slot[data-tooltip]").each((i, element) => {
      const $element = $(element);
      const tooltip = element.dataset.tooltip;
      
      if (tooltip) {
        // Remove any existing title to prevent double tooltips
        $element.removeAttr('title');
        
        // Remove any title attribute immediately
        $element.removeAttr('title');
        
        // Add custom tooltip behavior
        $element.on('mouseenter', (e) => {
          // Make sure no title attribute exists
          e.currentTarget.removeAttribute('title');
          this._showTooltip(e.currentTarget, tooltip);
        });
        
        $element.on('mouseleave', (e) => {
          this._hideTooltip();
        });
        
        // Prevent title attributes from being added
        $element.on('mouseover', (e) => {
          e.currentTarget.removeAttribute('title');
        });
      }
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
      
      // Make equipment slots draggable and add remove functionality
      this._makeSlotsDebug(html);
    }

    // Add dragstart listeners for quick slot images
    html.find('.item-slot img[draggable="true"][data-slot-type="quick"]').each((i, img) => {
      img.addEventListener("dragstart", this._onSlotDragStart.bind(this), false);
    });
    
    // Add dragstart listeners for equipment slot images  
    html.find('.item-slot img[draggable="true"]:not([data-slot-type="quick"])').each((i, img) => {
      img.addEventListener("dragstart", this._onSlotDragStart.bind(this), false);
    });
    
    // Add dragstart listeners for misc equipment slots
    html.find('.misc-equipment-slot .item-image[draggable="true"]').each((i, img) => {
      img.addEventListener("dragstart", this._onMiscSlotDragStart.bind(this), false);
    });

    // Handle ability score changes
    html.find('.ability-score').change(this._onAbilityChange.bind(this));

    // Handle race selection
    html.find('.race-select').change(this._onRaceChange.bind(this));
    
    // Handle race dropdown in Points tab (for skills only)
    html.find('.race-dropdown').change(this._onRaceSkillsChange.bind(this));
    
    // Handle size dropdown for NPCs (both in Overview and Points tabs)
    html.find('.size-dropdown').change(this._onSizeChange.bind(this));
    
    // Handle target numbers toggle for NPCs
    html.find('.target-numbers-checkbox').change(this._onTargetNumbersToggle.bind(this));
    
    // Handle hide stats from players toggle for NPCs
    html.find('.hide-stats-checkbox').change(this._onHideStatsToggle.bind(this));
    
    // Handle element dropdown selection
    html.find('.element-dropdown').change(this._onElementChange.bind(this));

    // Miscellaneous weight is now handled by item slots

    // Quick item actions
    html.find('.item-quantity').click(this._onItemQuantityChange.bind(this));
    html.find('.item-equip').click(this._onItemEquip.bind(this));
    html.find('.item-charge').click(this._onItemCharge.bind(this));

    // Handle delete buttons for misc equipment items only
    html.find('.misc-equipment-grid .misc-equipment-slot .item-delete').click(this._onItemDelete.bind(this));
    
    // For containers, handle the visible remove button
    if (this.actor.type === 'container') {
      html.find('.remove-item-btn').on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Get the item ID from the associated .item-delete button
        const slot = $(event.currentTarget).closest('.misc-equipment-slot');
        const itemDeleteBtn = slot.find('.item-delete');
        const itemId = itemDeleteBtn.data('item-id');
        
        if (itemId) {
          // Create a fake event with the correct target for _onItemDelete
          const fakeEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
            currentTarget: { dataset: { itemId: itemId } }
          };
          this._onItemDelete(fakeEvent);
        }
      });
    }
    
    // Add custom tooltips for misc equipment delete buttons
    html.find('.misc-equipment-grid .misc-equipment-slot .item-delete').on('mouseenter', (event) => {
      const deleteText = game.i18n.localize("ANDRAGATHIMA.Delete");
      this._showTooltip(event.currentTarget, deleteText);
    }).on('mouseleave', (event) => {
      this._hideTooltip();
    });
    
    
    // Handle clicking on misc equipment items to open properties
    html.find('.misc-equipment-slot').click(this._onMiscSlotClick.bind(this));
    
    // Handle clicking on quick items to open properties
    html.find('.item-slot[data-slot-type="quick"]').click(this._onQuickSlotClick.bind(this));

    // Ability increase/decrease buttons
    html.find('.ability-increase').click(this._onAbilityIncrease.bind(this));
    html.find('.ability-decrease').click(this._onAbilityDecrease.bind(this));

    // Save increase/decrease buttons
    html.find('.save-increase').click(this._onSaveIncrease.bind(this));
    html.find('.save-decrease').click(this._onSaveDecrease.bind(this));

    // Combat increase/decrease buttons
    html.find('.combat-increase').click(this._onCombatIncrease.bind(this));
    html.find('.combat-decrease').click(this._onCombatDecrease.bind(this));

    // Skill increase/decrease buttons
    html.find('.skill-increase').click(this._onSkillIncrease.bind(this));
    html.find('.skill-decrease').click(this._onSkillDecrease.bind(this));

    // Magic increase/decrease buttons
    html.find('.magic-increase').click(this._onMagicIncrease.bind(this));
    html.find('.magic-decrease').click(this._onMagicDecrease.bind(this));


    html.find('.spell-slot .item-delete').click(this._onSpellDelete.bind(this));
    html.find('.spell-slot').click(this._onSpellItemClick.bind(this));

    // Add dragstart listeners for spell items
    html.find('.spell-slot img[draggable="true"]').each((i, img) => {
      img.addEventListener("dragstart", this._onSpellDragStart.bind(this), false);
    });

    // Add drop listeners for spell slots
    html.find('.spell-slot').each((i, slot) => {
      slot.addEventListener("dragover", this._onSpellDragOver.bind(this), false);
      slot.addEventListener("drop", this._onSpellDrop.bind(this), false);
    });

    // Character art click for changing image
    html.find('.character-art').click(this._onCharacterArtClick.bind(this));

    // Magic tab disabled click handler
    html.find('.tab.magic.magic-disabled').click(this._onMagicDisabledClick.bind(this));
    
    // Tab navigation sound effects
    html.find('.tab-btn[data-tab]').click(this._onTabClick.bind(this));
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }

    // Handle ability checks
    if (dataset.ability) {
      return this._rollAbilityCheck(dataset);
    }

    // Handle saving throws
    if (dataset.save) {
      return this.actor.rollSave(dataset.save);
    }

    // Handle attack rolls
    if (dataset.attack) {
      const isRanged = dataset.attack === 'ranged';
      return this.actor.rollAttack({ ranged: isRanged });
    }

    // Handle new roll types based on rollType dataset
    switch (dataset.rollType) {
      case 'ability':
        return this._rollAbilityCheck(dataset);
      case 'save':
        return this._rollSave(dataset);
      case 'defense':
        return this._rollDefense(dataset);
      case 'resistance':
        return this._rollResistance(dataset);
      case 'grapple':
        return this._rollGrapple();
      case 'stability':
        return this._rollStability();
      case 'initiative':
        return this._rollInitiative();
      case 'attack':
        return this._rollWeaponAttack(dataset);
      case 'weapon-attack':
        return this._rollWeaponAttack(dataset);
      case 'damage':
        return this._rollWeaponDamage(dataset);
      case 'weapon-damage':
        return this._rollWeaponDamage(dataset);
    }
  }

  /**
   * Roll Defense
   */
  async _rollDefense(dataset) {
    const isRanged = dataset.defenseType === 'ranged';
    
    const label = isRanged ? 
      game.i18n.localize('ANDRAGATHIMA.DefenseRangedRoll') : 
      game.i18n.localize('ANDRAGATHIMA.DefenseMeleeRoll');
    
    // Target numbers toggle only affects display, calculations remain the same
    const modifier = isRanged ? 
      this.actor.system.combat.ranged.defense || 0 :
      this.actor.system.combat.melee.defense || 0;
    
    return await AndragathimaRoll.basicRoll({
      label: label,
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Roll Resistance
   */
  async _rollResistance(dataset) {
    if (dataset.resistanceType === 'specialized') {
      // For specialized resistance, add base resistance
      const baseResistance = this.actor.system.baseResistance || 0;
      const specializedValue = parseInt(dataset.resistanceValue) || 0;
      const totalModifier = baseResistance + specializedValue;
      
      // Convert to genitive case for proper Greek grammar
      let resistanceLabel = dataset.resistanceLabel;
      if (resistanceLabel.includes('Διάτρηση')) resistanceLabel = resistanceLabel.replace('Διάτρηση', 'Διάτρησης');
      if (resistanceLabel.includes('Τομή')) resistanceLabel = resistanceLabel.replace('Τομή', 'Τομής');
      if (resistanceLabel.includes('Κρούση')) resistanceLabel = resistanceLabel.replace('Κρούση', 'Κρούσης');
      if (resistanceLabel.includes('Φωτιά')) resistanceLabel = resistanceLabel.replace('Φωτιά', 'Φωτιάς');
      if (resistanceLabel.includes('Κρύο')) resistanceLabel = resistanceLabel.replace('Κρύο', 'Κρύου');
      if (resistanceLabel.includes('Ηλεκτρισμός')) resistanceLabel = resistanceLabel.replace('Ηλεκτρισμός', 'Ηλεκτρισμού');
      if (resistanceLabel.includes('Οξύ')) resistanceLabel = resistanceLabel.replace('Οξύ', 'Οξέος');
      
      return await AndragathimaRoll.basicRoll({
        label: `${game.i18n.localize('ANDRAGATHIMA.ResistanceRoll')} ${resistanceLabel}`,
        modifier: totalModifier,
        targetNumber: 11,
        actor: this.actor
      });
    } else {
      // Base resistance - target numbers toggle only affects display
      const modifier = this.actor.system.baseResistance || 0;
      return await AndragathimaRoll.basicRoll({
        label: game.i18n.localize('ANDRAGATHIMA.ResistanceRoll'),
        modifier: modifier,
        targetNumber: 11,
        actor: this.actor
      });
    }
  }

  /**
   * Roll Grapple
   */
  async _rollGrapple() {
    // Target numbers toggle only affects display, calculations remain the same
    const modifier = this.actor.system.combat.pali.value || 0;
    return await AndragathimaRoll.basicRoll({
      label: game.i18n.localize('ANDRAGATHIMA.GrappleDiceLabel'),
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Roll Stability
   */
  async _rollStability() {
    // Target numbers toggle only affects display, calculations remain the same
    const modifier = this.actor.system.combat.eystatheia.value || 0;
    return await AndragathimaRoll.basicRoll({
      label: game.i18n.localize('ANDRAGATHIMA.StabilityDiceLabel'),
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Roll Initiative
   */
  async _rollInitiative() {
    // Target numbers toggle only affects display, calculations remain the same
    const modifier = this.actor.system.combat.initiative.value || 0;
    return await AndragathimaRoll.basicRoll({
      label: game.i18n.localize('ANDRAGATHIMA.Initiative'),
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Roll Weapon Attack
   */
  async _rollWeaponAttack(dataset) {
    const itemId = dataset.itemId;
    
    // Find weapon in quickWeapons or shieldWeapons (where attack values are calculated)
    const context = await this.getData();
    let weaponData = null;
    
    // Check quickWeapons first
    weaponData = context.quickWeapons?.find(w => w._id === itemId);
    
    // If not found, check shieldWeapons
    if (!weaponData) {
      weaponData = context.shieldWeapons?.find(w => w._id === itemId);
    }
    
    if (!weaponData) {
      console.error(`Weapon not found in quickWeapons or shieldWeapons: ${itemId}`);
      return;
    }

    const isRanged = dataset.attackType === 'ranged';
    
    // Use the final displayed attack value 
    let modifier;
    if (isRanged) {
      modifier = weaponData.system.rangedAttackWithPenalty || 0;
    } else {
      modifier = weaponData.system.meleeAttackWithPenalty || 0;
    }
    
    console.log(`Weapon Attack Debug:`, {
      itemName: weaponData.name,
      isRanged,
      modifier,
      meleeValue: weaponData.system.meleeAttackWithPenalty,
      rangedValue: weaponData.system.rangedAttackWithPenalty
    });
    
    const label = isRanged ? 
      `${weaponData.name} - ${game.i18n.localize('ANDRAGATHIMA.RangedAttack')}` : 
      `${weaponData.name} - ${game.i18n.localize('ANDRAGATHIMA.MeleeAttack')}`;
    
    // Target numbers toggle only affects display, calculations remain the same
    return await AndragathimaRoll.basicRoll({
      label: label,
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Roll Weapon Damage
   */
  async _rollWeaponDamage(dataset) {
    const itemId = dataset.itemId;
    
    // Find weapon in quickWeapons or shieldWeapons (where damage values are calculated)
    const context = await this.getData();
    let weaponData = null;
    
    // Check quickWeapons first
    weaponData = context.quickWeapons?.find(w => w._id === itemId);
    
    // If not found, check shieldWeapons
    if (!weaponData) {
      weaponData = context.shieldWeapons?.find(w => w._id === itemId);
    }
    
    if (!weaponData) {
      console.error(`Weapon not found in quickWeapons or shieldWeapons: ${itemId}`);
      return;
    }

    // Use the final displayed damage value 
    const modifier = weaponData.system.weaponDamage || 0;
    const damageTypeDisplay = weaponData.system.damageTypeDisplay || "";
    
    console.log(`Weapon Damage Debug:`, {
      itemName: weaponData.name,
      modifier,
      weaponDamage: weaponData.system.weaponDamage,
      damageTypeDisplay
    });
    
    // Convert damage type to genitive case for proper Greek grammar
    let damageTypeGenitive = damageTypeDisplay;
    if (damageTypeGenitive.includes('Τομή')) damageTypeGenitive = damageTypeGenitive.replace('Τομή', 'Τομής');
    if (damageTypeGenitive.includes('Διάτρηση')) damageTypeGenitive = damageTypeGenitive.replace('Διάτρηση', 'Διάτρησης');
    if (damageTypeGenitive.includes('Κρούση')) damageTypeGenitive = damageTypeGenitive.replace('Κρούση', 'Κρούσης');
    
    // Target numbers toggle only affects display, calculations remain the same
    return await AndragathimaRoll.basicRoll({
      label: `${weaponData.name} - Ζημιά ${damageTypeGenitive}`,
      modifier: modifier,
      targetNumber: 11,
      actor: this.actor
    });
  }

  /**
   * Handle ability score changes
   */
  async _onAbilityChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const ability = element.dataset.ability;
    const value = parseInt(element.value) || 10;
    
    // Update the ability score
    const updatePath = `system.abilities.${ability}.value`;
    await this.actor.update({ [updatePath]: value });
  }

  /**
   * Handle race selection changes
   */
  async _onRaceChange(event) {
    event.preventDefault();
    const race = event.currentTarget.value;
    
    // Get current and new race data
    const currentRace = this.actor.system.details.race.value;
    const currentRaceData = CONFIG.ANDRAGATHIMA.raceModifiers[currentRace] || { abilities: {} };
    const newRaceData = CONFIG.ANDRAGATHIMA.raceModifiers[race] || { abilities: {} };
    
    // Prepare updates object
    const updates = { "system.details.race.value": race };
    
    // For each ability, calculate what the new base value should be to maintain 6-25 limits
    for (let abilityKey of ['dyn', 'epi', 'kra', 'eyf', 'sof', 'xar']) {
      const currentBaseValue = this.actor.system.abilities[abilityKey].value;
      const currentRacialMod = currentRaceData.abilities[abilityKey] || 0;
      const newRacialMod = newRaceData.abilities[abilityKey] || 0;
      
      // Calculate the current total value (what player sees)
      const currentTotalValue = currentBaseValue + currentRacialMod;
      
      // We want to keep the same total value if possible, so calculate new base
      let newBaseValue = currentTotalValue - newRacialMod;
      
      // But ensure the new total stays within 6-25 limits
      const newTotalValue = newBaseValue + newRacialMod;
      
      if (newTotalValue < 6) {
        newBaseValue = 6 - newRacialMod;
      } else if (newTotalValue > 25) {
        newBaseValue = 25 - newRacialMod;
      }
      
      // Only update if the base value needs to change
      if (newBaseValue !== currentBaseValue) {
        updates[`system.abilities.${abilityKey}.value`] = newBaseValue;
      }
    }
    
    // Update the race and any adjusted abilities
    await this.actor.update(updates);
    
    // The prepareData method will handle applying racial modifiers
    this.render();
  }

  /**
   * Handle race skills changes from Points tab dropdown
   */
  async _onRaceSkillsChange(event) {
    event.preventDefault();
    const newRace = event.currentTarget.value;
    const currentRace = this.actor.system.details?.race?.value;
    
    if (newRace === currentRace) return;
    
    const updates = {};
    let totalExperienceCost = 0;
    let experienceRefund = 0;
    
    // First, apply skills from new race
    const newRaceData = CONFIG.ANDRAGATHIMA.raceModifiers[newRace];
    if (newRaceData?.skills) {
      totalExperienceCost = this._applyRaceSkills(newRaceData.skills, updates);
    }
    
    // Then, clean up skills from previous race
    if (currentRace) {
      const oldRaceData = CONFIG.ANDRAGATHIMA.raceModifiers[currentRace];
      if (oldRaceData?.skills) {
        experienceRefund = this._removeRaceSkills(oldRaceData.skills, updates, newRaceData?.skills);
      }
    }
    
    // Update experience points
    const netCost = totalExperienceCost - experienceRefund;
    if (netCost !== 0) {
      const currentSpent = this.actor.system.details?.experience?.spent || 0;
      updates[`system.details.experience.spent`] = Math.max(0, currentSpent + netCost);
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
      
      // Show notification
      if (totalExperienceCost > 0 || experienceRefund > 0) {
        let message = '';
        if (experienceRefund > 0) {
          message += `Αφαιρέθηκαν δεξιότητες παλιού γένους (Επιστροφή: ${experienceRefund} πόντοι). `;
        }
        if (totalExperienceCost > 0) {
          message += `Εφαρμόστηκαν δεξιότητες νέου γένους (Κόστος: ${totalExperienceCost} πόντοι).`;
        }
        ui.notifications.info(message);
      }
    }
  }

  /**
   * Handle size selection changes for NPCs
   */
  async _onSizeChange(event) {
    event.preventDefault();
    const size = event.currentTarget.value;
    
    // Only apply to NPCs
    if (this.actor.type !== 'npc') return;
    
    // Update the size
    await this.actor.update({ "system.details.size.value": size });
    
    // Update token dimensions for all linked tokens
    const tokenDimensions = CONFIG.ANDRAGATHIMA.tokenDimensions[size];
    if (tokenDimensions && this.actor.prototypeToken) {
      // Update prototype token
      await this.actor.update({
        "prototypeToken.width": tokenDimensions.width,
        "prototypeToken.height": tokenDimensions.height
      });
      
      // Update all existing tokens on scenes
      const tokens = this.actor.getActiveTokens();
      for (const token of tokens) {
        await token.document.update({
          width: tokenDimensions.width,
          height: tokenDimensions.height
        });
      }
    }
    
    // The prepareData method will handle applying size modifiers
    this.render();
  }

  /**
   * Handle target numbers toggle for NPCs
   */
  async _onTargetNumbersToggle(event) {
    event.preventDefault();
    const useTargetNumbers = event.currentTarget.checked;
    
    // Only apply to NPCs
    if (this.actor.type !== 'npc') return;
    
    // Update the flag
    await this.actor.update({ 
      "flags.andragathima.useTargetNumbers": useTargetNumbers 
    });
    
    // Re-render to update the display
    this.render(false);
  }

  async _onHideStatsToggle(event) {
    event.preventDefault();
    const hideStatsFromPlayers = event.currentTarget.checked;
    
    // Only apply to NPCs
    if (this.actor.type !== 'npc') return;
    
    // Update the flag
    await this.actor.update({ 
      "flags.andragathima.hideStatsFromPlayers": hideStatsFromPlayers 
    });
    
    // Re-render to update the display
    this.render(false);
  }

  /**
   * Handle element dropdown changes
   */
  async _onElementChange(event) {
    event.preventDefault();
    const element = event.currentTarget.value;
    
    // Update the element
    await this.actor.update({ "system.magic.element.value": element });
  }

  /**
   * Handle item quantity changes
   */
  async _onItemQuantityChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    const action = element.dataset.action;
    
    if (!item) return;
    
    const quantity = item.system.quantity || 0;
    let newQuantity = quantity;
    
    if (action === 'increase') newQuantity = quantity + 1;
    else if (action === 'decrease') newQuantity = Math.max(0, quantity - 1);
    
    await item.update({ "system.quantity": newQuantity });
  }

  /**
   * Handle toggling item equipped state
   */
  async _onItemEquip(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const equipped = item.system.equipped || false;
    await item.update({ "system.equipped": !equipped });
  }

  /**
   * Handle item charge usage
   */
  async _onItemCharge(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    const action = element.dataset.action;
    
    if (!item || !item.system.charges) return;
    
    const charges = item.system.charges.value || 0;
    const maxCharges = item.system.charges.max || 0;
    let newCharges = charges;
    
    if (action === 'use') newCharges = Math.max(0, charges - 1);
    else if (action === 'restore') newCharges = Math.min(maxCharges, charges + 1);
    
    await item.update({ "system.charges.value": newCharges });
  }

  /**
   * Handle ability score increase
   */
  async _onAbilityIncrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const ability = event.currentTarget.dataset.ability;
    const currentValue = this.actor.system.abilities[ability].value;
    
    // Get the appropriate modifier based on actor type
    let currentMod = 0;
    if (this.actor.type === 'character') {
      currentMod = this.actor.system.abilities[ability].racialMod || 0;
    } else if (this.actor.type === 'npc') {
      // NPCs don't have racialMod, they use size modifiers applied directly to combat stats
      currentMod = 0;
    }
    
    const currentTotal = currentValue + currentMod;
    
    // Check limits based on actor type
    const maxValue = this.actor.type === 'npc' ? 50 : 25;
    if (currentTotal >= maxValue) {
      const message = this.actor.type === 'npc' ? 
        game.i18n.localize('ANDRAGATHIMA.AbilityCannotExceed50') : 
        game.i18n.localize('ANDRAGATHIMA.AbilityCannotExceed25');
      ui.notifications.warn(message);
      return;
    }
    
    const newValue = currentValue + 1;
    
    await this.actor.update({ 
      [`system.abilities.${ability}.value`]: newValue
    });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
      
      // Update experience display and button states after render
      setTimeout(() => {
        this._updateAvailableExperienceDisplay();
      }, 10);
    }
  }

  /**
   * Handle ability score decrease
   */
  async _onAbilityDecrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const ability = event.currentTarget.dataset.ability;
    const currentValue = this.actor.system.abilities[ability].value;
    
    // Get the appropriate modifier based on actor type
    let currentMod = 0;
    if (this.actor.type === 'character') {
      currentMod = this.actor.system.abilities[ability].racialMod || 0;
    } else if (this.actor.type === 'npc') {
      // NPCs don't have racialMod, they use size modifiers applied directly to combat stats
      currentMod = 0;
    }
    
    const currentTotal = currentValue + currentMod;
    
    // Check limits based on actor type  
    const minValue = this.actor.type === 'npc' ? 0 : 6;
    if (currentTotal <= minValue) {
      const message = this.actor.type === 'npc' ? 
        game.i18n.localize('ANDRAGATHIMA.AbilityCannotGoBelowZero') : 
        game.i18n.localize('ANDRAGATHIMA.AbilityCannotGoBelow6');
      ui.notifications.warn(message);
      return;
    }
    
    const newValue = currentValue - 1;
    const updatePath = `system.abilities.${ability}.value`;
    await this.actor.update({ [updatePath]: newValue });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
  }

  /**
   * Handle save increase
   */
  async _onSaveIncrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const save = event.currentTarget.dataset.save;
    const currentBase = this.actor.system.saves[save].base;
    
    // Check if already at maximum
    if (currentBase >= 20) {
      ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.SaveCannotExceed20'));
      return;
    }
    
    
    const newBase = currentBase + 1;
    
    await this.actor.update({ 
      [`system.saves.${save}.base`]: newBase
    });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
      
      // Update experience display and button states after render
      setTimeout(() => {
        this._updateAvailableExperienceDisplay();
      }, 10);
    }
  }

  /**
   * Handle save decrease
   */
  async _onSaveDecrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const save = event.currentTarget.dataset.save;
    const currentBase = this.actor.system.saves[save].base;
    const newBase = Math.max(0, currentBase - 1);
    
    const updatePath = `system.saves.${save}.base`;
    await this.actor.update({ [updatePath]: newBase });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
  }

  /**
   * Handle combat stat increase
   */
  async _onCombatIncrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const combat = event.currentTarget.dataset.combat; // melee or ranged
    const currentValue = this.actor.system.combat[combat].value;
    
    // Check if already at maximum
    if (currentValue >= 20) {
      ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.CombatSkillCannotExceed20'));
      return;
    }
    
    
    const newValue = currentValue + 1;
    
    await this.actor.update({ 
      [`system.combat.${combat}.value`]: newValue
    });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
      
      // Update experience display and button states after render
      setTimeout(() => {
        this._updateAvailableExperienceDisplay();
      }, 10);
    }
  }

  /**
   * Handle combat stat decrease
   */
  async _onCombatDecrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const combat = event.currentTarget.dataset.combat; // melee or ranged
    const currentValue = this.actor.system.combat[combat].value;
    const newValue = Math.max(0, currentValue - 1);
    
    const updatePath = `system.combat.${combat}.value`;
    await this.actor.update({ [updatePath]: newValue });
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
  }

  /**
   * Handle skill increase
   */
  async _onSkillIncrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const skillKey = event.currentTarget.dataset.skill;
    const skill = this.actor.system.skills[skillKey];
    
    if (!skill) return;
    
    // Check if skill is already at max level
    if (skill.hasSkill && skill.level >= skill.maxLevel) {
      ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.SkillAlreadyAtMaxLevel'));
      return;
    }
    
    
    if (!skill.hasSkill) {
      // First time getting this skill
      const updates = {
        [`system.skills.${skillKey}.hasSkill`]: true,
        [`system.skills.${skillKey}.level`]: 1
      };
      await this.actor.update(updates);
    } else {
      // Increase skill level
      const newLevel = skill.level + 1;
      await this.actor.update({ [`system.skills.${skillKey}.level`]: newLevel });
    }
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
      
      // Update experience display and button states after render
      setTimeout(() => {
        this._updateAvailableExperienceDisplay();
      }, 10);
    }
  }

  /**
   * Handle skill decrease
   */
  async _onSkillDecrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const skillKey = event.currentTarget.dataset.skill;
    const skill = this.actor.system.skills[skillKey];
    
    if (!skill || !skill.hasSkill) return;
    
    if (skill.level > 1) {
      // Decrease skill level
      const newLevel = skill.level - 1;
      await this.actor.update({ [`system.skills.${skillKey}.level`]: newLevel });
    } else {
      // Remove skill completely
      const updates = {
        [`system.skills.${skillKey}.hasSkill`]: false,
        [`system.skills.${skillKey}.level`]: 0
      };
      await this.actor.update(updates);
    }
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
  }

  /**
   * Handle management of ActiveEffects
   * @param {Event} event   The originating click event
   * @private
   */

  /**
   * Handle character art click to change image
   */
  async _onCharacterArtClick(event) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: path => {
        // Validate that the path has a valid image extension
        if (path && typeof path === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path)) {
          this.actor.update({"img": path});
        } else {
          ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.PleaseSelectValidImage'));
        }
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    return fp.browse();
  }



  /**
   * Handle dropping items onto equipment slots
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData ? 
      foundry.applications.ux.TextEditor.implementation.getDragEventData(event) :
      TextEditor.getDragEventData(event);
    
    // Only handle item drops
    if (data.type !== "Item") {
      return super._onDrop(event);
    }
    
    // Check if dropped on an equipment slot, misc equipment slot, or container slot
    const equipmentSlot = event.target.closest('.item-slot[data-slot-type]:not([data-slot-type="misc"])');
    const miscSlot = event.target.closest('.misc-equipment-slot, .item-slot[data-slot-type="misc"]');
    
    
    if (equipmentSlot) {
      const slotType = equipmentSlot.dataset.slotType;
      if (!slotType) {
        return super._onDrop(event);
      }
      return this._handleEquipmentSlotDrop(event, equipmentSlot, slotType, data);
    }
    
    if (miscSlot) {
      const slotIndex = parseInt(miscSlot.dataset.slotIndex);
      return this._handleMiscSlotDrop(event, miscSlot, slotIndex, data);
    }
    
    // If dropped outside specific slots, try to put in first available misc slot
    const miscEquipmentSlots = this._getMiscEquipmentSlots();
    const firstEmptySlot = miscEquipmentSlots.findIndex(slot => slot === null);
    
    if (firstEmptySlot !== -1) {
      return this._handleMiscSlotDrop(event, null, firstEmptySlot, data);
    }
    
    // If no misc slots available, handle the drop manually to ensure move behavior
    return this._handleGenericItemDrop(data);
  }

  /**
   * Handle generic item drop with move behavior
   */
  async _handleGenericItemDrop(data) {
    // Get the item being dropped
    let item = null;
    if (data.uuid) {
      item = await fromUuid(data.uuid);
    } else if (data.id) {
      item = game.items.get(data.id);
    }
    
    if (!item) {
      return;
    }
    
    // Move item if it doesn't belong to this actor (instead of copying)
    if (item.parent !== this.actor) {
      const sourceActor = item.parent;
      const itemData = item.toObject();
      
      try {
        // Create the item in the destination actor FIRST
        const newItem = await Item.create(itemData, {parent: this.actor});
        
        // Only delete the original if creation was successful
        if (newItem && sourceActor) {
          // Clear the item from any quick slots or equipment slots in source actor
          await this._clearItemFromSourceActor(sourceActor, item.id);
          
          // Then delete the actual item
          await item.delete();
          
          // Force refresh of source actor's sheet to update UI
          if (sourceActor.sheet && sourceActor.sheet.rendered) {
            setTimeout(() => {
              if (sourceActor.sheet && sourceActor.sheet.rendered) {
                sourceActor.sheet.render(false);
              }
            }, 10);
          }
        }
        
        item = newItem;
      } catch (error) {
        console.error('Failed to move item:', error);
        // If creation fails, don't delete the original
        return;
      }
    }
    
    // Force refresh of destination actor's sheet to update UI
    if (this.rendered) {
      this.render(false);
    }
    
    return item;
  }

  /**
    
    // Prepare update data
    const updateData = {};
    
    // Create a copy of current quickItems array to modify it properly
    let quickItems = [...(this.actor.system.equipment.quickItems || [])];
    
    // Ensure we have 8 slots with valid default values
    while (quickItems.length < 8) {
      quickItems.push({"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""});
    }
    
    // Fix any invalid img paths in existing slots
    quickItems = quickItems.map(item => ({
      name: item.name || "",
      img: (item.img && item.img.includes('.')) ? item.img : "icons/svg/item-bag.svg",
      id: item.id || "",
      type: item.type || ""
    }));
    
    // If dragged from another slot, clear the source slot
    if (data.slotType) {
      const sourceSlotType = data.slotType;
      if (sourceSlotType === 'quick' && data.slotIndex !== undefined) {
        const sourceIndex = parseInt(data.slotIndex);
        if (sourceIndex >= 0 && sourceIndex < quickItems.length) {
          quickItems[sourceIndex] = {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
        }
      } else {
        updateData[`system.equipment.slots.${sourceSlotType}.name`] = "";
        updateData[`system.equipment.slots.${sourceSlotType}.img`] = "icons/svg/item-bag.svg";
        updateData[`system.equipment.slots.${sourceSlotType}.id`] = "";
        updateData[`system.equipment.slots.${sourceSlotType}.type`] = "";
      }
    }
    
    // Handle the target slot
    if (slotType === 'quick') {
      const slotIndex = parseInt(slot.dataset.slotIndex);
      if (slotIndex >= 0 && slotIndex < quickItems.length) {
        // Set the item in the target slot
        quickItems[slotIndex] = {
          "name": item.name,
          "img": item.img,
          "id": item.id,
          "type": item.type
        };
      }
      // Update the entire quickItems array
      updateData[`system.equipment.quickItems`] = quickItems;
    } else {
      // Regular equipment slots
      updateData[`system.equipment.slots.${slotType}.name`] = item.name;
      updateData[`system.equipment.slots.${slotType}.img`] = item.img;
      updateData[`system.equipment.slots.${slotType}.id`] = item.id;
      updateData[`system.equipment.slots.${slotType}.type`] = item.type;
    }
    
    await this.actor.update(updateData);
    
    return item;
  }

  /**
   * Handle dragging items from misc equipment slots
   */
  _onMiscSlotDragStart(event) {
    const img = event.currentTarget;
    const itemId = img.dataset.itemId;
    const slotType = img.dataset.slotType;
    const slotIndex = img.dataset.slotIndex;
    
    if (!itemId) return;
    
    // Get the item from the actor
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    const dragData = {
      type: "Item",
      uuid: item.uuid,
      slotType: slotType,
      slotIndex: slotIndex
    };
    
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Handle dragging items from equipment slots
   */
  _onSlotDragStart(event) {
    const img = event.currentTarget;
    const slotType = img.dataset.slotType;
    const itemId = img.dataset.itemId;
    
    if (!slotType || !itemId) return;
    
    // Get the item from the actor
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    let dragData = {
      type: "Item",
      uuid: item.uuid,
      slotType: slotType
    };
    
    // Add slot index for quick slots
    if (slotType === 'quick' && img.dataset.slotIndex !== undefined) {
      dragData.slotIndex = img.dataset.slotIndex;
    }
    
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Make equipment slots draggable after updates
   */
  _makeSlotsDebug(html) {
    if (!this.actor.isOwner) return;
    
    // Handle misc equipment slots dragging
    html.find('.misc-equipment-slot .item-image[draggable]').each((i, img) => {
      // Remove old listeners first
      img.removeEventListener("dragstart", this._onMiscSlotDragStart);
      // Add new listener
      img.addEventListener("dragstart", ev => this._onMiscSlotDragStart(ev), false);
    });
    
    // Remove old event listeners and re-add them
    html.find('.item-slot').each((i, slot) => {
      const slotType = slot.dataset.slotType;
      if (slotType) {
        let hasItem = false;
        
        if (slotType === 'quick') {
          const slotIndex = parseInt(slot.dataset.slotIndex);
          const quickItems = this.actor.system.equipment?.quickItems || [];
          const slotData = quickItems[slotIndex];
          hasItem = slotData && slotData.name && slotData.id && slotData.name.trim() !== "" && slotData.id.trim() !== "";
        } else if (slotType === 'misc') {
          // Handle misc slots separately - they use the miscSlotIndex system
          const slotIndex = parseInt(slot.dataset.slotIndex);
          const miscSlots = this._getMiscEquipmentSlots();
          hasItem = miscSlots[slotIndex] != null;
        } else {
          const slotData = this.actor.system.equipment?.slots?.[slotType];
          hasItem = slotData && slotData.name && slotData.id && slotData.name.trim() !== "" && slotData.id.trim() !== "";
        }
        
        if (hasItem) {
          slot.setAttribute("draggable", true);
          slot.classList.add("has-item");
          
          // Remove old listeners first
          slot.removeEventListener("dragstart", this._onSlotDragStart);
          
          // Add new listeners
          slot.addEventListener("dragstart", ev => this._onSlotDragStart(ev), false);
          
          // Add remove button if not already present
          let removeBtn = slot.querySelector('.remove-item-btn');
          if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.className = 'remove-item-btn';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.dataset.slotType = slotType;
            if (slotType === 'quick') {
              removeBtn.dataset.slotIndex = slot.dataset.slotIndex;
            }
            slot.appendChild(removeBtn);
          }
          
          // Remove old listeners and add new ones
          removeBtn.removeEventListener("click", this._onRemoveItem);
          removeBtn.addEventListener("click", ev => this._onRemoveItem(ev), false);
          
          // Add custom tooltip behavior
          removeBtn.removeEventListener("mouseenter", this._onRemoveButtonMouseEnter);
          removeBtn.removeEventListener("mouseleave", this._onRemoveButtonMouseLeave);
          removeBtn.addEventListener("mouseenter", ev => this._onRemoveButtonMouseEnter(ev), false);
          removeBtn.addEventListener("mouseleave", ev => this._onRemoveButtonMouseLeave(ev), false);
          
          // Add click listener to slot to open item properties (but not for remove button)
          slot.removeEventListener("click", this._onSlotClick);
          slot.addEventListener("click", ev => this._onSlotClick(ev), false);
          
        } else {
          slot.setAttribute("draggable", false);
          slot.classList.remove("has-item");
          slot.removeEventListener("dragstart", this._onSlotDragStart);
          
          // Remove the remove button if present
          const removeBtn = slot.querySelector('.remove-item-btn');
          if (removeBtn) {
            removeBtn.remove();
          }
        }
      }
    });

    // Handle spell slots dragging
    html.find('.spell-slot img[draggable="true"]').each((i, img) => {
      // Remove old listeners first
      img.removeEventListener("dragstart", this._onSpellDragStart);
      // Add new listener
      img.addEventListener("dragstart", ev => this._onSpellDragStart(ev), false);
    });

    // Handle spell slot drop zones
    html.find('.spell-slot').each((i, slot) => {
      // Remove old listeners first
      slot.removeEventListener("dragover", this._onSpellDragOver);
      slot.removeEventListener("drop", this._onSpellDrop);
      slot.removeEventListener("dragleave", this._onSpellDragLeave);
      
      // Add new listeners
      slot.addEventListener("dragover", ev => this._onSpellDragOver(ev), false);
      slot.addEventListener("drop", ev => this._onSpellDrop(ev), false);
      slot.addEventListener("dragleave", ev => this._onSpellDragLeave(ev), false);
    });
  }

  /**
   * Handle removing items from equipment slots - DELETE ITEM COMPLETELY
   */
  async _onRemoveItem(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const slotType = button.dataset.slotType;
    
    if (!slotType) return;
    
    // Get the item ID and item object first for confirmation
    let itemId = null;
    let item = null;
    
    if (slotType === 'quick') {
      const slotIndex = parseInt(button.dataset.slotIndex);
      const quickItems = this.actor.system.equipment?.quickItems || [];
      const quickItem = quickItems[slotIndex];
      itemId = quickItem?.id;
    } else {
      const slotData = this.actor.system.equipment?.slots?.[slotType];
      itemId = slotData?.id;
    }
    
    // Get the actual item object for confirmation
    if (itemId) {
      item = this.actor.items.get(itemId);
    }
    
    if (!item) return;
    
    // Show confirmation dialog
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("ANDRAGATHIMA.DeleteItem"),
      content: `<p>${game.i18n.format("ANDRAGATHIMA.DeleteItemConfirm", {name: item.name})}</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (!confirmed) return;
    
    // Clear the slot FIRST
    const updateData = {};
    
    if (slotType === 'quick') {
      const slotIndex = parseInt(button.dataset.slotIndex);
      
      // Create a copy of current quickItems array to modify it properly
      let quickItems = [...(this.actor.system.equipment.quickItems || [])];
      
      // Ensure we have 8 slots with valid default values
      while (quickItems.length < 8) {
        quickItems.push({"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""});
      }
      
      // Fix any invalid img paths in existing slots
      quickItems = quickItems.map(item => ({
        name: item.name || "",
        img: (item.img && item.img.includes('.')) ? item.img : "icons/svg/item-bag.svg",
        id: item.id || "",
        type: item.type || ""
      }));
        
      if (slotIndex >= 0 && slotIndex < quickItems.length) {
        quickItems[slotIndex] = {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
      }
      
      // Update the entire quickItems array
      updateData[`system.equipment.quickItems`] = quickItems;
    } else {
      updateData[`system.equipment.slots.${slotType}.name`] = "";
      updateData[`system.equipment.slots.${slotType}.img`] = "icons/svg/item-bag.svg";
      updateData[`system.equipment.slots.${slotType}.id`] = "";
      updateData[`system.equipment.slots.${slotType}.type`] = "";
    }
    
    await this.actor.update(updateData);
    
    // THEN delete the actual item
    if (item) {
      // Delete the item completely from the actor
      await item.delete();
      ui.notifications.info(game.i18n.format("ANDRAGATHIMA.ItemDeleted", {name: item.name}));
    }
  }

  /**
   * Handle clicking on equipment slots to open item properties
   */
  _onSlotClick(event) {
    // Prevent action if clicked on remove button
    if (event.target.classList.contains('remove-item-btn')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    const slotType = slot.dataset.slotType;
    
    if (!slotType) return;
    
    let itemId = null;
    
    if (slotType === 'quick') {
      const slotIndex = parseInt(slot.dataset.slotIndex);
      const quickItems = this.actor.system.equipment.quickItems || [];
      const slotData = quickItems[slotIndex];
      itemId = slotData?.id;
    } else if (slotType === 'misc' && this.actor.type === 'container') {
      // For containers, handle misc slots differently
      const slotIndex = parseInt(slot.dataset.slotIndex);
      const miscSlots = this._getMiscEquipmentSlots();
      const item = miscSlots[slotIndex];
      itemId = item?.id;
    } else {
      const slotData = this.actor.system.equipment?.slots?.[slotType];
      itemId = slotData?.id;
    }
    
    if (itemId && itemId.trim() !== "") {
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet.render(true);
      }
    }
  }


  /**
   * Handle dropping item on equipment slot (original logic moved here)
   */
  async _handleEquipmentSlotDrop(event, slot, slotType, data) {
    // Get the item
    let item = null;
    if (data.uuid) {
      item = await fromUuid(data.uuid);
    } else if (data.id) {
      item = game.items.get(data.id);
    }
    
    if (!item) {
      return;
    }
    
    // Move item if it doesn't belong to this actor (instead of copying)
    if (item.parent !== this.actor) {
      const sourceActor = item.parent;
      const itemData = item.toObject();
      
      try {
        // Create the item in the destination actor FIRST
        const newItem = await Item.create(itemData, {parent: this.actor});
        
        // Only delete the original if creation was successful
        if (newItem && sourceActor) {
          // Clear the item from any quick slots or equipment slots in source actor
          await this._clearItemFromSourceActor(sourceActor, item.id);
          
          // Then delete the actual item
          await item.delete();
          
          // Force refresh of source actor's sheet to update UI
          if (sourceActor.sheet && sourceActor.sheet.rendered) {
            setTimeout(() => {
              if (sourceActor.sheet && sourceActor.sheet.rendered) {
                sourceActor.sheet.render(false);
              }
            }, 10);
          }
        }
        
        item = newItem;
      } catch (error) {
        console.error('Failed to move item:', error);
        // If creation fails, don't delete the original
        return;
      }
    }
    
    // Handle the equipment slot logic with validation
    const updateData = {};
    
    // No restrictions - all items can go in any slot
    
    if (slotType === 'quick') {
      const slotIndex = parseInt(slot.dataset.slotIndex);
      const quickItems = foundry.utils.deepClone(this.actor.system.equipment.quickItems || []);
      
      while (quickItems.length <= slotIndex) {
        quickItems.push({"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""});
      }
      
      // Handle quick-to-quick drag (swap items)
      if (data.slotType === 'quick' && data.slotIndex !== undefined) {
        const sourceIndex = parseInt(data.slotIndex);
        const targetIndex = slotIndex;
        
        if (sourceIndex !== targetIndex) {
          // Swap items between slots
          const sourceItem = quickItems[sourceIndex] || {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
          const targetItem = quickItems[targetIndex] || {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
          
          quickItems[sourceIndex] = targetItem;
          quickItems[targetIndex] = {
            name: item.name || "",
            img: item.img || "icons/svg/item-bag.svg",
            id: item.id || "",
            type: item.type || ""
          };
        }
      } else {
        // Clear source slot if dragging from other slots
        if (data.slotType && data.slotType !== 'quick') {
          await this._clearSourceSlot(data);
        }
        
        quickItems[slotIndex] = Object.assign(quickItems[slotIndex] || {}, {
          name: item.name || "",
          img: item.img || "icons/svg/item-bag.svg",
          id: item.id || "",
          type: item.type || ""
        });
      }
      
      updateData[`system.equipment.quickItems`] = quickItems;
    } else {
      // Handle equipment-to-equipment drag (swap items)
      if (data.slotType && data.slotType !== 'quick' && data.slotType !== 'misc' && data.slotType !== slotType) {
        // Get current item in target slot
        const targetSlotData = this.actor.system.equipment?.slots?.[slotType];
        
        if (targetSlotData && targetSlotData.id) {
          // Move target item to source slot
          updateData[`system.equipment.slots.${data.slotType}.name`] = targetSlotData.name;
          updateData[`system.equipment.slots.${data.slotType}.img`] = targetSlotData.img;
          updateData[`system.equipment.slots.${data.slotType}.id`] = targetSlotData.id;
          updateData[`system.equipment.slots.${data.slotType}.type`] = targetSlotData.type;
        } else {
          // Clear source slot
          updateData[`system.equipment.slots.${data.slotType}.name`] = "";
          updateData[`system.equipment.slots.${data.slotType}.img`] = "icons/svg/item-bag.svg";
          updateData[`system.equipment.slots.${data.slotType}.id`] = "";
          updateData[`system.equipment.slots.${data.slotType}.type`] = "";
        }
      } else if (data.slotType && data.slotType !== slotType) {
        // Clear source slot if dragging from other slot types
        await this._clearSourceSlot(data);
      }
      
      updateData[`system.equipment.slots.${slotType}.name`] = item.name;
      updateData[`system.equipment.slots.${slotType}.img`] = item.img;
      updateData[`system.equipment.slots.${slotType}.id`] = item.id;
      updateData[`system.equipment.slots.${slotType}.type`] = item.type;
    }
    
    await this.actor.update(updateData);
    
    // Force refresh of destination actor's sheet to update UI
    if (this.rendered) {
      this.render(false);
    }
    
    return item;
  }

  /**
   * Handle dropping item on miscellaneous equipment slot
   */
  async _handleMiscSlotDrop(event, slot, slotIndex, data) {
    // Get the item being dropped
    let item = null;
    if (data.uuid) {
      item = await fromUuid(data.uuid);
    } else if (data.id) {
      item = game.items.get(data.id);
    }
    
    if (!item) {
      return;
    }
    
    // Move item if it doesn't belong to this actor (instead of copying)
    if (item.parent !== this.actor) {
      const sourceActor = item.parent;
      const itemData = item.toObject();
      
      try {
        // Create the item in the destination actor FIRST
        const newItem = await Item.create(itemData, {parent: this.actor});
        
        // Only delete the original if creation was successful
        if (newItem && sourceActor) {
          // Clear the item from any quick slots or equipment slots in source actor
          await this._clearItemFromSourceActor(sourceActor, item.id);
          
          // Then delete the actual item
          await item.delete();
          
          // Force refresh of source actor's sheet to update UI
          if (sourceActor.sheet && sourceActor.sheet.rendered) {
            setTimeout(() => {
              if (sourceActor.sheet && sourceActor.sheet.rendered) {
                sourceActor.sheet.render(false);
              }
            }, 10);
          }
        }
        
        item = newItem;
      } catch (error) {
        console.error('Failed to move item:', error);
        // If creation fails, don't delete the original
        return;
      }
    }
    
    // Misc slots accept everything (no validation needed)
    
    // Handle clearing source slot if dragging from equipped slots
    if (data.slotType && data.slotType !== 'misc') {
      await this._clearSourceSlot(data);
    }
    
    // If dragging from a misc slot to another misc slot, handle the reordering
    if (data.slotType === 'misc' && data.slotIndex !== undefined) {
      const sourceIndex = parseInt(data.slotIndex);
      const targetIndex = slotIndex;
      
      if (sourceIndex !== targetIndex) {
        // Set the target misc slot index for this item
        await item.update({"flags.andragathima.miscSlotIndex": targetIndex});
        
        // Find the item at the target slot and move it to the source slot (swap)
        const miscSlots = this._getMiscEquipmentSlots();
        const targetItem = miscSlots[targetIndex];
        if (targetItem && targetItem.id !== item.id) {
          await targetItem.update({"flags.andragathima.miscSlotIndex": sourceIndex});
        }
      }
    } else {
      // Item coming from outside misc slots, just set its misc slot index
      await item.update({"flags.andragathima.miscSlotIndex": slotIndex});
    }
    
    // Force refresh of destination actor's sheet to update UI
    if (this.rendered) {
      // Use setTimeout to ensure all updates are processed before rendering
      setTimeout(() => {
        if (this.rendered) {
          this.render(false);
        }
      }, 10);
    }
    
    return item;
  }

  /**
   * Clear item from all quick slots and equipment slots in source actor
   */
  async _clearItemFromSourceActor(sourceActor, itemId) {
    if (!sourceActor || !itemId) return;
    
    const updateData = {};
    
    // Check and clear equipment slots
    const equipmentSlots = sourceActor.system.equipment?.slots || {};
    for (const [slotType, slotData] of Object.entries(equipmentSlots)) {
      if (slotData && slotData.id === itemId) {
        updateData[`system.equipment.slots.${slotType}.name`] = "";
        updateData[`system.equipment.slots.${slotType}.img`] = "";
        updateData[`system.equipment.slots.${slotType}.id`] = "";
        updateData[`system.equipment.slots.${slotType}.type`] = "";
      }
    }
    
    // Check and clear quick slots
    const quickItems = sourceActor.system.equipment?.quickItems || [];
    let quickSlotsChanged = false;
    const newQuickItems = [...quickItems];
    
    for (let i = 0; i < newQuickItems.length; i++) {
      if (newQuickItems[i] && newQuickItems[i].id === itemId) {
        newQuickItems[i] = {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
        quickSlotsChanged = true;
      }
    }
    
    if (quickSlotsChanged) {
      updateData["system.equipment.quickItems"] = newQuickItems;
    }
    
    // Apply updates if any
    if (Object.keys(updateData).length > 0) {
      await sourceActor.update(updateData);
    }
    
    // Clear miscSlotIndex flag from the item to prevent ghost positioning
    const item = sourceActor.items.get(itemId);
    if (item && item.flags?.andragathima?.miscSlotIndex !== undefined) {
      await item.update({"flags.andragathima.-=miscSlotIndex": null});
    }
  }

  /**
   * Clear source slot when dragging item from equipped slots to misc slots
   */
  async _clearSourceSlot(data) {
    const updateData = {};
    
    if (data.slotType === 'quick' && data.slotIndex !== undefined) {
      // Clear quick slot
      const slotIndex = parseInt(data.slotIndex);
      let quickItems = [...(this.actor.system.equipment.quickItems || [])];
      
      // Ensure we have enough slots
      while (quickItems.length <= slotIndex) {
        quickItems.push({"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""});
      }
      
      quickItems[slotIndex] = {"name": "", "img": "icons/svg/item-bag.svg", "id": "", "type": ""};
      updateData[`system.equipment.quickItems`] = quickItems;
      
    } else if (data.slotType && data.slotType !== 'misc' && data.slotType !== 'quick') {
      // Clear equipment slot
      updateData[`system.equipment.slots.${data.slotType}.name`] = "";
      updateData[`system.equipment.slots.${data.slotType}.img`] = "icons/svg/item-bag.svg";
      updateData[`system.equipment.slots.${data.slotType}.id`] = "";
      updateData[`system.equipment.slots.${data.slotType}.type`] = "";
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
    }
  }


  /**
   * Handle item delete button clicks
   */
  async _onItemDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    if (!button || !button.dataset) return;
    
    const itemId = button.dataset.itemId;
    if (!itemId) return;
    
    const item = this.actor.items.get(itemId);
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("ANDRAGATHIMA.DeleteItem"),
      content: `<p>${game.i18n.format("ANDRAGATHIMA.DeleteItemConfirm", {name: item.name})}</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      await item.delete();
      ui.notifications.info(game.i18n.format("ANDRAGATHIMA.ItemDeleted", {name: item.name}));
    }
  }

  /**
   * Handle clicking on misc equipment slots to open item properties
   */
  _onMiscSlotClick(event) {
    // Prevent action if clicked on delete button
    if (event.target.classList.contains('item-delete') || 
        event.target.closest('.item-delete')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    const slotIndex = parseInt(slot.dataset.slotIndex);
    
    // Get the misc equipment slots
    const miscSlots = this._getMiscEquipmentSlots();
    const item = miscSlots[slotIndex];
    
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle clicking on quick slots to open item properties
   */
  _onQuickSlotClick(event) {
    // Prevent action if clicked on remove button
    if (event.target.classList.contains('remove-item-btn') || 
        event.target.closest('.remove-item-btn')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    const slotIndex = parseInt(slot.dataset.slotIndex);
    
    const quickItems = this.actor.system.equipment?.quickItems || [];
    const quickItem = quickItems[slotIndex];
    
    if (quickItem && quickItem.id) {
      const item = this.actor.items.get(quickItem.id);
      if (item) {
        item.sheet.render(true);
      }
    }
  }

  /**
   * Get current misc equipment slots for drag & drop logic
   */
  _getMiscEquipmentSlots() {
    const slots = new Array(20).fill(null);
    
    // For containers, all items go into misc slots
    let unequippedItems;
    if (this.actor.type === 'container') {
      unequippedItems = Array.from(this.actor.items).filter(item => {
        // Exclude spells from misc slots
        return item.type !== "spell";
      });
    } else {
      // Get all items that are not equipped in specific equipment slots
      unequippedItems = Array.from(this.actor.items).filter(item => {
        // Check if item is in equipment slots
        const equipmentSlots = this.actor.system.equipment?.slots || {};
        const quickItems = this.actor.system.equipment?.quickItems || [];
        
        // Check if item is in equipment slots
        for (let slotData of Object.values(equipmentSlots)) {
          if (slotData.id && slotData.id === item.id) {
            return false; // Item is equipped in an equipment slot
          }
        }
        
        // Check if item is in quick items
        for (let quickItem of quickItems) {
          if (quickItem.id && quickItem.id === item.id) {
            return false; // Item is in quick items
          }
        }
        
        return true; // Item is not equipped anywhere, should go to misc slots
      });
    }
    
    // Place items in misc slots based on their stored misc slot index
    unequippedItems.forEach((item) => {
      const miscSlotIndex = item.flags?.andragathima?.miscSlotIndex;
      
      if (miscSlotIndex !== undefined && miscSlotIndex !== null && 
          miscSlotIndex >= 0 && miscSlotIndex < 20 && 
          slots[miscSlotIndex] === null) {
        // Place item in its stored slot position
        slots[miscSlotIndex] = item;
      }
    });
    
    // Place remaining items (without stored positions) in first available slots
    unequippedItems.forEach((item) => {
      const miscSlotIndex = item.flags?.andragathima?.miscSlotIndex;
      
      if (miscSlotIndex === undefined || miscSlotIndex === null || 
          slots[miscSlotIndex] !== item) {
        // Find first available slot
        for (let i = 0; i < 20; i++) {
          if (slots[i] === null) {
            slots[i] = item;
            break;
          }
        }
      }
    });
    
    return slots;
  }

  /**
   * Setup instant tooltips with no delay
   */
  _setupInstantTooltips(html) {
    // Override Foundry's tooltip behavior for instant display
    const tooltipElements = html.find('[title]');
    
    tooltipElements.each((i, element) => {
      const $element = $(element);
      const originalTitle = $element.attr('title');
      
      if (originalTitle && originalTitle.trim()) {
        // Remove default title to prevent browser tooltip
        $element.removeAttr('title');
        
        // Mark element as having custom tooltip
        $element.attr('data-has-custom-tooltip', 'true');
        
        // Add custom tooltip behavior
        $element.on('mouseenter', (e) => {
          // Remove any possible title attribute that might have been added
          e.currentTarget.removeAttribute('title');
          this._showTooltip(e.currentTarget, originalTitle);
        });
        
        $element.on('mouseleave', (e) => {
          this._hideTooltip();
        });
        
        // Prevent any other tooltip systems from working
        $element.on('mouseover', (e) => {
          e.currentTarget.removeAttribute('title');
        });
      }
    });
  }

  /**
   * Show custom tooltip
   */
  _showTooltip(element, content) {
    // Remove any existing tooltip
    this._hideTooltip();
    
    const tooltip = $(`<div class="andragathima-rich-tooltip">${content.replace(/\n/g, '<br>')}</div>`);
    $('body').append(tooltip);
    
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip[0].getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // Keep tooltip within screen bounds
    if (left < 0) left = 8;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 8;
    if (top < 0) top = rect.bottom + 8;
    
    tooltip.css({
      position: 'fixed',
      left: left + 'px',
      top: top + 'px',
      'z-index': 9999,
      display: 'block'
    });
  }

  /**
   * Hide custom tooltip
   */
  _hideTooltip() {
    $('.andragathima-rich-tooltip').remove();
  }

  /**
   * Handle mouseenter on remove buttons
   */
  _onRemoveButtonMouseEnter(event) {
    const deleteText = game.i18n.localize("ANDRAGATHIMA.Delete");
    this._showTooltip(event.currentTarget, deleteText);
  }

  /**
   * Handle mouseleave on remove buttons
   */
  _onRemoveButtonMouseLeave(event) {
    this._hideTooltip();
  }

  /**
   * Pre-process tooltips for all equipment slots and quick items
   */
  _prepareEquipmentTooltips(context) {
    const system = context.system;
    
    // Process equipment slots
    if (system.equipment?.slots) {
      for (const [slotKey, slotData] of Object.entries(system.equipment.slots)) {
        if (slotData.id) {
          const item = this.actor.items.get(slotData.id);
          if (item) {
            slotData.tooltip = this._createItemTooltip(item);
            // Store item type and quantity for template use
            slotData.type = item.type;
            if (item.type === 'ammunition') {
              slotData.system = { 
                quantity: item.system.quantity,
                showOnToken: item.system.showOnToken 
              };
            }
          }
        }
      }
    }
    
    // Process quick items
    if (system.equipment?.quickItems) {
      for (const quickItem of system.equipment.quickItems) {
        if (quickItem.id) {
          const item = this.actor.items.get(quickItem.id);
          if (item) {
            quickItem.tooltip = this._createItemTooltip(item);
            // Store item type and system data for template use
            quickItem.type = item.type;
            if (item.type === 'ammunition') {
              quickItem.system = {
                quantity: item.system.quantity,
                showOnToken: item.system.showOnToken
              };
            }
          }
        }
      }
    }
    
    // Process misc equipment slots
    if (context.miscEquipmentSlots) {
      for (let i = 0; i < context.miscEquipmentSlots.length; i++) {
        const item = context.miscEquipmentSlots[i];
        if (item) {
          context.miscEquipmentSlots[i].tooltip = this._createItemTooltip(item);
        }
      }
    }
  }

  /**
   * Create rich tooltip content for items
   */
  _createItemTooltip(item) {
    if (!item || !item.name) return item?.name || '';
    
    let tooltip = item.name;
    
    // Add item type specific information
    switch (item.type) {
      case 'weapon':
        tooltip = this._createWeaponTooltip(item);
        break;
      case 'armor':
        tooltip = this._createArmorTooltip(item);
        break;
      case 'equipment':
        tooltip = this._createEquipmentTooltip(item);
        break;
      case 'ammunition':
        tooltip = this._createAmmunitionTooltip(item);
        break;
      case 'miscellaneous':
        tooltip = this._createMiscellaneousTooltip(item);
        break;
      case 'spell':
        tooltip = this._createSpellTooltip(item);
        break;
      case 'skill':
        tooltip = this._createSkillTooltip(item);
        break;
      default:
        tooltip = `<strong>${item.name}</strong>`;
    }
    
    return tooltip;
  }

  /**
   * Create weapon tooltip
   */
  _createWeaponTooltip(weapon) {
    const system = weapon.system;
    let tooltip = `<strong>${weapon.name}</strong>`;
    
    if (system.weaponType) {
      // Map specific weapon types to localization keys
      const weaponTypeKeys = {
        'aspida_varia': 'ANDRAGATHIMA.WeaponTypeAspida',
        'aspida_elafria': 'ANDRAGATHIMA.WeaponTypeAspida',
        'aspidaVaria': 'ANDRAGATHIMA.WeaponTypeAspida',
        'aspidaElafria': 'ANDRAGATHIMA.WeaponTypeAspida',
        'vallistra': 'ANDRAGATHIMA.WeaponTypeVallistra',
        'dory': 'ANDRAGATHIMA.WeaponTypeDory',
        'drepani': 'ANDRAGATHIMA.WeaponTypeDrepani',
        'longi': 'ANDRAGATHIMA.WeaponTypeLongi',
        'macheri': 'ANDRAGATHIMA.WeaponTypeMacheri',
        'mastigio': 'ANDRAGATHIMA.WeaponTypeMastigio',
        'pyrovolo': 'ANDRAGATHIMA.WeaponTypePyrovolo',
        'ravdi': 'ANDRAGATHIMA.WeaponTypeRavdi',
        'riptari': 'ANDRAGATHIMA.WeaponTypeRiptari',
        'ropalo': 'ANDRAGATHIMA.WeaponTypeRopalo',
        'sfendoni': 'ANDRAGATHIMA.WeaponTypeSfendoni',
        'spathi': 'ANDRAGATHIMA.WeaponTypeSpathi',
        'toxo': 'ANDRAGATHIMA.WeaponTypeToxo',
        'tsekoiri': 'ANDRAGATHIMA.WeaponTypeTsekoiri',
        'frageli': 'ANDRAGATHIMA.WeaponTypeFrageli',
        'autosxedio': 'ANDRAGATHIMA.WeaponTypeAutosxedio',
        'grothies': 'ANDRAGATHIMA.WeaponTypeGrothies'
      };
      
      const localizationKey = weaponTypeKeys[system.weaponType] || CONFIG.ANDRAGATHIMA?.weaponTypes?.[system.weaponType];
      const weaponTypeLabel = localizationKey ? game.i18n.localize(localizationKey) : system.weaponType;
      tooltip += `\n${weaponTypeLabel}`;
    }
    
    if (system.damage?.coefficient || system.damage?.bonus) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.DamageWithColon')} ${this._formatNumber(system.damage.coefficient || 0, true)}`;
      if (system.damage.bonus) {
        tooltip += ` ${this._formatNumber(system.damage.bonus, true)}`;
      }
    }
    
    if (system.attack?.bonus) {
      const attackFormatted = system.attack.bonus >= 0 ? `+${this._formatNumber(system.attack.bonus)}` : this._formatNumber(system.attack.bonus);
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.AttackWithColon')} ${attackFormatted}`;
    }
    
    if (system.range?.text && system.range.text !== "0") {
      const rangeText = system.range.text.replace(/Χ/g, '×');
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.RangeDisplay')} ${rangeText} m`;
    }
    
    if (system.strength) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.Strength')}: ${this._formatNumber(system.strength)}`;
    }
    
    if (system.weight) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.Weight')}: ${this._formatNumber(system.weight)} kg`;
    }
    
    return tooltip;
  }

  /**
   * Create armor tooltip
   */
  _createArmorTooltip(armor) {
    const system = armor.system;
    let tooltip = `<strong>${armor.name}</strong>`;
    
    if (system.armorType) {
      const armorTypeLabel = game.i18n.localize(CONFIG.ANDRAGATHIMA?.armorTypes?.[system.armorType]) || system.armorType;
      tooltip += `\n${armorTypeLabel}`;
    }
    
    // Show significant resistances
    const resistances = [];
    if (system.resistances) {
      // Only show physical damage types (piercing, bludgeoning, slashing)
      const physicalDamageTypes = ['diatrisi', 'kroysi', 'tomi'];
      for (const [key, value] of Object.entries(system.resistances)) {
        if (physicalDamageTypes.includes(key) && value !== undefined && value !== null) {
          const resistanceLabel = game.i18n.localize(CONFIG.ANDRAGATHIMA?.damageTypes?.[key]) || key;
          resistances.push(`${resistanceLabel}: ${this._formatNumber(value, true)}`);
        }
      }
    }
    
    if (resistances.length > 0) {
      tooltip += `\n${resistances.join(', ')}`;
    }
    
    if (system.penalty && system.penalty !== 0) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.ArmorPenalty')}: ${this._formatNumber(system.penalty)}`;
    }
    
    if (system.weight) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.Weight')}: ${this._formatNumber(system.weight)} kg`;
    }
    
    return tooltip;
  }

  /**
   * Create equipment tooltip
   */
  _createEquipmentTooltip(equipment) {
    const system = equipment.system;
    let tooltip = `<strong>${equipment.name}</strong>`;
    
    if (system.quantity && system.quantity > 1) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.Quantity')}: ${this._formatNumber(system.quantity)}`;
    }
    
    if (system.weight) {
      const totalWeight = system.weight * (system.quantity || 1);
      tooltip += `\nΒάρος: ${this._formatNumber(totalWeight)} kg`;
    }
    
    return tooltip;
  }


  /**
   * Create spell tooltip
   */
  _createSpellTooltip(spell, requirements = null) {
    const system = spell.system;
    let tooltip = `<strong>${spell.name}</strong>`;
    
    // Create the first line with School, Elements, and Level
    let firstLine = [];
    
    // Add school - use localized names
    if (system.school) {
      const schoolKeys = {
        'abjuration': 'ANDRAGATHIMA.SpellSchoolAbjuration',
        'enchantment': 'ANDRAGATHIMA.SpellSchoolEnchantment',
        'evocation': 'ANDRAGATHIMA.SpellSchoolEvocation',
        'necromancy': 'ANDRAGATHIMA.SpellSchoolNecromancy',
        'conjuration': 'ANDRAGATHIMA.SpellSchoolConjuration',
        'divination': 'ANDRAGATHIMA.SpellSchoolDivination',
        'transmutation': 'ANDRAGATHIMA.SpellSchoolTransmutation',
        'illusion': 'ANDRAGATHIMA.SpellSchoolIllusion'
      };
      const localizationKey = schoolKeys[system.school];
      const schoolLabel = localizationKey ? game.i18n.localize(localizationKey) : system.school;
      firstLine.push(schoolLabel);
    }
    
    // Add elements
    if (system.elements) {
      const elements = [];
      const elementMap = {
        'air': game.i18n.localize('ANDRAGATHIMA.ElementAirGenitive'),
        'earth': game.i18n.localize('ANDRAGATHIMA.ElementEarthGenitive'), 
        'water': game.i18n.localize('ANDRAGATHIMA.ElementWaterGenitive'),
        'fire': game.i18n.localize('ANDRAGATHIMA.ElementFireGenitive')
      };
      
      for (const [element, selected] of Object.entries(system.elements)) {
        if (selected) {
          elements.push(elementMap[element] || element);
        }
      }
      
      if (elements.length > 0) {
        let elementText;
        if (elements.length === 1) {
          elementText = elements[0];
        } else if (elements.length === 2) {
          elementText = elements.join(' και ');
        } else {
          elementText = elements.slice(0, -1).join(', ') + ' και ' + elements[elements.length - 1];
        }
        firstLine.push(elementText);
      }
    }
    
    // Add level
    if (system.level) {
      firstLine.push(system.level.toString());
    }
    
    if (firstLine.length > 0) {
      tooltip += `\n${firstLine.join(' ')}`;
    }
    
    // Add energy (skip if it's "attack")
    if (system.energy?.type && system.energy.type !== 'attack') {
      let energyText = '';
      switch (system.energy.type) {
        case 'full':
          energyText = game.i18n.localize('ANDRAGATHIMA.SpellEnergyFull');
          break;
        case 'move':
          energyText = game.i18n.localize('ANDRAGATHIMA.SpellEnergyMove');
          break;
        case 'free':
          energyText = game.i18n.localize('ANDRAGATHIMA.SpellEnergyFree');
          break;
        case 'custom':
          energyText = system.energy.custom || game.i18n.localize('ANDRAGATHIMA.SpellEnergyCustom');
          break;
      }
      if (energyText) {
        tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SpellEnergy')}: ${energyText}`;
      }
    }
    
    // Add range
    if (system.range?.type) {
      let rangeText = '';
      switch (system.range.type) {
        case 'personal':
          rangeText = game.i18n.localize('ANDRAGATHIMA.SpellRangePersonal');
          break;
        case 'touch':
          rangeText = game.i18n.localize('ANDRAGATHIMA.SpellRangeTouch');
          break;
        case 'ranged':
          // Calculate the actual range for ranged spells
          if (this.actor) {
            const magicDegree = this.actor.system.magic?.degree?.value || 0;
            if (magicDegree > 0) {
              // Get available elements using the same logic as the rest of the system
              const availableElements = this._getAvailableElements(this.actor);
              
              // Check if the character has at least one of the spell's elements
              let hasMatchingElement = false;
              if (system.elements) {
                // Check if any of the spell's elements match any available elements
                for (const element in system.elements) {
                  if (system.elements[element] === true && availableElements[element] === true) {
                    hasMatchingElement = true;
                    break;
                  }
                }
              }
              
              // Calculate range based on whether character has matching element
              let range;
              if (hasMatchingElement) {
                range = 10 * magicDegree;
              } else {
                range = 10 * Math.max(1, magicDegree - 2);
              }
              rangeText = `${this._formatNumber(range)} m`;
            } else {
              rangeText = game.i18n.localize('ANDRAGATHIMA.SpellRangeRanged');
            }
          } else {
            rangeText = game.i18n.localize('ANDRAGATHIMA.SpellRangeRanged');
          }
          break;
        case 'perception':
          rangeText = game.i18n.localize('ANDRAGATHIMA.SpellRangePerception');
          break;
        case 'custom':
          rangeText = system.range.custom || game.i18n.localize('ANDRAGATHIMA.SpellRangeCustom');
          break;
      }
      if (rangeText) {
        tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SpellRange')}: ${rangeText}`;
      }
    }
    
    // Add area (skip if "none")
    if (system.area?.type && system.area.type !== 'none') {
      let areaText = '';
      switch (system.area.type) {
        case 'radius':
          areaText = game.i18n.localize('ANDRAGATHIMA.SpellAreaRadius');
          break;
        case 'burst':
          areaText = game.i18n.localize('ANDRAGATHIMA.SpellAreaBurst');
          break;
        case 'burst2':
          areaText = this._calculateSpellAreaDisplayForTooltip(spell, 2);
          break;
        case 'burst5':
          areaText = this._calculateSpellAreaDisplayForTooltip(spell, 5);
          break;
        case 'cone':
          areaText = game.i18n.localize('ANDRAGATHIMA.SpellAreaCone');
          break;
        case 'custom':
          areaText = system.area.custom || game.i18n.localize('ANDRAGATHIMA.SpellAreaCustom');
          break;
      }
      if (areaText) {
        tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SpellArea')}: ${areaText}`;
      }
    }
    
    // Add duration (skip if "instant")
    if (system.duration?.type && system.duration.type !== 'instant') {
      let durationText = '';
      switch (system.duration.type) {
        case 'round_per_degree':
          durationText = this._calculateSpellDurationDisplayForTooltip(spell, 'round_per_degree');
          break;
        case 'minute_per_degree':
          durationText = this._calculateSpellDurationDisplayForTooltip(spell, 'minute_per_degree');
          break;
        case 'five_minutes_per_degree':
          durationText = this._calculateSpellDurationDisplayForTooltip(spell, 'five_minutes_per_degree');
          break;
        case 'ten_minutes_per_degree':
          durationText = this._calculateSpellDurationDisplayForTooltip(spell, 'ten_minutes_per_degree');
          break;
        case 'hour_per_degree':
          durationText = this._calculateSpellDurationDisplayForTooltip(spell, 'hour_per_degree');
          break;
        case 'custom':
          durationText = system.duration.custom || game.i18n.localize('ANDRAGATHIMA.SpellDurationCustom');
          break;
      }
      if (durationText) {
        tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SpellDuration')}: ${durationText}`;
      }
    }
    
    // Add save (skip if "none")
    if (system.save?.type && system.save.type !== 'none') {
      let saveText = '';
      switch (system.save.type) {
        case 'reflexes':
          saveText = game.i18n.localize('ANDRAGATHIMA.SpellSaveReflexes');
          break;
        case 'mind':
          saveText = game.i18n.localize('ANDRAGATHIMA.SpellSaveMind');
          break;
        case 'body':
          saveText = game.i18n.localize('ANDRAGATHIMA.SpellSaveBody');
          break;
        case 'custom':
          saveText = system.save.custom || game.i18n.localize('ANDRAGATHIMA.SpellSaveCustom');
          break;
      }
      if (saveText) {
        tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SpellSave')}: ${saveText}`;
      }
    }
    
    // Add red warning messages for insufficient spells
    if (requirements && requirements.issues.length > 0) {
      tooltip += `\n\n<span style="color: #d32f2f; font-weight: bold;">${game.i18n.localize('ANDRAGATHIMA.SpellInsufficientWarning')}</span>`;
      for (const issue of requirements.issues) {
        tooltip += `\n<span style="color: #d32f2f;">${issue}</span>`;
      }
    }
    
    return tooltip;
  }

  /**
   * Create skill tooltip
   */
  _createSkillTooltip(skill) {
    const system = skill.system;
    let tooltip = `<strong>${skill.name}</strong>`;
    
    if (system.level !== undefined) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.SkillLevel')}: ${this._formatNumber(system.level)}/${this._formatNumber(system.maxLevel || 3)}`;
    }
    
    if (system.experienceCost) {
      tooltip += `\n${game.i18n.localize('ANDRAGATHIMA.ExperienceCost')}: ${this._formatNumber(system.experienceCost)}`;
    }
    
    return tooltip;
  }

  /**
   * Create ammunition tooltip
   */
  _createAmmunitionTooltip(ammunition) {
    const system = ammunition.system;
    const quantity = system.quantity || 0;
    let tooltip = `<strong>${ammunition.name} (${quantity})</strong>`;
    
    if (system.weight && system.quantity) {
      const totalWeight = system.weight * system.quantity;
      const weightLabel = game.i18n.localize("ANDRAGATHIMA.TotalWeightTooltip");
      tooltip += `\n${weightLabel}: ${this._formatNumber(totalWeight.toFixed(1))} kg`;
    }
    
    return tooltip;
  }

  /**
   * Create miscellaneous tooltip
   */
  _createMiscellaneousTooltip(miscellaneous) {
    const system = miscellaneous.system;
    const quantity = system.quantity || 0;
    let tooltip = `<strong>${miscellaneous.name} (${quantity})</strong>`;
    
    if (system.weight && system.quantity) {
      const totalWeight = system.weight * system.quantity;
      const weightLabel = game.i18n.localize("ANDRAGATHIMA.TotalWeightTooltip");
      tooltip += `\n${weightLabel}: ${this._formatNumber(totalWeight.toFixed(1))} kg`;
    }
    
    return tooltip;
  }

  /**
   * Format number display, replacing hyphen-minus (-) with proper minus sign (−) for negative numbers
   * @param {number|string} value - The number to format
   * @returns {string} - Formatted number with proper minus sign
   */
  _formatNumber(value, withSign = false) {
    if (value === null || value === undefined) return '';
    let formatted = value.toString();
    
    // Add sign if requested and number is positive or zero
    if (withSign && parseFloat(value) >= 0) {
      formatted = '+' + formatted;
    }
    
    // Replace minus sign
    formatted = formatted.replace(/^-/, '−');
    
    return formatted;
  }

  /**
   * Handle magic stat increase
   */
  async _onMagicIncrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const magic = event.currentTarget.dataset.magic; // level or degree
    
    // Initialize magic structure if it doesn't exist
    if (!this.actor.system.magic) {
      await this.actor.update({ "system.magic": { level: { value: 0 }, degree: { value: 0 }, element: { value: "" } } });
    }
    
    if (magic === 'level') {
      const currentValue = this.actor.system.magic.level?.value || 0;
      const newValue = Math.min(5, currentValue + 1);
      await this.actor.update({ "system.magic.level.value": newValue });
    } else if (magic === 'degree') {
      const currentValue = this.actor.system.magic.degree?.value || 0;
      const newValue = Math.min(20, currentValue + 1);
      await this.actor.update({ "system.magic.degree.value": newValue });
    }
  }

  /**
   * Handle magic stat decrease
   */
  async _onMagicDecrease(event) {
    event.preventDefault();
    
    // Play sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_10.wav", volume: 0.8 }, false);
    
    const magic = event.currentTarget.dataset.magic; // level or degree
    
    // Initialize magic structure if it doesn't exist
    if (!this.actor.system.magic) {
      await this.actor.update({ "system.magic": { level: { value: 0 }, degree: { value: 0 }, element: { value: "" } } });
    }
    
    if (magic === 'level') {
      const currentValue = this.actor.system.magic.level?.value || 0;
      const newValue = Math.max(0, currentValue - 1);
      const updateData = { "system.magic.level.value": newValue };
      
      // Clear element if mage level drops to 0
      if (newValue === 0) {
        updateData["system.magic.element.value"] = "";
      }
      
      await this.actor.update(updateData);
    } else if (magic === 'degree') {
      const currentValue = this.actor.system.magic.degree?.value || 0;
      const newValue = Math.max(0, currentValue - 1);
      await this.actor.update({ "system.magic.degree.value": newValue });
    }
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
  }

  /**
   * Handle clicking on spell items to open their sheet
   */
  async _onSpellItemClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Don't open sheet if clicking on delete button
    if (event.target.classList.contains('item-delete')) return;
    
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle deleting spells from spellbook
   */
  async _onSpellDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("ANDRAGATHIMA.DeleteSpell"),
      content: `<p>${game.i18n.format("ANDRAGATHIMA.DeleteSpellConfirm", {name: item.name})}</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      await item.delete();
      ui.notifications.info(game.i18n.format("ANDRAGATHIMA.SpellDeleted", {name: item.name}));
    }
  }

  /**
   * Handle dragging spells from spellbook
   */
  _onSpellDragStart(event) {
    const img = event.currentTarget;
    const itemId = img.dataset.itemId;
    const spellIndex = parseInt(img.dataset.spellIndex);

    if (!itemId) return;

    // Get the item from the actor
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "spell") return;

    const dragData = {
      type: "Item",
      uuid: item.uuid,
      spellIndex: spellIndex,
      isSpellReorder: true
    };

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Handle dragover event for spell slots
   */
  _onSpellDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    
    // Add visual feedback
    event.currentTarget.classList.add("spell-drag-over");
  }

  /**
   * Handle dragleave event for spell slots
   */
  _onSpellDragLeave(event) {
    event.currentTarget.classList.remove("spell-drag-over");
  }

  /**
   * Handle dropping spells onto spell slots for reordering
   */
  async _onSpellDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("spell-drag-over");

    let dragData;
    try {
      const data = event.dataTransfer.getData("text/plain");
      dragData = JSON.parse(data);
    } catch (err) {
      return false;
    }

    // Only handle spell reordering
    if (!dragData.isSpellReorder || dragData.type !== "Item") {
      return false;
    }

    const targetSlot = event.currentTarget;
    const targetIndex = parseInt(targetSlot.dataset.spellIndex);
    const sourceIndex = dragData.spellIndex;

    // If dropping on same slot, do nothing
    if (sourceIndex === targetIndex) {
      return false;
    }

    // Get the source item
    const sourceItem = await fromUuid(dragData.uuid);
    if (!sourceItem || sourceItem.type !== "spell") {
      return false;
    }

    // Get all spells sorted by their current order (by sort value)
    const allSpells = Array.from(this.actor.items.filter(item => item.type === "spell"))
                         .sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    // Get the target spell (the one we're dropping onto)
    const targetItem = allSpells[targetIndex];
    if (!targetItem) {
      return false;
    }

    // Handle the swap with proper sort values
    let sourceSort = sourceItem.sort || 0;
    let targetSort = targetItem.sort || 0;

    // If both items have the same sort value (or both are 0), assign new distinct values
    if (sourceSort === targetSort) {
      // Recalculate sort values for all spells to ensure proper spacing
      const updates = [];
      for (let i = 0; i < allSpells.length; i++) {
        const newSort = (i + 1) * 100000;
        if (i === sourceIndex) {
          // Source goes to target position
          updates.push({
            _id: sourceItem.id,
            sort: (targetIndex + 1) * 100000
          });
        } else if (i === targetIndex) {
          // Target goes to source position
          updates.push({
            _id: targetItem.id,
            sort: (sourceIndex + 1) * 100000
          });
        } else {
          // Others keep their relative positions
          updates.push({
            _id: allSpells[i].id,
            sort: newSort
          });
        }
      }
      
      // Apply all updates
      await this.actor.updateEmbeddedDocuments("Item", updates);
      return true;
    }

    // Simple swap when sort values are different
    const updates = [
      {
        _id: sourceItem.id,
        sort: targetSort
      },
      {
        _id: targetItem.id,
        sort: sourceSort
      }
    ];

    // Apply the updates
    await this.actor.updateEmbeddedDocuments("Item", updates);
    
    return true;
  }


  /**
   * Prepare the list of available elements based on selected element and elemental mastery skill
   */
  _prepareAvailableElements(context) {
    const actorData = context.system;
    const selectedElement = actorData.magic?.element?.value;
    const elementalMastery = actorData.skills?.stoixeiaki_kataktisi;
    
    // Start with empty available elements
    const availableElements = {
      air: false,
      earth: false,
      water: false,
      fire: false
    };
    
    // If character has selected element, add it
    if (selectedElement) {
      availableElements[selectedElement] = true;
    }
    
    // If character has elemental mastery skill
    if (elementalMastery?.hasSkill && elementalMastery.level > 0) {
      if (elementalMastery.level >= 2) {
        // Level 2+: All elements available
        availableElements.air = true;
        availableElements.earth = true;
        availableElements.water = true;
        availableElements.fire = true;
      } else if (elementalMastery.level >= 1 && selectedElement) {
        // Level 1: Selected element + 2 others (not opposite)
        // Opposites: air-earth, fire-water
        switch(selectedElement) {
          case 'air':
            availableElements.water = true;
            availableElements.fire = true;
            break;
          case 'earth':
            availableElements.water = true;
            availableElements.fire = true;
            break;
          case 'water':
            availableElements.air = true;
            availableElements.earth = true;
            break;
          case 'fire':
            availableElements.air = true;
            availableElements.earth = true;
            break;
        }
      }
    }
    
    // Add to context for use in templates and calculations
    context.availableElements = availableElements;
  }

  /**
   * Get available elements for an actor (helper method for tooltips and calculations)
   */
  _getAvailableElements(actor) {
    const selectedElement = actor.system.magic?.element?.value;
    const elementalMastery = actor.system.skills?.stoixeiaki_kataktisi;
    
    // Start with empty available elements
    const availableElements = {
      air: false,
      earth: false,
      water: false,
      fire: false
    };
    
    // If character has selected element, add it
    if (selectedElement) {
      availableElements[selectedElement] = true;
    }
    
    // If character has elemental mastery skill
    if (elementalMastery?.hasSkill && elementalMastery.level > 0) {
      if (elementalMastery.level >= 2) {
        // Level 2+: All elements available
        availableElements.air = true;
        availableElements.earth = true;
        availableElements.water = true;
        availableElements.fire = true;
      } else if (elementalMastery.level >= 1 && selectedElement) {
        // Level 1: Selected element + 2 others (not opposite)
        // Opposites: air-earth, fire-water
        switch(selectedElement) {
          case 'air':
            availableElements.water = true;
            availableElements.fire = true;
            break;
          case 'earth':
            availableElements.water = true;
            availableElements.fire = true;
            break;
          case 'water':
            availableElements.air = true;
            availableElements.earth = true;
            break;
          case 'fire':
            availableElements.air = true;
            availableElements.earth = true;
            break;
        }
      }
    }
    
    return availableElements;
  }

  /**
   * Handle click on disabled magic tab
   * @param {Event} event   The originating click event
   * @private
   */
  _onMagicDisabledClick(event) {
    event.preventDefault();
    const message = game.i18n.localize("ANDRAGATHIMA.NeedMagicAbilities");
    ui.notifications.info(message);
  }

  /**
   * Remove skills from previous race
   * @param {Object} raceSkills - Race skills to remove
   * @param {Object} updates - Updates object to modify
   * @param {Object} newRaceSkills - Skills from new race (to avoid removing shared skills)
   * @returns {number} Experience points to refund
   * @private
   */
  _removeRaceSkills(raceSkills, updates, newRaceSkills = {}) {
    const currentSkills = this.actor.system.skills || {};
    let experienceRefund = 0;

    for (const [skillKey, oldRaceLevel] of Object.entries(raceSkills)) {
      const currentSkill = currentSkills[skillKey];
      if (!currentSkill?.hasSkill) continue;

      const currentLevel = currentSkill.level || 0;
      const newRaceLevel = newRaceSkills[skillKey] || 0;
      
      // Calculate how much of the current level comes from the old race
      const raceContribution = Math.min(oldRaceLevel, currentLevel);
      
      // If the new race also provides this skill, keep the higher of the two race contributions
      const finalRaceContribution = Math.max(newRaceLevel, 0);
      const levelsToRemove = Math.max(0, raceContribution - finalRaceContribution);
      
      if (levelsToRemove > 0) {
        const newLevel = currentLevel - levelsToRemove;
        
        if (newLevel <= 0) {
          // Remove skill completely
          experienceRefund += this._calculateSkillCost(0, currentLevel - finalRaceContribution);
          updates[`system.skills.${skillKey}.level`] = 0;
          updates[`system.skills.${skillKey}.hasSkill`] = false;
        } else {
          // Reduce skill level
          experienceRefund += this._calculateSkillCost(newLevel, currentLevel - finalRaceContribution);
          updates[`system.skills.${skillKey}.level`] = newLevel;
        }
      }
    }

    return experienceRefund;
  }

  /**
   * Apply skills from new race
   * @param {Object} raceSkills - Race skills to apply
   * @param {Object} updates - Updates object to modify
   * @returns {number} Experience points cost
   * @private
   */
  _applyRaceSkills(raceSkills, updates) {
    const currentSkills = this.actor.system.skills || {};
    let totalExperienceCost = 0;

    for (const [skillKey, targetLevel] of Object.entries(raceSkills)) {
      const currentSkill = currentSkills[skillKey];
      if (!currentSkill) continue;

      const currentLevel = currentSkill.level || 0;

      // Don't exceed +++ (level 3) or reduce existing skills
      if (currentLevel >= 3 || targetLevel <= currentLevel) continue;

      // Calculate cost for skill upgrade
      const skillCost = this._calculateSkillCost(currentLevel, targetLevel);
      totalExperienceCost += skillCost;

      // Update skill
      updates[`system.skills.${skillKey}.level`] = targetLevel;
      updates[`system.skills.${skillKey}.hasSkill`] = true;
    }

    return totalExperienceCost;
  }

  /**
   * Calculate experience cost for skill upgrade
   * @param {number} fromLevel - Current skill level
   * @param {number} toLevel - Target skill level
   * @returns {number} Experience cost
   * @private
   */
  _calculateSkillCost(fromLevel, toLevel) {
    let cost = 0;
    for (let level = fromLevel + 1; level <= toLevel; level++) {
      cost += level; // Level 1 costs 1, level 2 costs 2, level 3 costs 3
    }
    return cost;
  }

  /**
   * Calculate effective spell degree for tooltip calculations
   * This centralizes the logic for determining if a spell has matching elements
   */
  _calculateSpellDegreeForTooltip(spell) {
    const magicDegree = this.actor.system.magic?.degree?.value || 0;
    
    if (magicDegree === 0) {
      return 0;
    }
    
    // Get available elements using the same logic as the existing prepareAvailableElements
    const availableElements = this._getAvailableElements(this.actor);
    
    // Check if the character has at least one of the spell's elements
    let hasMatchingElement = false;
    if (spell.system.elements) {
      for (const element in spell.system.elements) {
        if (spell.system.elements[element] === true && availableElements[element] === true) {
          hasMatchingElement = true;
          break;
        }
      }
    }
    
    // Return effective degree based on whether character has matching element
    if (hasMatchingElement) {
      return magicDegree;
    } else {
      return Math.max(1, magicDegree - 2); // Keep existing logic for displays
    }
  }

  /**
   * Check spell requirements and return spell usability info
   */
  _checkSpellRequirements(spell, context = null) {
    const systemData = context?.system || this.actor.system;
    const magicDegree = systemData.magic?.degree?.effectiveValue || systemData.magic?.degree?.value || 0;
    const magicLevel = systemData.magic?.level?.effectiveValue || systemData.magic?.level?.value || 0;
    const intelligenceCoefficient = systemData.abilities?.eyf?.mod || 0;
    const spellLevel = spell.system.level || 1;
    
    
    const issues = [];
    
    // Check magic degree
    if (magicDegree === 0) {
      issues.push(game.i18n.localize('ANDRAGATHIMA.SpellInsufficientNoMagicDegree'));
      return { effectiveDegree: 0, issues };
    }
    
    // Check magic level requirement
    if (magicLevel < spellLevel) {
      issues.push(game.i18n.format('ANDRAGATHIMA.SpellInsufficientMagicLevel', {
        level: spellLevel,
        current: magicLevel
      }));
    }
    
    // Check intelligence coefficient requirement  
    if (intelligenceCoefficient < spellLevel) {
      issues.push(game.i18n.format('ANDRAGATHIMA.SpellInsufficientIntelligence', {
        level: spellLevel,
        current: intelligenceCoefficient
      }));
    }
    
    // If basic requirements not met, return early
    if (issues.length > 0) {
      return { effectiveDegree: -1, issues };
    }
    
    // Get available elements using the same logic as the existing prepareAvailableElements
    const availableElements = this._getAvailableElements(this.actor);
    
    // Check if the character has at least one of the spell's elements
    let hasMatchingElement = false;
    if (spell.system.elements) {
      for (const element in spell.system.elements) {
        if (spell.system.elements[element] === true && availableElements[element] === true) {
          hasMatchingElement = true;
          break;
        }
      }
    }
    
    // Return effective degree based on whether character has matching element
    if (hasMatchingElement) {
      return { effectiveDegree: magicDegree, issues };
    } else {
      const effectiveDegree = magicDegree - 2;
      if (effectiveDegree <= 0) {
        issues.push(game.i18n.localize('ANDRAGATHIMA.SpellInsufficientElements'));
      }
      return { effectiveDegree, issues };
    }
  }

  /**
   * Calculate spell area display for tooltip (similar to range calculation)
   */
  _calculateSpellAreaDisplayForTooltip(spell, multiplier) {
    const effectiveDegree = this._calculateSpellDegreeForTooltip(spell);
    
    if (effectiveDegree === 0) {
      return `${game.i18n.localize('ANDRAGATHIMA.SpellAreaBurst')} ${this._formatNumber(multiplier)} m/βαθμό`;
    }
    
    const area = multiplier * effectiveDegree;
    return `${game.i18n.localize('ANDRAGATHIMA.SpellAreaBurst')} ${this._formatNumber(area)} m`;
  }

  /**
   * Calculate spell duration display for tooltip (similar to range and area calculations)
   */
  _calculateSpellDurationDisplayForTooltip(spell, durationType) {
    const effectiveDegree = this._calculateSpellDegreeForTooltip(spell);
    
    if (effectiveDegree === 0) {
      return this._getDurationUnitStringForTooltip(durationType, true);
    }
    
    // For five_minutes_per_degree and ten_minutes_per_degree, the unit string already includes the calculated value
    if (durationType === 'five_minutes_per_degree' || durationType === 'ten_minutes_per_degree') {
      return this._getDurationUnitStringForTooltip(durationType, false, effectiveDegree);
    }
    
    return `${this._formatNumber(effectiveDegree)} ${this._getDurationUnitStringForTooltip(durationType, false, effectiveDegree)}`;
  }

  /**
   * Get duration unit string for tooltip
   */
  _getDurationUnitStringForTooltip(durationType, isFormula, duration = 1) {
    switch (durationType) {
      case 'round_per_degree':
        return isFormula ? game.i18n.localize('ANDRAGATHIMA.RoundPerDegree') : (duration === 1 ? game.i18n.localize('ANDRAGATHIMA.Round') : game.i18n.localize('ANDRAGATHIMA.Rounds'));
      case 'minute_per_degree':
        return isFormula ? game.i18n.localize('ANDRAGATHIMA.MinutePerDegree') : (duration === 1 ? game.i18n.localize('ANDRAGATHIMA.Minute') : game.i18n.localize('ANDRAGATHIMA.Minutes'));
      case 'five_minutes_per_degree':
        if (isFormula) return game.i18n.localize('ANDRAGATHIMA.FiveMinutesPerDegree');
        const fiveMinutes = duration * 5;
        return fiveMinutes === 5 ? `5 ${game.i18n.localize('ANDRAGATHIMA.Minutes')}` : `${this._formatNumber(fiveMinutes)} ${game.i18n.localize('ANDRAGATHIMA.Minutes')}`;
      case 'ten_minutes_per_degree':
        if (isFormula) return game.i18n.localize('ANDRAGATHIMA.TenMinutesPerDegree');
        const tenMinutes = duration * 10;
        return tenMinutes === 10 ? `10 ${game.i18n.localize('ANDRAGATHIMA.Minutes')}` : `${this._formatNumber(tenMinutes)} ${game.i18n.localize('ANDRAGATHIMA.Minutes')}`;
      case 'hour_per_degree':
        return isFormula ? game.i18n.localize('ANDRAGATHIMA.HourPerDegree') : (duration === 1 ? game.i18n.localize('ANDRAGATHIMA.Hour') : game.i18n.localize('ANDRAGATHIMA.Hours'));
      default:
        return "";
    }
  }

  /**
   * Handle points lock/unlock toggle
   * @param {Event} event   The originating click event
   * @private
   */
  async _onPointsLockToggle(event) {
    event.preventDefault();
    
    // Check if user has permission (GM or Assistant only)
    const userRole = game.user.role;
    if (userRole < CONST.USER_ROLES.ASSISTANT) {
      ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.NoPermissionToChangeLockState'));
      return;
    }
    
    const currentLocked = this.actor.system.pointsLocked || false;
    const newLocked = !currentLocked;
    
    await this.actor.update({"system.pointsLocked": newLocked});
    
    // Update the UI immediately
    this._updatePointsTabState(this.element);
  }

  /**
   * Update the points tab state based on lock status and user permissions
   * @param {jQuery} html   The HTML element
   * @private
   */
  _updatePointsTabState(html) {
    const pointsTab = html.find('.tab.points');
    const isLocked = this.actor.system.pointsLocked || false;
    const userRole = game.user.role;
    
    // Update data attributes
    pointsTab.attr('data-points-locked', isLocked.toString());
    
    // Update button image and tooltip
    const lockButton = html.find('.points-lock-toggle');
    const lockImage = lockButton.find('img');
    
    if (isLocked) {
      lockImage.attr('src', 'systems/andragathima/assets/lock.png');
      lockImage.attr('alt', 'Locked');
      lockButton.attr('title', 'Ξεκλείδωμα');
    } else {
      lockImage.attr('src', 'systems/andragathima/assets/unlock.png');
      lockImage.attr('alt', 'Unlocked');
      lockButton.attr('title', 'Κλείδωμα');
    }
    
    lockButton.attr('data-locked', isLocked.toString());
    
    // Hide/show race section based on lock status (for everyone)
    const raceSection = html.find('.race-edit-section');
    if (isLocked) {
      raceSection.hide();
    } else {
      raceSection.show();
    }
    
    // Update button states when lock status changes
    this._updateButtonStates(this.element);
  }

  /**
   * Handle experience points field changes
   * @param {Event} event   The originating change event
   * @private
   */
  async _onExperiencePointsChange(event) {
    event.preventDefault();
    
    // Check if user has permission (GM or Assistant only)
    const userRole = game.user.role;
    if (userRole < CONST.USER_ROLES.ASSISTANT) {
      ui.notifications.warn(game.i18n.localize('ANDRAGATHIMA.NoPermissionToChangeExperience'));
      event.target.value = this.actor.system.details?.experience?.value || 0;
      return;
    }
    
    const newValue = parseInt(event.target.value) || 0;
    await this.actor.update({"system.details.experience.value": newValue});
    
    // Update available experience display (for characters and NPCs)
    if (this.actor.type === 'character' || this.actor.type === 'npc') {
      this._updateAvailableExperienceDisplay();
    }
    
    // Update experience display and button states after render
    setTimeout(() => {
      this._updateAvailableExperienceDisplay();
    }, 10);
  }

  /**
   * Update GM/Assistant control visibility based on user role
   * @param {jQuery} html   The HTML element
   * @private
   */
  _updateGMControlsVisibility(html) {
    const userRole = game.user.role;
    const isGMOrAssistant = userRole >= CONST.USER_ROLES.ASSISTANT;
    
    // Set data attribute for CSS targeting
    html.attr('data-gm', isGMOrAssistant.toString());
    
    const experienceContainer = html.find('.experience-points-container');
    const lockButton = html.find('.points-lock-toggle');
    const availableDisplay = html.find('.available-experience-display');
    
    if (isGMOrAssistant) {
      experienceContainer.removeClass('hidden').show();
      lockButton.removeClass('hidden').show();
    } else {
      experienceContainer.addClass('hidden').hide();
      lockButton.addClass('hidden').hide();
    }
    
    // Always show available experience points display for everyone
    availableDisplay.removeClass('hidden').show();
  }

  /**
   * Update the available experience points display
   * @private
   */
  _updateAvailableExperienceDisplay() {
    // Recalculate experience points fresh each time
    const totalExperience = parseInt(this.actor.system.details?.experience?.value) || 0;
    const spentExperience = this._calculateTotalSpentExperience();
    const remainingExperience = totalExperience - spentExperience;
    
    // Display remaining experience points (not total)
    this.element.find('.available-experience-value').text(remainingExperience);
    
    // Also update the GM input field if it exists
    this.element.find('.experience-points-field').val(totalExperience);
    
    // Update button states based on new experience values
    this._updateButtonStates(this.element);
  }
  
  /**
   * Calculate total spent experience points in real-time
   * @private
   */
  _calculateTotalSpentExperience() {
    const system = this.actor.system;
    let totalExp = 0;
    
    // Add racial experience cost
    if (system.details.race.value) {
      const raceData = CONFIG.ANDRAGATHIMA.raceModifiers[system.details.race.value];
      if (raceData && raceData.experienceCost) {
        totalExp += raceData.experienceCost;
      }
    }
    
    // Add experience from abilities
    for (let ability of Object.values(system.abilities)) {
      const abilityValue = ability.totalValue || (ability.value + (ability.racialMod || 0));
      totalExp += this._calculateAbilityExp(abilityValue);
    }
    
    // Add experience from combat abilities (costs +2 for each +1)
    if (system.combat.melee && system.combat.melee.value > 0) {
      totalExp += system.combat.melee.value * 2;
    }
    if (system.combat.ranged && system.combat.ranged.value > 0) {
      totalExp += system.combat.ranged.value * 2;
    }
    
    // Add experience for base saves
    for (let save of Object.values(system.saves)) {
      if (save.base > 0) {
        totalExp += save.base;
      }
    }
    
    // Add experience from skills (1 point per level)
    for (let skill of Object.values(system.skills)) {
      if (skill.hasSkill && skill.level > 0) {
        totalExp += skill.level;
      }
    }
    
    // Add experience from magic (Mage Level × Magic Degree)
    if (system.magic && system.magic.level && system.magic.degree) {
      const mageLevel = system.magic.level.value || 0;
      const magicDegree = system.magic.degree.value || 0;
      totalExp += mageLevel * magicDegree;
      
      // Add experience for spells in spellbook (1 point per spell if Degree > 0 and Level > 0)
      if (mageLevel > 0 && magicDegree > 0) {
        const spellCount = this.actor.items.filter(item => item.type === "spell").length;
        totalExp += spellCount;
      }
    }
    
    return totalExp;
  }

  /**
   * Update button states based on lock status and limits
   * @param {jQuery} html   The HTML element (optional, defaults to this.element)
   * @private
   */
  _updateButtonStates(html = null) {
    const element = html || this.element;
    const userRole = game.user.role;
    const isGMOrAssistant = userRole >= CONST.USER_ROLES.ASSISTANT;
    const isLocked = this.actor.system.pointsLocked;
    
    // 1. Handle lock state (only for players, not GM/Assistant) 
    if (isLocked && !isGMOrAssistant) {
      element.find('.ability-decrease, .save-decrease, .combat-decrease, .skill-decrease, .magic-decrease')
        .addClass('disabled-by-lock').prop('disabled', true);
    } else {
      // Only remove lock classes if not locked or if GM/Assistant
      element.find('.ability-decrease, .save-decrease, .combat-decrease, .skill-decrease, .magic-decrease')
        .removeClass('disabled-by-lock');
    }
    
    // 2. Handle minimum limits for - buttons (for everyone, including GM)
    this._updateButtonLimits(element);
    
    // 3. Handle maximum limits and experience for + buttons
    this._updateIncreaseButtonLimits(element, isGMOrAssistant);
  }
  
  /**
   * Update button limits based on current values (applies to everyone)
   * @param {jQuery} element   The HTML element
   * @private
   */
  _updateButtonLimits(element) {
    // Check ability buttons
    element.find('.ability-decrease').each((index, button) => {
      const $button = $(button);
      const abilityKey = $button.data('ability');
      const currentValue = this.actor.system.abilities[abilityKey]?.value || 0;
      const racialMod = this.actor.system.abilities[abilityKey]?.racialMod || 0;
      const currentTotal = currentValue + racialMod;
      
      // Different limits for NPCs vs Characters
      const minLimit = this.actor.type === 'npc' ? 0 : 6;
      const shouldBeDisabled = currentTotal <= minLimit;
      const currentlyDisabled = $button.hasClass('disabled-by-limit');
      
      // Only update if state needs to change
      if (shouldBeDisabled && !currentlyDisabled) {
        $button.prop('disabled', true).addClass('disabled-by-limit');
      } else if (!shouldBeDisabled && currentlyDisabled) {
        $button.prop('disabled', false).removeClass('disabled-by-limit');
      }
    });
    
    // Check save buttons
    element.find('.save-decrease').each((index, button) => {
      const $button = $(button);
      const saveKey = $button.data('save');
      const currentBase = this.actor.system.saves[saveKey]?.base || 0;
      
      const shouldBeDisabled = currentBase <= 0;
      const currentlyDisabled = $button.hasClass('disabled-by-limit');
      
      // Only update if state needs to change
      if (shouldBeDisabled && !currentlyDisabled) {
        $button.prop('disabled', true).addClass('disabled-by-limit');
      } else if (!shouldBeDisabled && currentlyDisabled) {
        $button.prop('disabled', false).removeClass('disabled-by-limit');
      }
    });
    
    // Check combat buttons
    element.find('.combat-decrease').each((index, button) => {
      const $button = $(button);
      const combatKey = $button.data('combat');
      const currentValue = this.actor.system.combat[combatKey]?.value || 0;
      
      const shouldBeDisabled = currentValue <= 0;
      const currentlyDisabled = $button.hasClass('disabled-by-limit');
      
      // Only update if state needs to change
      if (shouldBeDisabled && !currentlyDisabled) {
        $button.prop('disabled', true).addClass('disabled-by-limit');
      } else if (!shouldBeDisabled && currentlyDisabled) {
        $button.prop('disabled', false).removeClass('disabled-by-limit');
      }
    });
    
    // Check skill buttons
    element.find('.skill-decrease').each((index, button) => {
      const $button = $(button);
      const skillKey = $button.data('skill');
      const skill = this.actor.system.skills[skillKey];
      
      const shouldBeDisabled = !skill || !skill.hasSkill || skill.level <= 0;
      const currentlyDisabled = $button.hasClass('disabled-by-limit');
      
      // Only update if state needs to change
      if (shouldBeDisabled && !currentlyDisabled) {
        $button.prop('disabled', true).addClass('disabled-by-limit');
      } else if (!shouldBeDisabled && currentlyDisabled) {
        $button.prop('disabled', false).removeClass('disabled-by-limit');
      }
    });
    
    // Check magic decrease buttons (both level and degree)
    element.find('.magic-decrease').each((index, button) => {
      const $button = $(button);
      const magicType = $button.data('magic'); // 'level' or 'degree'
      const currentLevel = this.actor.system.magic?.level?.value || 0;
      const currentDegree = this.actor.system.magic?.degree?.value || 0;
      
      const shouldBeDisabled = (magicType === 'level' && currentLevel <= 0) || (magicType === 'degree' && currentDegree <= 0);
      const currentlyDisabled = $button.hasClass('disabled-by-limit');
      
      // Only update if state needs to change
      if (shouldBeDisabled && !currentlyDisabled) {
        $button.prop('disabled', true).addClass('disabled-by-limit');
      } else if (!shouldBeDisabled && currentlyDisabled) {
        $button.prop('disabled', false).removeClass('disabled-by-limit');
      }
    });
  }
  
  /**
   * Update increase button limits based on maximum values and experience
   * @param {jQuery} element   The HTML element
   * @param {boolean} isGMOrAssistant   Whether user is GM/Assistant
   * @private
   */
  _updateIncreaseButtonLimits(element, isGMOrAssistant) {
    // Get available experience points (only needed for players, NPCs have no restrictions)
    let availableExperience = 0;
    if (!isGMOrAssistant && this.actor.type === 'character') {
      // Calculate real-time available experience
      const totalExperience = parseInt(this.actor.system.details?.experience?.value) || 0;
      const spentExperience = this._calculateTotalSpentExperience();
      availableExperience = totalExperience - spentExperience;
    }
    
    // Check ability increase buttons
    element.find('.ability-increase').each((index, button) => {
      const $button = $(button);
      const abilityKey = $button.data('ability');
      const currentValue = this.actor.system.abilities[abilityKey]?.value || 0;
      const racialMod = this.actor.system.abilities[abilityKey]?.racialMod || 0;
      const currentTotal = currentValue + racialMod;
      
      let shouldBeDisabled = false;
      let disabledClass = '';
      
      // Check maximum limit (different for NPCs vs Characters)
      const maxLimit = this.actor.type === 'npc' ? 50 : 25;
      if (currentTotal >= maxLimit) {
        shouldBeDisabled = true;
        disabledClass = 'disabled-by-limit';
      }
      // Check experience cost (only for players, not NPCs)
      else if (!isGMOrAssistant && this.actor.type === 'character') {
        const experienceCost = 1; // Abilities cost 1 each
        if (availableExperience < experienceCost) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-xp';
        }
      }
      
      // Only update if state changed
      const currentlyDisabled = $button.hasClass('disabled-by-limit') || $button.hasClass('disabled-by-xp');
      if (shouldBeDisabled !== currentlyDisabled) {
        $button.removeClass('disabled-by-limit disabled-by-xp').prop('disabled', false);
        if (shouldBeDisabled) {
          $button.addClass(disabledClass).prop('disabled', true);
        }
      }
    });
    
    // Check save increase buttons
    element.find('.save-increase').each((index, button) => {
      const $button = $(button);
      const saveKey = $button.data('save');
      const currentBase = this.actor.system.saves[saveKey]?.base || 0;
      
      let shouldBeDisabled = false;
      let disabledClass = '';
      
      // Check maximum limit (applies to everyone)
      if (currentBase >= 20) {
        shouldBeDisabled = true;
        disabledClass = 'disabled-by-limit';
      }
      // Check experience cost (only for players, not NPCs)
      else if (!isGMOrAssistant && this.actor.type === 'character') {
        const experienceCost = 1; // Saves cost 1 each
        if (availableExperience < experienceCost) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-xp';
        }
      }
      
      // Only update if state changed
      const currentlyDisabled = $button.hasClass('disabled-by-limit') || $button.hasClass('disabled-by-xp');
      if (shouldBeDisabled !== currentlyDisabled) {
        $button.removeClass('disabled-by-limit disabled-by-xp').prop('disabled', false);
        if (shouldBeDisabled) {
          $button.addClass(disabledClass).prop('disabled', true);
        }
      }
    });
    
    // Check combat increase buttons
    element.find('.combat-increase').each((index, button) => {
      const $button = $(button);
      const combatKey = $button.data('combat');
      const currentValue = this.actor.system.combat[combatKey]?.value || 0;
      
      let shouldBeDisabled = false;
      let disabledClass = '';
      
      // Check maximum limit (applies to everyone)
      if (currentValue >= 20) {
        shouldBeDisabled = true;
        disabledClass = 'disabled-by-limit';
      }
      // Check experience cost (only for players, not NPCs)
      else if (!isGMOrAssistant && this.actor.type === 'character') {
        const experienceCost = 2; // Combat costs 2 each
        if (availableExperience < experienceCost) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-xp';
        }
      }
      
      // Only update if state changed
      const currentlyDisabled = $button.hasClass('disabled-by-limit') || $button.hasClass('disabled-by-xp');
      if (shouldBeDisabled !== currentlyDisabled) {
        $button.removeClass('disabled-by-limit disabled-by-xp').prop('disabled', false);
        if (shouldBeDisabled) {
          $button.addClass(disabledClass).prop('disabled', true);
        }
      }
    });
    
    // Check skill increase buttons
    element.find('.skill-increase').each((index, button) => {
      const $button = $(button);
      const skillKey = $button.data('skill');
      const skill = this.actor.system.skills[skillKey];
      
      if (!skill) return;
      
      let shouldBeDisabled = false;
      let disabledClass = '';
      
      // Check maximum limit (applies to everyone)
      if (skill.hasSkill && skill.level >= skill.maxLevel) {
        shouldBeDisabled = true;
        disabledClass = 'disabled-by-limit';
      }
      // Check experience cost (only for players, not NPCs)
      else if (!isGMOrAssistant && this.actor.type === 'character') {
        const experienceCost = 1; // Skills cost 1 each
        if (availableExperience < experienceCost) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-xp';
        }
      }
      
      // Only update if state changed
      const currentlyDisabled = $button.hasClass('disabled-by-limit') || $button.hasClass('disabled-by-xp');
      if (shouldBeDisabled !== currentlyDisabled) {
        $button.removeClass('disabled-by-limit disabled-by-xp').prop('disabled', false);
        if (shouldBeDisabled) {
          $button.addClass(disabledClass).prop('disabled', true);
        }
      }
    });
    
    // Check magic increase buttons (both level and degree)
    element.find('.magic-increase').each((index, button) => {
      const $button = $(button);
      const magicType = $button.data('magic'); // 'level' or 'degree'
      const currentLevel = this.actor.system.magic?.level?.value || 0;
      const currentDegree = this.actor.system.magic?.degree?.value || 0;
      
      let shouldBeDisabled = false;
      let disabledClass = '';
      
      if (magicType === 'level') {
        // Magic level increase
        // Check maximum limit (applies to everyone)  
        if (currentLevel >= 5) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-limit';
        }
        // Check experience cost (only for players, not NPCs)
        else if (!isGMOrAssistant && this.actor.type === 'character') {
          const experienceCost = currentDegree || 1; // Cost = magic degree
          if (availableExperience < experienceCost) {
            shouldBeDisabled = true;
            disabledClass = 'disabled-by-xp';
          }
        }
      } else if (magicType === 'degree') {
        // Magic degree increase
        // Check maximum limit (applies to everyone)
        if (currentDegree >= 20) {
          shouldBeDisabled = true;
          disabledClass = 'disabled-by-limit';
        }
        // Check experience cost (only for players, not NPCs)
        else if (!isGMOrAssistant && this.actor.type === 'character') {
          const experienceCost = currentLevel || 1; // Cost = mage level
          if (availableExperience < experienceCost) {
            shouldBeDisabled = true;
            disabledClass = 'disabled-by-xp';
          }
        }
      }
      
      // Only update if state changed
      const currentlyDisabled = $button.hasClass('disabled-by-limit') || $button.hasClass('disabled-by-xp');
      if (shouldBeDisabled !== currentlyDisabled) {
        $button.removeClass('disabled-by-limit disabled-by-xp').prop('disabled', false);
        if (shouldBeDisabled) {
          $button.addClass(disabledClass).prop('disabled', true);
        }
      }
    });
  }


  /**
   * Apply status modifiers to magic values
   */
  _applyStatusModifiersToMagic(context) {
    const flags = context.actor.flags.andragathima || {};
    const modifiers = flags.modifiers?.other || {};
    
    const magicLevelMod = modifiers.magicLevel || 0;
    const magicDegreeMod = modifiers.magicDegree || 0;
    
    
    // Apply to magic level
    if (context.system.magic?.level) {
      const originalLevel = context.system.magic.level.value || 0;
      context.system.magic.level.totalValue = originalLevel + magicLevelMod;
      context.system.magic.level.effectiveValue = originalLevel + magicLevelMod;
      context.system.magic.level.statusMod = magicLevelMod;
    }
    
    // Apply to magic degree
    if (context.system.magic?.degree) {
      const originalDegree = context.system.magic.degree.value || 0;
      context.system.magic.degree.totalValue = originalDegree + magicDegreeMod;
      context.system.magic.degree.effectiveValue = originalDegree + magicDegreeMod;
      context.system.magic.degree.statusMod = magicDegreeMod;
    }
  }

  /**
   * Handle tab click sound effect
   * @param {Event} event   The originating click event
   * @private
   */
  _onTabClick(event) {
    // Play tab switch sound effect
    foundry.audio.AudioHelper.play({ src: "systems/andragathima/assets/sounds/GAM_05.wav", volume: 0.8 }, false);
  }

  /**
   * Handle creating a new active effect
   */
  async _onManageActiveEffect(event) {
    event.preventDefault();
    const a = event.currentTarget;
    
    // Handle different element types
    let action = a.dataset.action;
    let effectId = a.dataset.effectId;
    
    // For effect-delete buttons, set action to delete
    if (a.classList.contains('effect-delete')) {
      action = 'delete';
      effectId = a.dataset.effectId;
    }
    // For effect slots with effects, set action to edit
    else if (a.classList.contains('effect-slot') && a.classList.contains('has-effect')) {
      action = 'edit';
      effectId = a.dataset.effectId;
    }
    // For add-effect-slot, set action to create
    else if (a.classList.contains('add-effect-slot')) {
      action = 'create';
    }

    switch (action) {
      case "create":
        return this._onCreateActiveEffect();
      case "edit":
        const effect = this.actor.effects.get(effectId);
        return effect?.sheet.render(true);
      case "delete":
        return this._onDeleteActiveEffect(effectId);
      case "toggle":
        const toggleEffect = this.actor.effects.get(effectId);
        return toggleEffect?.update({disabled: !toggleEffect.disabled});
    }
  }

  /**
   * Handle creating a new active effect
   */
  async _onCreateActiveEffect() {
    const effectData = {
      name: game.i18n.localize('ANDRAGATHIMA.NewStatus'),
      icon: "icons/svg/aura.svg",
      changes: [],
      disabled: false,
      transfer: false
    };
    
    const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    if (created.length > 0) {
      created[0].sheet.render(true);
    }
  }

  /**
   * Handle deleting an active effect
   */
  async _onDeleteActiveEffect(effectId) {
    const effect = this.actor.effects.get(effectId);
    if (!effect) return;
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('ANDRAGATHIMA.DeleteStatus'),
      content: `<p>Θέλετε να διαγράψετε την κατάσταση "${effect.name}";</p>`
    });
    
    if (confirmed) {
      await effect.delete();
      ui.notifications.info(`Διαγράφηκε η κατάσταση "${effect.name}"`);
    }
  }

  /**
   * Handle toggling an active effect (right-click)
   */
  async _onToggleActiveEffect(event) {
    event.preventDefault();
    const effectId = event.currentTarget.dataset.effectId;
    const effect = this.actor.effects.get(effectId);
    
    if (!effect) return;
    
    const newState = !effect.disabled;
    await effect.update({disabled: newState});
    
    const statusText = newState ? game.i18n.localize('ANDRAGATHIMA.StatusDeactivated') : game.i18n.localize('ANDRAGATHIMA.StatusActivated');
    ui.notifications.info(`Η κατάσταση "${effect.name}" ${statusText}`);
  }

  /**
   * Handle toggling item display on token (right-click on quick slots and shield slot)
   */
  async _onToggleWeaponDisplay(event) {
    event.preventDefault();
    
    // Get the item ID from the image element
    const img = event.currentTarget.querySelector('img[data-item-id]');
    if (!img) return;
    
    const itemId = img.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item || (item.type !== 'weapon' && item.type !== 'ammunition')) return;
    
    // Ensure showOnToken field exists, default to false if not present
    const currentState = item.system.showOnToken ?? false;
    const newState = !currentState;
    
    await item.update({"system.showOnToken": newState});
    
    // Force re-render of the actor sheet to update the display
    this.render();
  }

  /**
   * Prepare enriched equipment data with actual item properties for templates
   */
  _prepareEnrichedEquipment(context) {
    // Enrich quick items with actual item data
    if (context.system.equipment?.quickItems) {
      for (let i = 0; i < context.system.equipment.quickItems.length; i++) {
        const quickItem = context.system.equipment.quickItems[i];
        if (quickItem.id) {
          const item = this.actor.items.get(quickItem.id);
          if (item) {
            // Merge the slot data with actual item data
            const itemData = item.toObject();
            context.system.equipment.quickItems[i] = {
              ...quickItem,
              ...itemData
            };
          }
        }
      }
    }

    // Enrich equipment slots with actual item data
    if (context.system.equipment?.slots) {
      const slots = context.system.equipment.slots;
      for (const [slotName, slotData] of Object.entries(slots)) {
        if (slotData.id) {
          const item = this.actor.items.get(slotData.id);
          if (item) {
            // Merge the slot data with actual item data
            const itemData = item.toObject();
            context.system.equipment.slots[slotName] = {
              ...slotData,
              ...itemData
            };
          }
        }
      }
    }
  }

  /**
   * Roll Ability Check with NPC toggle support
   */
  async _rollAbilityCheck(dataset) {
    const ability = dataset.ability;
    // Target numbers toggle only affects display, calculations remain the same
    return this.actor.rollAbilityCheck(ability);
  }

  /**
   * Roll Save with NPC toggle support
   */
  async _rollSave(dataset) {
    const saveType = dataset.saveType;
    // Target numbers toggle only affects display, calculations remain the same
    return this.actor.rollSave(saveType);
  }

  /**
   * Prepare Container type specific data
   */
  _prepareContainerData(context) {
    // Use the standard misc equipment slots method that respects miscSlotIndex flags
    context.miscEquipmentSlots = this._getMiscEquipmentSlots();
    
    // Create enriched items for template display
    const enrichedItems = context.miscEquipmentSlots.map(item => {
      if (item) {
        return this._enrichMiscItem(item);
      }
      return null;
    });
    
    // Store in system.miscellaneous.items for template compatibility  
    context.system.miscellaneous = {
      items: enrichedItems
    };
  }

  /**
   * Enrich item with additional display data for container
   */
  _enrichMiscItem(item) {
    const enriched = item.toObject();
    return enriched;
  }

  /**
   * Prepare Note-specific data
   */
  _prepareNoteData(context) {
    // Notes are simple and don't need complex data preparation
    // The rich text editor will handle the content editing
    // Just ensure the notes field exists
    if (!context.system.notes) {
      context.system.notes = {
        content: ""
      };
    }
  }
  
}