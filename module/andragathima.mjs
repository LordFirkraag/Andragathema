/**
 * ΑΝΔΡΑΓΑΘΗΜΑ Game System for Foundry VTT
 * Greek Fantasy RPG System
 */


// Import document classes
import { AndragathimaActor } from "./documents/actor.mjs";
import { AndragathimaItem } from "./documents/item.mjs";
// Import sheet classes
import { AndragathimaActorSheet } from "./sheets/actor-sheet.mjs";
import { AndragathimaItemSheet } from "./sheets/item-sheet.mjs";
import { AndragathimaActiveEffectSheet } from "./sheets/effect-sheet.mjs";
// Import helper/utility classes and constants
import { ANDRAGATHIMA } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log(`Initializing ΑΝΔΡΑΓΑΘΗΜΑ Game System`);

  // Add utility classes to the global game object so they're more easily
  // accessible in global contexts.
  game.andragathima = {
    AndragathimaActor,
    AndragathimaItem,
    rollItemMacro,
    updateTokenStatusEffects,
    config: ANDRAGATHIMA
  };

  // Add custom constants for configuration.
  CONFIG.ANDRAGATHIMA = ANDRAGATHIMA;
  
  // Replace Foundry's default status effects with our custom ones
  CONFIG.statusEffects = ANDRAGATHIMA.statusEffects;
  

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @combat.initiative.value",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = AndragathimaActor;
  CONFIG.Item.documentClass = AndragathimaItem;


  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the active effect transfer property is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("andragathima", AndragathimaActorSheet, { 
    makeDefault: true,
    types: ["character", "npc"],
    label: "ANDRAGATHIMA.SheetClassCharacter"
  });
  
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("andragathima", AndragathimaItemSheet, { 
    makeDefault: true,
    types: ["weapon", "armor", "equipment", "ammunition", "miscellaneous", "skill", "spell"],
    label: "ANDRAGATHIMA.SheetClassItem"
  });
  
  // Register Active Effect sheet using multiple methods to ensure it works
  CONFIG.ActiveEffect.sheetClass = AndragathimaActiveEffectSheet;
  
  // Also register via DocumentSheetConfig as fallback
  DocumentSheetConfig.unregisterSheet(ActiveEffect, "core", ActiveEffectConfig);
  DocumentSheetConfig.registerSheet(ActiveEffect, "andragathima", AndragathimaActiveEffectSheet, {
    makeDefault: true,
    label: "ANDRAGATHIMA.SheetClassActiveEffect"
  });


  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// Register custom Handlebars helpers
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('calculateMod', function(value) {
  return Math.floor((value - 10) / 2);
});

Handlebars.registerHelper('formatBonus', function(value) {
  const num = parseInt(value) || 0;
  if (num >= 0) {
    return `+${num}`;
  } else {
    return num.toString().replace(/^-/, '−');
  }
});

Handlebars.registerHelper('formatNumber', function(value, options) {
  if (value === null || value === undefined) return '';
  let formatted = value.toString();
  
  // Add sign if requested and number is positive or zero
  if (options?.hash?.sign && parseFloat(value) >= 0) {
    formatted = '+' + formatted;
  }
  
  // Replace minus sign
  formatted = formatted.replace(/^-/, '−');
  
  return formatted;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});

Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

Handlebars.registerHelper('and', function() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('not', function(value) {
  return !value;
});

Handlebars.registerHelper('sum', function(a, b) {
  return (parseInt(a) || 0) + (parseInt(b) || 0);
});

Handlebars.registerHelper('range', function(n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(i);
  }
  return result;
});

Handlebars.registerHelper('default', function(value, defaultValue) {
  return value != null ? value : defaultValue;
});

Handlebars.registerHelper('statusModifierClass', function(value) {
  if (value > 0) return 'status-modifier-positive';
  if (value < 0) return 'status-modifier-negative';
  return '';
});

Handlebars.registerHelper('hasStatusModifier', function(value) {
  return value && value !== 0;
});

Handlebars.registerHelper('includes', function(array, value) {
  if (!Array.isArray(array)) return false;
  return array.includes(value);
});

Handlebars.registerHelper('formatStatNumber', function(value, actorFlags, options) {
  const useTargetNumbers = actorFlags?.andragathima?.useTargetNumbers ?? false; // Default false
  const numValue = parseInt(value) || 0;
  
  if (useTargetNumbers) {
    // Target number = coefficient + 11, with "+" suffix
    const targetNumber = numValue + 11;
    return targetNumber + "+";
  } else {
    // Original coefficient format with sign
    return (numValue >= 0 ? "+" : "") + numValue;
  }
});


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
  
  // Register hooks for token status effects
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  
  // Register hooks for item effects on actor changes
  Hooks.on("updateItem", onUpdateItem);
  Hooks.on("deleteItem", onDeleteItem);
  Hooks.on("createItem", onCreateItem);
  
  // Register hook for when tokens are created or rendered
  Hooks.on("createToken", onCreateToken);
  Hooks.on("renderToken", onRenderToken);
  Hooks.on("refreshToken", onRefreshToken);
  Hooks.on("canvasReady", onCanvasReady);
});

/* -------------------------------------------- */
/*  Active Effect Token Integration             */
/* -------------------------------------------- */

/**
 * Update token status effects when an active effect changes
 */
async function onUpdateActiveEffect(activeEffect, changes, options, userId) {
  if (!activeEffect.parent || activeEffect.parent.documentName !== "Actor") return;
  
  const actor = activeEffect.parent;
  updateTokenStatusEffects(actor);
}

/**
 * Update token status effects when an active effect is deleted
 */
async function onDeleteActiveEffect(activeEffect, options, userId) {
  if (!activeEffect.parent || activeEffect.parent.documentName !== "Actor") return;
  
  const actor = activeEffect.parent;
  
  // If helpless is removed, also remove unconscious and dying
  if (activeEffect.statuses.has("helpless")) {
    const unconsciousEffect = actor.effects.find(e => e.statuses.has("unconscious"));
    if (unconsciousEffect && !unconsciousEffect.disabled) {
      await unconsciousEffect.delete();
    }
    
    const dyingEffect = actor.effects.find(e => e.statuses.has("dying"));
    if (dyingEffect && !dyingEffect.disabled) {
      await dyingEffect.delete();
    }
  }
  
  updateTokenStatusEffects(actor);
}

/**
 * Update token status effects when an active effect is created
 */
async function onCreateActiveEffect(activeEffect, options, userId) {
  if (!activeEffect.parent || activeEffect.parent.documentName !== "Actor") return;
  
  const actor = activeEffect.parent;
  
  // If dying is enabled, automatically enable unconscious and helpless
  if (activeEffect.statuses.has("dying")) {
    // Enable unconscious
    const unconsciousEffect = actor.effects.find(e => e.statuses.has("unconscious"));
    if (!unconsciousEffect || unconsciousEffect.disabled) {
      const unconsciousStatusEffect = CONFIG.statusEffects.find(s => s.id === "unconscious");
      if (unconsciousStatusEffect) {
        await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: unconsciousStatusEffect.name,
          img: unconsciousStatusEffect.icon,
          statuses: ["unconscious"],
          changes: unconsciousStatusEffect.changes || []
        }]);
      }
    }
  }
  
  // If unconscious is enabled, automatically enable helpless (but don't disable it when unconscious is removed)
  if (activeEffect.statuses.has("unconscious")) {
    // Add small delay to avoid conflicts with dying status
    setTimeout(async () => {
      const helplessEffect = actor.effects.find(e => e.statuses.has("helpless"));
      if (!helplessEffect || helplessEffect.disabled) {
        // Find the helpless status effect definition
        const helplessStatusEffect = CONFIG.statusEffects.find(s => s.id === "helpless");
        if (helplessStatusEffect) {
          await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: game.i18n.localize(helplessStatusEffect.name),
            img: helplessStatusEffect.icon,
            statuses: ["helpless"],
            changes: helplessStatusEffect.changes || []
          }]);
        }
      }
    }, 10); // 10ms delay
  }
  
  updateTokenStatusEffects(actor);
}

/**
 * Check if an item is equipped on an actor (in equipment slots or quick items)
 */
function isItemEquippedOnActor(item, actor) {
  const equipment = actor.system.equipment;
  if (!equipment) return false;
  
  // Check equipment slots
  if (equipment.slots) {
    for (const slot of Object.values(equipment.slots)) {
      if (slot.id === item.id) return true;
    }
  }
  
  // Check quick items
  if (equipment.quickItems) {
    for (const quickItem of equipment.quickItems) {
      if (quickItem.id === item.id) return true;
    }
  }
  
  return false;
}

/**
 * Update token status effects when an item changes
 */
async function onUpdateItem(item, changes, options, userId) {
  if (!item.parent || item.parent.documentName !== "Actor") return;
  
  const actor = item.parent;
  updateTokenStatusEffects(actor);
  
  // Re-render actor sheet if item image changed and item is in equipment slots or quick items
  if (changes.img) {
    const isEquipped = isItemEquippedOnActor(item, actor);
    
    if (isEquipped) {
      // Find any open actor sheets for this actor and re-render them
      const sheets = Object.values(ui.windows).filter(app => 
        app.constructor.name === "AndragathimaActorSheet" && 
        app.actor?.id === actor.id
      );
      
      for (const sheet of sheets) {
        sheet.render(false); // Refresh without forcing position change
      }
    }
  }
}

/**
 * Update token status effects when an item is deleted
 */
async function onDeleteItem(item, options, userId) {
  if (!item.parent || item.parent.documentName !== "Actor") return;
  
  const actor = item.parent;
  updateTokenStatusEffects(actor);
}

/**
 * Update token status effects when an item is created
 */
async function onCreateItem(item, options, userId) {
  if (!item.parent || item.parent.documentName !== "Actor") return;
  
  const actor = item.parent;
  updateTokenStatusEffects(actor);
}

/**
 * Update custom token effect overlays
 */
async function updateTokenStatusEffects(actor) {
  // Collect all effects that should show on tokens
  const effectsToShow = [];
  
  // Check all actor effects
  for (const effect of actor.effects) {
    if (!effect.disabled && effect.flags?.andragathima?.showOnToken) {
      effectsToShow.push({
        name: effect.name,
        icon: effect.icon,
        id: effect.id
      });
    }
  }
  
  // Check item effects from equipped items
  for (const item of actor.items) {
    if (isItemEquipped(item)) {
      for (const effect of item.effects) {
        if (!effect.disabled && effect.flags?.andragathima?.showOnToken) {
          effectsToShow.push({
            name: effect.name,
            icon: effect.icon,
            id: effect.id
          });
        }
      }
    }
  }
  
  // Collect weapons and ammunition that should show on tokens
  const itemsToShow = getWeaponsForDisplay(actor);
  
  // Check if actor is dead for greyscale effect
  const isDead = actor.effects.some(effect => !effect.disabled && effect.statuses?.has("dead"));
  
  // Update all tokens for this actor
  const tokens = actor.getActiveTokens();
  for (const token of tokens) {
    await updateTokenCustomOverlay(token, effectsToShow);
    await updateTokenWeaponOverlay(token, itemsToShow);
    await updateTokenDeadEffect(token, isDead);
  }
  
  console.log(`Token custom overlays updated for ${actor.name} - Effects: ${effectsToShow.length}, Items: ${itemsToShow.length}`);
}

/**
 * Apply or remove greyscale effect on token when dead
 */
async function updateTokenDeadEffect(token, isDead) {
  if (!token.document || !token.mesh) return;
  
  if (isDead) {
    // Apply greyscale filter
    token.mesh.filters = token.mesh.filters || [];
    
    // Check if greyscale filter already exists
    const hasGreyscale = token.mesh.filters.some(filter => filter.andragathimaDeadFilter);
    
    if (!hasGreyscale) {
      const greyscaleFilter = new PIXI.filters.ColorMatrixFilter();
      greyscaleFilter.desaturate();
      greyscaleFilter.andragathimaDeadFilter = true;
      token.mesh.filters.push(greyscaleFilter);
    }
  } else {
    // Remove greyscale filter
    if (token.mesh.filters) {
      token.mesh.filters = token.mesh.filters.filter(filter => !filter.andragathimaDeadFilter);
      if (token.mesh.filters.length === 0) {
        token.mesh.filters = null;
      }
    }
  }
}

/**
 * Update custom overlay on a token with a 5x5 grid of effect icons
 */
async function updateTokenCustomOverlay(token, effectsToShow) {
  // Remove existing custom overlay
  const existingOverlay = token.children.find(child => child.andragathimaEffectOverlay);
  if (existingOverlay) {
    token.removeChild(existingOverlay);
  }
  
  // If no effects to show, we're done
  if (effectsToShow.length === 0) {
    return;
  }
  
  // Create overlay container
  const overlay = new PIXI.Container();
  overlay.andragathimaEffectOverlay = true;
  
  // Calculate grid position (bottom-right corner of token)
  const tokenSize = token.document.width * canvas.grid.size;
  const gridSize = 20; // Size of each effect icon
  
  // Position overlay so the first effect icon touches the bottom-right edge of token
  overlay.position.set(tokenSize, tokenSize);
  
  // Create up to 25 slots in a 5x5 grid, filling bottom-to-top first, then right-to-left
  for (let i = 0; i < Math.min(effectsToShow.length, 25); i++) {
    const effect = effectsToShow[i];
    // Changed logic: fill columns first (bottom to top), then move to next column (right to left)
    const col = Math.floor(i / 5); // Col 0 is rightmost, col 4 is leftmost
    const row = i % 5; // Row 0 is bottom, row 4 is top
    
    // Create effect icon sprite
    const iconTexture = await loadTexture(effect.icon);
    if (iconTexture) {
      const sprite = new PIXI.Sprite(iconTexture);
      sprite.width = gridSize;
      sprite.height = gridSize;
      
      // Position from bottom-right edge: right-to-left columns, bottom-to-top rows
      // Since overlay starts at (tokenSize, tokenSize), we need negative offsets
      const xPos = -((col + 1) * gridSize);
      const yPos = -((row + 1) * gridSize);
      sprite.position.set(xPos, yPos);
      
      overlay.addChild(sprite);
    }
  }
  
  // Add overlay to token
  token.addChild(overlay);
}

/**
 * Load texture helper function
 */
async function loadTexture(src) {
  try {
    return await PIXI.Texture.fromURL(src);
  } catch (error) {
    console.warn(`Failed to load texture: ${src}`, error);
    return null;
  }
}

/**
 * Get weapons and ammunition that should be displayed on token
 */
function getWeaponsForDisplay(actor) {
  const itemsToShow = [];
  
  // Get quick items (positions 1-8)
  const quickItems = actor.system.equipment?.quickItems || [];
  for (let i = 0; i < quickItems.length && i < 8; i++) {
    const quickItem = quickItems[i];
    if (quickItem.id) {
      const item = actor.items.get(quickItem.id);
      if (item && (item.type === 'weapon' || item.type === 'ammunition') && item.system.showOnToken) {
        itemsToShow.push({
          name: item.name,
          icon: item.img,
          id: item.id,
          position: i + 1, // 1-8 for quick items
          isQuickWeapon: true,
          type: item.type
        });
      }
    }
  }
  
  // Check shield slot
  const shieldSlot = actor.system.equipment?.slots?.shield;
  if (shieldSlot && shieldSlot.id) {
    const item = actor.items.get(shieldSlot.id);
    if (item && (item.type === 'weapon' || item.type === 'ammunition') && item.system.showOnToken) {
      itemsToShow.push({
        name: item.name,
        icon: item.img,
        id: item.id,
        position: 9, // Shield slot is position 9 (last)
        isQuickWeapon: false,
        type: item.type
      });
    }
  }
  
  // Sort by position - shield slot (9) should be drawn last (in back)
  // Quick items 8, 7, 6... 1 should be drawn in that order (1 on top)
  itemsToShow.sort((a, b) => b.position - a.position);
  
  return itemsToShow;
}

/**
 * Update weapon/ammunition overlay on token (bottom-left, stacked)
 */
async function updateTokenWeaponOverlay(token, itemsToShow) {
  // Remove existing weapon overlay
  const existingWeaponOverlay = token.children.find(child => child.andragathimaWeaponOverlay);
  if (existingWeaponOverlay) {
    token.removeChild(existingWeaponOverlay);
  }
  
  // If no items to show, we're done
  if (itemsToShow.length === 0) {
    return;
  }
  
  // Create weapon overlay container
  const weaponOverlay = new PIXI.Container();
  weaponOverlay.andragathimaWeaponOverlay = true;
  
  const itemSize = 50; // 50x50 as specified
  
  // Position overlay at bottom-left of token, 10px outside the token edge
  const tokenSize = token.document.width * canvas.grid.size;
  weaponOverlay.position.set(-10, tokenSize + 10 - itemSize);
  
  // Create item icons stacked on top of each other
  for (let i = 0; i < itemsToShow.length; i++) {
    const item = itemsToShow[i];
    
    // Create item icon sprite
    const iconTexture = await loadTexture(item.icon);
    if (iconTexture) {
      const sprite = new PIXI.Sprite(iconTexture);
      
      // Keep original size - no scaling
      sprite.width = iconTexture.width;
      sprite.height = iconTexture.height;
      
      // Center the sprite within the theoretical 50x50 square
      const offsetX = (itemSize - sprite.width) / 2;
      const offsetY = (itemSize - sprite.height) / 2;
      sprite.position.set(offsetX, offsetY);
      
      weaponOverlay.addChild(sprite);
    }
  }
  
  // Add overlay to token
  token.addChild(weaponOverlay);
}


/**
 * Update token status effects when a token is created
 */
async function onCreateToken(token, options, userId) {
  const actor = token.actor;
  if (!actor) return;
  
  updateTokenStatusEffects(actor);
}

/**
 * Update token status effects when a token is rendered
 */
async function onRenderToken(token, html, data) {
  const actor = token.actor;
  if (!actor) return;
  
  // Add a small delay to ensure the token is fully rendered
  setTimeout(() => {
    updateTokenStatusEffects(actor);
  }, 100);
}

/**
 * Update token status effects when a token is refreshed
 */
async function onRefreshToken(token, flags) {
  const actor = token.actor;
  if (!actor) return;
  
  updateTokenStatusEffects(actor);
}

/**
 * Update all tokens when canvas is ready
 */
function onCanvasReady() {
  // Add a delay to ensure all tokens are fully loaded and rendered
  setTimeout(() => {
    // Update all tokens on the canvas
    for (const token of canvas.tokens.placeables) {
      if (token.actor) {
        updateTokenStatusEffects(token.actor);
      }
    }
  }, 500);
}

/**
 * Check if an item is equipped/worn by the actor
 */
function isItemEquipped(item) {
  // For equipment items, check if they're in an equipment slot
  if (item.type === "armor" || item.type === "equipment") {
    const actor = item.parent;
    const equipmentSlots = actor.system.equipment?.slots || {};
    
    // Check all equipment slots
    for (const [slotName, slotData] of Object.entries(equipmentSlots)) {
      if (slotData.id === item.id) {
        return true;
      }
    }
  }
  
  // For weapons, check if they're in quick items
  if (item.type === "weapon") {
    const actor = item.parent;
    const quickItems = actor.system.equipment?.quickItems || [];
    
    for (const quickItem of quickItems) {
      if (quickItem.id === item.id) {
        return true;
      }
    }
  }
  
  return false;
}

/* -------------------------------------------- */
/*  Hotbar Macros                              */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.implementation.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.andragathima.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "andragathima.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.implementation.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}

/* -------------------------------------------- */
/*  Preload Handlebars Templates                */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // Actor sheets
    "systems/andragathima/templates/actor/character-sheet.html",
    "systems/andragathima/templates/actor/npc-sheet.html",
    
    // Item sheets
    "systems/andragathima/templates/item/item-sheet.html",
    "systems/andragathima/templates/item/weapon-sheet.html",
    "systems/andragathima/templates/item/armor-sheet.html",
    "systems/andragathima/templates/item/equipment-sheet.html",
    "systems/andragathima/templates/item/ammunition-sheet.html",
    "systems/andragathima/templates/item/skill-sheet.html",
    "systems/andragathima/templates/item/spell-sheet.html",
    
    // Effect sheets
    "systems/andragathima/templates/effect/effect-sheet.html",
    
    // Partial templates
    "systems/andragathima/templates/actor/parts/actor-abilities.html",
    "systems/andragathima/templates/actor/parts/actor-combat.html",
    "systems/andragathima/templates/actor/parts/actor-skills.html",
    "systems/andragathima/templates/actor/parts/actor-equipment.html",
    "systems/andragathima/templates/actor/parts/actor-spells.html",
    "systems/andragathima/templates/actor/parts/actor-effects.html",
  ]);
}