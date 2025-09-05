/**
 * Extend the basic ItemSheet for ΑΝΔΡΑΓΑΘΗΜΑ
 * @extends {ItemSheet}
 */
export class AndragathimaItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["andragathima", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/andragathima/templates/item";
    // Return different templates based on item type
    switch (this.item.type) {
      case 'weapon':
        return `${path}/weapon-sheet.html`;
      case 'armor':
        return `${path}/armor-sheet.html`;
      case 'equipment':
        return `${path}/equipment-sheet.html`;
      case 'ammunition':
        return `${path}/ammunition-sheet.html`;
      case 'miscellaneous':
        return `${path}/miscellaneous-sheet.html`;
      case 'spell':
        return `${path}/spell-sheet.html`;
      case 'skill':
        return `${path}/skill-sheet.html`;
      default:
        return `${path}/item-sheet.html`;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item.toObject(false);

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Adding CONFIG for dropdowns
    context.config = CONFIG.ANDRAGATHIMA;

    // Item type specific data
    this._prepareItemTypeData(context);

    // Prepare effects tooltips
    this._prepareEffectsTooltips(context);

    return context;
  }

  /**
   * Prepare type-specific data for the item sheet
   */
  _prepareItemTypeData(context) {
    const itemData = context.system;
    const itemType = context.item.type;

    switch (itemType) {
      case 'weapon':
        // Weapon type choices
        context.weaponTypes = CONFIG.ANDRAGATHIMA.weaponTypes;
        context.damageTypes = CONFIG.ANDRAGATHIMA.damageTypes;
        context.weaponProperties = CONFIG.ANDRAGATHIMA.weaponProperties;
        break;
        
      case 'armor':
        // Armor type choices
        context.armorTypes = CONFIG.ANDRAGATHIMA.armorTypes;
        break;
        
      case 'spell':
        // Spell school choices
        context.spellSchools = CONFIG.ANDRAGATHIMA.spellSchools;
        context.spellLevels = {
          0: game.i18n.localize('ANDRAGATHIMA.DegreeZero'),
          1: game.i18n.localize('ANDRAGATHIMA.DegreeFirst'),
          2: game.i18n.localize('ANDRAGATHIMA.DegreeSecond'),
          3: game.i18n.localize('ANDRAGATHIMA.DegreeThird'),
          4: game.i18n.localize('ANDRAGATHIMA.DegreeFourth'),
          5: game.i18n.localize('ANDRAGATHIMA.DegreeFifth')
        };
        
        // Calculate ranged spell display
        if (itemData.range?.type === 'ranged') {
          context.system.rangeDisplay = this._calculateSpellRangeDisplay(itemData);
        }
        
        // Calculate area display for burst2 and burst5
        if (itemData.area?.type === 'burst2' || itemData.area?.type === 'burst5') {
          context.system.areaDisplay = this._calculateSpellAreaDisplay(itemData);
        }
        
        // Calculate duration display for per-degree durations
        if (itemData.duration?.type === 'round_per_degree' || 
            itemData.duration?.type === 'minute_per_degree' || 
            itemData.duration?.type === 'five_minutes_per_degree' || 
            itemData.duration?.type === 'ten_minutes_per_degree' || 
            itemData.duration?.type === 'hour_per_degree') {
          context.system.durationDisplay = this._calculateSpellDurationDisplay(itemData);
        }
        break;
        
      case 'skill':
        // Skill levels
        context.skillLevels = {
          0: game.i18n.localize('ANDRAGATHIMA.SkillRankBeginner'),
          1: game.i18n.localize('ANDRAGATHIMA.SkillRankApprentice'),
          2: game.i18n.localize('ANDRAGATHIMA.SkillRankExperienced'),
          3: game.i18n.localize('ANDRAGATHIMA.SkillRankMaster')
        };
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Setup instant tooltips
    this._setupInstantTooltips(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Property toggles
    html.find('.property-toggle').click(this._onPropertyToggle.bind(this));

    // Resistance value changes
    html.find('.resistance-value').change(this._onResistanceChange.bind(this));

    // Effects management
    html.find('.add-effect-slot').click(this._onAddEffect.bind(this));
    html.find('.effect-slot.has-effect').click(this._onEditEffect.bind(this));
    html.find('.effect-delete').click(this._onDeleteEffect.bind(this));
    
    // Add right-click toggle functionality for effects
    html.find('.effect-slot.has-effect').on('contextmenu', this._onToggleEffect.bind(this));
    
    // Handle showOnToken checkbox change for weapons and ammunition
    html.find('input[name="system.showOnToken"]').change(this._onShowOnTokenChange.bind(this));
  }

  /**
   * Handle clickable rolls
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls
    if (dataset.rollType) {
      return this.item.roll();
    }
  }

  /**
   * Handle toggling weapon/armor properties
   */
  _onPropertyToggle(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const property = element.dataset.property;
    
    if (!property) return;

    // Toggle the property
    const currentValue = this.item.system.properties?.[property] || false;
    const updateData = {};
    updateData[`system.properties.${property}`] = !currentValue;
    
    this.item.update(updateData);
  }

  /**
   * Handle resistance value changes for armor
   */
  _onResistanceChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const resistance = element.dataset.resistance;
    const value = parseInt(element.value) || 0;
    
    if (!resistance) return;

    // Update the resistance value
    const updateData = {};
    updateData[`system.resistances.${resistance}`] = value;
    
    this.item.update(updateData);
  }

  /**
   * Calculate spell range display for ranged spells
   */
  _calculateSpellRangeDisplay(spellData) {
    const effectiveDegree = this._calculateSpellDegree(spellData);
    
    if (effectiveDegree === 0) {
      return "10 m/βαθμό";
    }
    
    const range = 10 * effectiveDegree;
    return `${this._formatNumber(range)} m`;
  }

  /**
   * Calculate spell area display for burst2 and burst5 spells
   */
  _calculateSpellAreaDisplay(spellData) {
    const effectiveDegree = this._calculateSpellDegree(spellData);
    const multiplier = spellData.area.type === 'burst2' ? 2 : 5;
    
    if (effectiveDegree === 0) {
      return `${this._formatNumber(multiplier)} m/βαθμό`;
    }
    
    const area = multiplier * effectiveDegree;
    return `${this._formatNumber(area)} m`;
  }

  /**
   * Calculate spell duration display for per-degree durations
   */
  _calculateSpellDurationDisplay(spellData) {
    const effectiveDegree = this._calculateSpellDegree(spellData);
    
    if (effectiveDegree === 0) {
      return this._getDurationUnitString(spellData.duration.type, true);
    }
    
    // For five_minutes_per_degree and ten_minutes_per_degree, the unit string already includes the calculated value
    if (spellData.duration.type === 'five_minutes_per_degree' || spellData.duration.type === 'ten_minutes_per_degree') {
      return this._getDurationUnitString(spellData.duration.type, false, effectiveDegree);
    }
    
    return `${this._formatNumber(effectiveDegree)} ${this._getDurationUnitString(spellData.duration.type, false, effectiveDegree)}`;
  }

  /**
   * Get duration unit string
   */
  _getDurationUnitString(durationType, isFormula, duration = 1) {
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
   * Format number display, replacing hyphen-minus (-) with proper minus sign (−) for negative numbers
   * @param {number|string} value - The number to format
   * @returns {string} - Formatted number with proper minus sign
   */
  _formatNumber(value) {
    if (value === null || value === undefined) return '';
    const str = value.toString();
    return str.replace(/^-/, '−');
  }

  /**
   * Calculate effective spell degree for spell calculations
   * This centralizes the logic for determining if a spell has matching elements
   */
  _calculateSpellDegree(spellData) {
    const actor = this.item.actor;
    
    if (!actor) {
      return 0; // No actor context
    }
    
    const magicDegree = actor.system.magic?.degree?.value || 0;
    
    if (magicDegree === 0) {
      return 0;
    }
    
    // Get available elements
    const availableElements = this._getAvailableElements(actor);
    
    // Check if the character has at least one of the spell's elements
    let hasMatchingElement = false;
    if (spellData.elements) {
      for (const element in spellData.elements) {
        if (spellData.elements[element] === true && availableElements[element] === true) {
          hasMatchingElement = true;
          break;
        }
      }
    }
    
    // Return effective degree based on whether character has matching element
    if (hasMatchingElement) {
      return magicDegree;
    } else {
      return Math.max(1, magicDegree - 2);
    }
  }

  /**
   * Get available elements for an actor (same logic as actor sheet)
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
   * Handle adding a new effect to the item
   */
  async _onAddEffect(event) {
    event.preventDefault();
    
    // Create a new effect
    const effect = {
      name: game.i18n.localize('ANDRAGATHIMA.NewEffect'),
      img: "icons/svg/aura.svg",
      origin: this.item.uuid,
      disabled: false,
      changes: [],
      duration: {},
      description: "",
      transfer: false
    };

    // Add the effect to the item
    await this.item.createEmbeddedDocuments("ActiveEffect", [effect]);
  }

  /**
   * Handle editing an effect
   */
  _onEditEffect(event) {
    event.preventDefault();
    const effectId = event.currentTarget.dataset.effectId;
    const effect = this.item.effects.get(effectId);
    
    if (effect) {
      effect.sheet.render(true);
    }
  }

  /**
   * Handle deleting an effect
   */
  async _onDeleteEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const effectId = event.currentTarget.dataset.effectId;
    const effect = this.item.effects.get(effectId);
    
    if (effect) {
      await effect.delete();
    }
  }

  /**
   * Handle toggling an effect (right-click)
   */
  async _onToggleEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const effectId = event.currentTarget.dataset.effectId;
    const effect = this.item.effects.get(effectId);
    
    if (!effect) return;
    
    const newState = !effect.disabled;
    await effect.update({disabled: newState});
    
    const statusText = newState ? game.i18n.localize('ANDRAGATHIMA.StatusDeactivated') : game.i18n.localize('ANDRAGATHIMA.StatusActivated');
    ui.notifications.info(`Το εφέ "${effect.name}" ${statusText}`);
  }

  /**
   * Handle showOnToken checkbox change for weapons and ammunition
   */
  async _onShowOnTokenChange(event) {
    event.preventDefault();
    
    // Only handle for weapon and ammunition items
    if (this.item.type !== 'weapon' && this.item.type !== 'ammunition') return;
    
    // Update the item's showOnToken field
    await this.item.update({"system.showOnToken": event.target.checked});
    
    // If this item belongs to an actor, refresh their sheet to update display
    if (this.item.actor) {
      this.item.actor.sheet.render();
    }
  }

  /**
   * Prepare tooltips for item effects
   */
  _prepareEffectsTooltips(context) {
    const effects = Array.from(this.item.effects);
    
    for (let effect of effects) {
      // Create tooltip for this effect
      let tooltip = `<strong>${effect.name}</strong>`;
      if (effect.changes && effect.changes.length > 0) {
        for (let change of effect.changes) {
          if (change.key && change.value) {
            // Convert system paths to readable labels
            const label = this._getEffectChangeLabel(change.key);
            const modeSymbol = change.mode === 2 ? "+" : (change.mode === 5 ? "=" : (change.mode === 6 ? ">=" : "×"));
            tooltip += `<br>${label} ${modeSymbol}${change.value}`;
          }
        }
      }
      
      // Add tooltip to effect object
      effect.tooltip = tooltip;
    }
  }

  /**
   * Get human-readable label for effect change key
   */
  _getEffectChangeLabel(key) {
    const labelMap = {
      'system.abilities.dyn.value': 'Δύναμη',
      'system.abilities.epi.value': 'Επιδεξιότητα', 
      'system.abilities.kra.value': 'Κράση',
      'system.abilities.eyf.value': 'Ευφυΐα',
      'system.abilities.sof.value': 'Σοφία',
      'system.abilities.xar.value': 'Χάρισμα',
      'system.saves.ant.base': 'Αντανακλαστικά',
      'system.saves.mya.base': 'Μυαλό',
      'system.saves.som.base': 'Σώμα',
      'system.combat.melee.value': 'Σώμα με σώμα',
      'system.combat.ranged.value': 'Μακρόθεν',
      'system.combat.meleeAttack.value': 'Επίθεση σώμα με σώμα',
      'system.combat.rangedAttack.value': 'Επίθεση μακρόθεν',
      'system.combat.meleeDefense.value': 'Άμυνα σώμα με σώμα',
      'system.combat.rangedDefense.value': 'Άμυνα μακρόθεν',
      'system.combat.initiative.value': 'Πρωτοβουλία',
      'system.resistances.base': 'Αντοχή',
      'system.resistances.diatrisi': 'Αντοχή διάτρησης',
      'system.resistances.kroysi': 'Αντοχή κρούσης',
      'system.resistances.tomi': 'Αντοχή τομής',
      'system.resistances.keravnos': 'Αντοχή κεραυνού',
      'system.resistances.oxy': 'Αντοχή οξέος',
      'system.resistances.fotia': 'Αντοχή φωτιάς',
      'system.resistances.psyxos': 'Αντοχή ψύχους',
      'system.resistances.magiki': 'Αντοχή μαγικής',
      'system.damage.base': 'Βασική ζημιά',
      'system.damage.diatrisi': 'Ζημιά διάτρησης',
      'system.damage.kroysi': 'Ζημιά κρούσης',
      'system.damage.tomi': 'Ζημιά τομής',
      'system.damage.keravnos': 'Ζημιά κεραυνού',
      'system.damage.oxy': 'Ζημιά οξέος',
      'system.damage.fotia': 'Ζημιά φωτιάς',
      'system.damage.psyxos': 'Ζημιά ψύχους',
      'system.damage.magiki': 'Ζημιά μαγικής',
      'system.damage.mental': 'Ζημιά μυαλού',
      'system.damage.desecration': 'Ζημιά βεβήλωσης',
      'system.other.speed.value': 'Ταχύτητα',
      'system.other.pali.value': 'Πάλη',
      'system.other.eystatheia.value': 'Ευστάθεια',
      'system.magic.degree.value': 'Βαθμός μαγείας'
    };
    
    return labelMap[key] || key;
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

}