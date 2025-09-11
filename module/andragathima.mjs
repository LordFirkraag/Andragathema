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
    types: ["character", "npc", "container", "note"],
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
/*  Token Context Menu Hook                     */
/* -------------------------------------------- */

/**
 * Add token lock/unlock context menu option for GMs
 * Try multiple hook approaches to find the correct one
 */

// Debug - enable hook debugging temporarily
Hooks.once("ready", () => {
  console.log("ANDRAGATHIMA: Token lock feature loaded. Try right-clicking a token to see if hooks fire.");
});

// Try different possible hooks for token context menu
const tokenHooks = [
  "getTokenContextOptions",
  "getTokenHudContextOptions", 
  "getTokenDirectoryEntryContext",
  "getPlaceableObjectContextOptions",
  "getTokenControlContextOptions"
];

tokenHooks.forEach(hookName => {
  Hooks.on(hookName, (html, contextOptions, ...args) => {
    console.log(`ANDRAGATHIMA: ${hookName} hook fired!`, {html, contextOptions, args});
    
    // Only show for GMs and GM assistants
    if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) return;
    
    // Try to get the token from different sources
    let token = canvas.tokens.controlled[0];
    if (!token && args[0] && args[0].document) {
      token = args[0]; // Token might be in args
    }
    
    if (!token) {
      console.log(`ANDRAGATHIMA: No token found for ${hookName}`);
      return;
    }
    
    const isLocked = token.document.locked;
    
    const lockOption = {
      name: isLocked ? "ANDRAGATHIMA.TokenUnlock" : "ANDRAGATHIMA.TokenLock", 
      icon: isLocked ? '<i class="fas fa-unlock"></i>' : '<i class="fas fa-lock"></i>',
      callback: async () => {
        await token.document.update({ locked: !isLocked });
        ui.notifications.info(
          isLocked 
            ? game.i18n.localize("ANDRAGATHIMA.TokenUnlocked")
            : game.i18n.localize("ANDRAGATHIMA.TokenLocked")
        );
      },
      condition: () => game.user.isGM || game.user.hasRole("ASSISTANT")
    };
    
    if (Array.isArray(contextOptions)) {
      contextOptions.push(lockOption);
      console.log(`ANDRAGATHIMA: Added lock option via ${hookName}`);
    }
  });
});

// Try alternative approach: manually add to token HUD
Hooks.on("renderTokenHUD", (hud, html, token) => {
  // Only show for GMs and GM assistants
  if (!game.user.isGM && !game.user.hasRole("ASSISTANT")) return;
  
  console.log("ANDRAGATHIMA: TokenHUD rendered, trying to add lock button", {hud, html, token});
  
  // Convert html to jQuery if needed
  const $html = html instanceof jQuery ? html : $(html);
  
  // Get the actual token object from the HUD
  const actualToken = hud.object;
  const tokenDoc = actualToken.document;
  const isLocked = tokenDoc.locked;
  
  console.log("ANDRAGATHIMA: Token lock status:", isLocked, "TokenDoc:", tokenDoc);
  
  // Add lock button to the HUD
  const lockButton = `
    <div class="control-icon" data-action="toggle-lock" title="${isLocked ? game.i18n.localize('ANDRAGATHIMA.TokenUnlock') : game.i18n.localize('ANDRAGATHIMA.TokenLock')}">
      <i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock'}"></i>
    </div>
  `;
  
  // Try to find the left section, if not found try other selectors
  let leftSection = $html.find('.left');
  if (leftSection.length === 0) {
    leftSection = $html.find('.col.left');
  }
  if (leftSection.length === 0) {
    leftSection = $html.find('.token-hud').first();
  }
  
  console.log("ANDRAGATHIMA: Found left section elements:", leftSection.length);
  
  if (leftSection.length > 0) {
    // Insert before the last control icon (config button) instead of appending
    const lastIcon = leftSection.find('.control-icon').last();
    if (lastIcon.length > 0) {
      lastIcon.before(lockButton);
    } else {
      leftSection.append(lockButton);
    }
    console.log("ANDRAGATHIMA: Lock button added to HUD");
    
    // Add click handler
    $html.find('[data-action="toggle-lock"]').click(async (event) => {
      event.preventDefault();
      console.log("ANDRAGATHIMA: Lock button clicked, current state:", isLocked);
      console.log("ANDRAGATHIMA: Attempting to update token:", tokenDoc);
      
      try {
        await tokenDoc.update({ locked: !isLocked });
        ui.notifications.info(
          isLocked 
            ? game.i18n.localize("ANDRAGATHIMA.TokenUnlocked")
            : game.i18n.localize("ANDRAGATHIMA.TokenLocked")
        );
        
        // Re-render the HUD to update the icon
        if (hud && hud.render) {
          hud.render();
        }
      } catch (error) {
        console.error("ANDRAGATHIMA: Error updating token lock status:", error);
        ui.notifications.error("Failed to update token lock status");
      }
    });
  } else {
    console.warn("ANDRAGATHIMA: Could not find suitable container for lock button");
    console.log("ANDRAGATHIMA: Available HTML structure:", $html[0]);
  }
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// Register custom Handlebars helpers (removed core duplicates: concat, eq, ne, lt, gt, lte, gte, and, or, not)

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
  
  // Register hook for world time changes to check torch duration
  Hooks.on("updateWorldTime", onUpdateWorldTime);
  
  // Start periodic torch duration checks (every 30 seconds)
  if (game.user.isGM) {
    setInterval(checkAllTorchDurations, 30000); // 30 seconds
  }
  
  // Register hook for when tokens are created or rendered
  Hooks.on("createToken", onCreateToken);
  Hooks.on("renderToken", onRenderToken);
  Hooks.on("refreshToken", onRefreshToken);
  Hooks.on("canvasReady", onCanvasReady);
  
  // Register token tooltip hooks
  Hooks.on("hoverToken", onTokenHover);
  Hooks.on("canvasReady", setupTokenTooltips);
  
  // Also register for canvas pan/zoom events to hide tooltips  
  Hooks.on("canvasPan", hideTokenTooltip);
  Hooks.on("canvasZoom", hideTokenTooltip);
  
  // Override Token hover methods for direct integration
  Hooks.once("ready", () => {
    setupTokenHoverOverride();
  });
  
  // Re-setup tooltips when actor sheets are closed
  Hooks.on("closeActorSheet", () => {
    console.log("Actor sheet closed, re-setting up tooltips");
    setTimeout(() => {
      setupTokenHoverOverride();
      if (!tokenTooltip || !document.body.contains(tokenTooltip)) {
        createTooltipElement();
      }
    }, 100);
  });
  
  // More comprehensive approach - listen for any app close
  Hooks.on("closeApplication", (app) => {
    if (app instanceof ActorSheet) {
      console.log("ActorSheet application closed, ensuring tooltips work");
      setTimeout(() => {
        if (!tokenTooltip || !document.body.contains(tokenTooltip)) {
          createTooltipElement();
        }
      }, 100);
    }
  });
  
  // Also re-setup when returning focus to canvas
  Hooks.on("canvasPan", () => {
    if (!tokenTooltip) {
      createTooltipElement();
    }
  });
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
          name: game.i18n.localize(unconsciousStatusEffect.name),
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
  
  // Handle mutual exclusion for exhaustion conditions
  const exhaustionStatuses = ["fatigued", "exhausted", "depleted"];
  const currentExhaustionStatus = exhaustionStatuses.find(status => activeEffect.statuses.has(status));
  
  if (currentExhaustionStatus) {
    // Find the exhaustion level of the current effect
    const statusEffectConfig = CONFIG.statusEffects.find(s => s.id === currentExhaustionStatus);
    const currentExhaustionLevel = statusEffectConfig?.flags?.andragathima?.exhaustionLevel || 0;
    
    // Remove ALL other exhaustion effects (regardless of level)
    const effectsToRemove = [];
    for (const effect of actor.effects) {
      // Skip the effect we just added
      if (effect === activeEffect) continue;
      
      const effectExhaustionStatus = exhaustionStatuses.find(status => effect.statuses.has(status));
      if (effectExhaustionStatus) {
        const effectConfig = CONFIG.statusEffects.find(s => s.id === effectExhaustionStatus);
        const effectExhaustionLevel = effectConfig?.flags?.andragathima?.exhaustionLevel || 0;
        
        // If the new effect has higher or equal level, remove the existing one
        // If the new effect has lower level, remove the new one (by canceling it later)
        if (currentExhaustionLevel >= effectExhaustionLevel) {
          effectsToRemove.push(effect.id);
        } else {
          // New effect has lower level, remove it and keep the higher level one
          await activeEffect.delete();
          return;
        }
      }
    }
    
    if (effectsToRemove.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
    }
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
  
  // Check if actor is dying for red overlay effect
  const isDying = actor.effects.some(effect => !effect.disabled && effect.statuses?.has("dying"));
  
  // Check for wound conditions to determine overlay coverage
  const woundStatuses = ["wounded", "wounded2", "wounded3", "wounded4", "wounded5"];
  const activeWounds = actor.effects.filter(effect => 
    !effect.disabled && woundStatuses.some(status => effect.statuses?.has(status))
  ).length;
  
  // Check if actor is frightened for yellow stroke effect
  const isFrightened = actor.effects.some(effect => !effect.disabled && effect.statuses?.has("frightened"));
  
  // Don't show dying/wound overlays if actor is dead
  const showDyingOverlays = !isDead && (isDying || activeWounds > 0);
  
  // Update all tokens for this actor
  const tokens = actor.getActiveTokens();
  for (const token of tokens) {
    await updateTokenDyingEffect(token, showDyingOverlays ? isDying : false, showDyingOverlays ? activeWounds : 0);
    await updateTokenFearEffect(token, isFrightened);
    await updateTokenCustomOverlay(token, effectsToShow);
    await updateTokenWeaponOverlay(token, itemsToShow);
    await updateTokenDeadEffect(token, isDead);
  }
  
  console.log(`Token custom overlays updated for ${actor.name} - Effects: ${effectsToShow.length}, Items: ${itemsToShow.length}`);
}

/**
 * Apply or remove yellow stroke effect on token when frightened
 */
async function updateTokenFearEffect(token, isFrightened) {
  if (!token.document || !token.mesh) return;
  
  // Get stroke shape setting
  const strokeShape = game.settings.get("andragathima", "frightenedStrokeShape");
  
  // Remove existing fear stroke
  const existingFearStroke = token.children.find(child => child.andragathimaFearStroke);
  if (existingFearStroke) {
    token.removeChild(existingFearStroke);
  }
  
  // Show stroke if frightened and setting is not "off"
  if (isFrightened && strokeShape !== "off") {
    // Create fear stroke container
    const fearStroke = new PIXI.Container();
    fearStroke.andragathimaFearStroke = true;
    
    // Create yellow stroke graphic
    const stroke = new PIXI.Graphics();
    stroke.lineStyle(8, 0xFFFF00, 1.0); // 8px yellow stroke
    
    // Use grid size for consistent token sizing (same as other overlays)
    const gridSize = canvas.grid.size;
    const tokenWidth = token.document.width * gridSize;
    const tokenHeight = token.document.height * gridSize;
    const centerX = tokenWidth / 2;
    const centerY = tokenHeight / 2;
    
    // Get stroke shape from settings
    const strokeShape = game.settings.get("andragathima", "frightenedStrokeShape");
    const aspectRatio = token.document.width / token.document.height;
    const isRoughlySquare = aspectRatio > 0.8 && aspectRatio < 1.2;
    
    if (strokeShape === "rectangle") {
      // Rectangle stroke - 4px outside the token edge
      const width = tokenWidth + 8;  // 4px on each side
      const height = tokenHeight + 8; // 4px on each side
      stroke.drawRect(-4, -4, width, height);
    } else if (strokeShape === "ellipse") {
      // Ellipse stroke - draw circle or ellipse based on aspect ratio
      if (isRoughlySquare) {
        // Draw a circle for square tokens - 4px outside the token edge
        const radius = Math.min(tokenWidth, tokenHeight) / 2 + 4;
        stroke.drawCircle(centerX, centerY, radius);
      } else {
        // Draw an ellipse for rectangular tokens - 4px outside the token edge
        const radiusX = tokenWidth / 2 + 4;
        const radiusY = tokenHeight / 2 + 4;
        stroke.drawEllipse(centerX, centerY, radiusX, radiusY);
      }
    }
    
    fearStroke.addChild(stroke);
    
    // Add stroke to token container at the correct z-index
    // Position it one level above dying overlay but below effects
    let insertIndex = token.children.length;
    
    for (let i = 0; i < token.children.length; i++) {
      // Insert after mesh and dying overlay but before effects and other overlays
      if (token.children[i] === token.mesh || 
          token.children[i].andragathimaDyingOverlay) {
        insertIndex = i + 1;
        continue;
      }
      // Stop before effects container and other overlays (except dying overlay)
      if (token.children[i] === token.effects ||
          token.children[i].andragathimaCustomOverlay || 
          token.children[i].andragathimaWeaponOverlay ||
          token.children[i].andragathimaDeadOverlay) {
        insertIndex = i;
        break;
      }
    }
    
    token.addChildAt(fearStroke, insertIndex);
    console.log(`Frightened stroke applied to token ${token.name || token.id}`);
  }
}

/**
 * Apply or remove red overlay effect on token when dying or wounded
 */
async function updateTokenDyingEffect(token, isDying, activeWounds = 0) {
  if (!token.document || !token.mesh) return;
  
  // Remove existing dying overlay
  const existingDyingOverlay = token.children.find(child => child.andragathimaDyingOverlay);
  if (existingDyingOverlay) {
    token.removeChild(existingDyingOverlay);
  }
  
  // Show overlay if dying or has wounds
  if (isDying || activeWounds > 0) {
    // Create red overlay container
    const dyingOverlay = new PIXI.Container();
    dyingOverlay.andragathimaDyingOverlay = true;
    
    // Create red overlay graphic covering the entire token
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x880808, 1.0); // #880808 with full opacity, blendmode will handle the effect
    
    // Use grid size consistently for both ellipse and rectangle tokens
    const gridSize = canvas.grid.size;
    const tokenWidth = token.document.width * gridSize;
    const tokenHeight = token.document.height * gridSize;
    
    // Determine overlay coverage based on condition priority
    let overlayY = 0;
    let overlayHeight = tokenHeight;
    let coverageDescription = "full";
    
    if (isDying) {
      // Dying: full token coverage (default values above)
      coverageDescription = "full (dying)";
    } else if (activeWounds >= 2) {
      // 2+ wounds: bottom 2/3 of token
      overlayY = tokenHeight / 3;
      overlayHeight = (tokenHeight * 2) / 3;
      coverageDescription = "2/3 (2+ wounds)";
    } else if (activeWounds === 1) {
      // 1 wound: bottom 1/3 of token
      overlayY = (tokenHeight * 2) / 3;
      overlayHeight = tokenHeight / 3;
      coverageDescription = "1/3 (1 wound)";
    }
    
    overlay.drawRect(0, overlayY, tokenWidth, overlayHeight);
    overlay.endFill();
    
    // Set blend mode to overlay
    overlay.blendMode = PIXI.BLEND_MODES.OVERLAY;
    
    // Create contrast-enhanced token sprite for the covered area
    if (token.mesh && token.mesh.texture) {
      // Create a sprite with the token texture
      const contrastSprite = new PIXI.Sprite(token.mesh.texture);
      contrastSprite.width = tokenWidth;
      contrastSprite.height = tokenHeight;
      contrastSprite.position.set(0, 0);
      
      // Apply contrast filter to this sprite
      const contrastFilter = new PIXI.ColorMatrixFilter();
      contrastFilter.contrast(1.1); // 10% increase in contrast
      contrastSprite.filters = [contrastFilter];
      
      // Create a mask for the contrast sprite to match the overlay area
      const contrastMask = new PIXI.Graphics();
      contrastMask.beginFill(0xFFFFFF);
      contrastMask.drawRect(0, overlayY, tokenWidth, overlayHeight);
      contrastMask.endFill();
      
      // Apply the mask to the contrast sprite
      contrastSprite.mask = contrastMask;
      
      // Add both to the container
      dyingOverlay.addChild(contrastMask);
      dyingOverlay.addChild(contrastSprite);
      
      // Create mask for the red overlay to respect token transparency
      const overlayMask = new PIXI.Sprite(token.mesh.texture);
      overlayMask.width = tokenWidth;
      overlayMask.height = tokenHeight;
      overlayMask.position.set(0, 0);
      
      // Add mask to the overlay container
      dyingOverlay.addChild(overlayMask);
      
      // Apply the mask to the overlay
      overlay.mask = overlayMask;
    }
    
    console.log(`Creating ${coverageDescription} overlay with mask`, `Size: ${tokenWidth}x${overlayHeight}, Wounds: ${activeWounds}, Dying: ${isDying}`);
    
    dyingOverlay.addChild(overlay);
    
    // Add overlay to token container but position it to appear on top of token image
    // but under status effects and other UI elements
    let insertIndex = token.children.length;
    
    for (let i = 0; i < token.children.length; i++) {
      // Insert after mesh but before effects container and other overlays
      if (token.children[i] === token.mesh) {
        insertIndex = i + 1;
        continue;
      }
      // Stop before effects container or existing overlays
      if (token.children[i] === token.effects ||
          token.children[i].andragathimaCustomOverlay || 
          token.children[i].andragathimaWeaponOverlay ||
          token.children[i].andragathimaDeadOverlay) {
        insertIndex = i;
        break;
      }
    }
    
    token.addChildAt(dyingOverlay, insertIndex);
  }
}

/**
 * Apply or remove greyscale effect on token when dead
 */
async function updateTokenDeadEffect(token, isDead) {
  if (!token.document || !token.mesh) return;
  
  if (isDead) {
    // Apply greyscale and contrast filters
    token.mesh.filters = token.mesh.filters || [];
    
    // Check if greyscale filter already exists
    const hasGreyscale = token.mesh.filters.some(filter => filter.andragathimaDeadFilter);
    
    if (!hasGreyscale) {
      const greyscaleFilter = new PIXI.ColorMatrixFilter();
      greyscaleFilter.desaturate();
      greyscaleFilter.andragathimaDeadFilter = true;
      token.mesh.filters.push(greyscaleFilter);
    }
    
    // Check if contrast filter already exists
    const hasContrast = token.mesh.filters.some(filter => filter.andragathimaDeadContrastFilter);
    
    if (!hasContrast) {
      const contrastFilter = new PIXI.ColorMatrixFilter();
      contrastFilter.contrast(1.05); // 5% increase in contrast
      contrastFilter.andragathimaDeadContrastFilter = true;
      token.mesh.filters.push(contrastFilter);
    }
  } else {
    // Remove greyscale and contrast filters
    if (token.mesh.filters) {
      token.mesh.filters = token.mesh.filters.filter(filter => 
        !filter.andragathimaDeadFilter && !filter.andragathimaDeadContrastFilter
      );
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
      
      // Scale down to fit within gridSize while maintaining aspect ratio
      const aspectRatio = iconTexture.width / iconTexture.height;
      if (iconTexture.width > iconTexture.height) {
        sprite.width = Math.min(gridSize, iconTexture.width);
        sprite.height = sprite.width / aspectRatio;
      } else {
        sprite.height = Math.min(gridSize, iconTexture.height);
        sprite.width = sprite.height * aspectRatio;
      }
      
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
    
    if (quickItem && quickItem.id) {
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
  
  // Filter out any invalid items before sorting
  const validItems = itemsToShow.filter(item => item && item.id && item.name && item.position);
  
  // Sort by position - shield slot (9) should be drawn last (in back)
  // Quick items 8, 7, 6... 1 should be drawn in that order (1 on top)
  validItems.sort((a, b) => b.position - a.position);
  
  return validItems;
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
  
  // Check if any visible weapon is a torch (Δαυλός or Πυρσός) and manage lighting
  const hasTorchVisible = itemsToShow.some(item => {
    if (!item || !item.name) return false;
    const name = item.name.toLowerCase();
    return name.includes('δαυλός') || name.includes('πυρσός') || name.includes('δαυλος') || name.includes('πυρσος');
  });
  
  await updateTokenTorchLighting(token, hasTorchVisible);
  
  // Filter out any undefined/null items that might have been destroyed
  const validItems = itemsToShow.filter(item => item && item.name && item.icon);
  
  // If no valid items to show, we're done
  if (validItems.length === 0) {
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
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    
    // Double-check item validity before proceeding
    if (!item || !item.id || !item.name || !item.icon) {
      continue;
    }
    
    try {
      // Create item icon sprite
      const iconTexture = await loadTexture(item.icon);
      if (iconTexture) {
        const sprite = new PIXI.Sprite(iconTexture);
        
        // Scale down to fit within 50x50 while maintaining aspect ratio
        const aspectRatio = iconTexture.width / iconTexture.height;
        if (iconTexture.width > iconTexture.height) {
          sprite.width = Math.min(itemSize, iconTexture.width);
          sprite.height = sprite.width / aspectRatio;
        } else {
          sprite.height = Math.min(itemSize, iconTexture.height);
          sprite.width = sprite.height * aspectRatio;
        }
        
        // Center the sprite within the 50x50 square
        const offsetX = (itemSize - sprite.width) / 2;
        const offsetY = (itemSize - sprite.height) / 2;
        sprite.position.set(offsetX, offsetY);
        
        weaponOverlay.addChild(sprite);
      }
    } catch (error) {
      console.error(`Error creating sprite for item:`, error);
    }
  }
  
  // Add overlay to token
  token.addChild(weaponOverlay);
}

/**
 * Update token lighting based on torch visibility
 */
async function updateTokenTorchLighting(token, hasTorchVisible) {
  if (!token.document) return;
  
  const currentLightConfig = token.document.light;
  
  if (hasTorchVisible) {
    // Torch lighting settings as specified
    const torchConfig = {
      bright: 10,           // 10m bright light radius
      dim: 20,             // 20m dim light radius  
      color: "#ff8400",    // Light color
      alpha: 0.5,          // Color intensity
      animation: {
        type: "flame",     // Flame animation (torch effect)
        speed: 5,          // Animation speed
        intensity: 1       // Animation intensity
      },
      coloration: 10,      // Natural light technique (based on order in list)
      luminosity: 0.5,     // Luminosity
      attenuation: 1,      // Attenuation 
      shadows: 0.5         // Shadows
    };
    
    // Check if torch is already lit to avoid resetting start time
    const currentFlags = token.document.flags?.andragathima || {};
    const isAlreadyLit = currentFlags.torchLight && currentFlags.activeTorchId;
    
    // Get the currently equipped torch item and calculate its total usage
    const currentGameTime = game.time.worldTime;
    const torchItem = findTorchItem(token.actor);
    const totalTorchUsage = calculateTorchTotalUsage(token, torchItem, currentGameTime);
    
    // Check if torch is worn out (>80% used) and adjust brightness
    const torchDurationMinutes = game.settings.get("andragathima", "torchDurationMinutes");
    const TORCH_DURATION = torchDurationMinutes * 60;
    const usagePercentage = totalTorchUsage / TORCH_DURATION;
    
    if (usagePercentage > 0.8) {
      // Dim torch settings for worn torches
      torchConfig.bright = 5;
      torchConfig.dim = 10;
      console.log(`Torch is worn out (${Math.round(usagePercentage * 100)}% used) - reduced brightness applied`);
    }
    
    // Only update flags if torch wasn't already lit, or if we're changing torch items
    const needsFlagUpdate = !isAlreadyLit || currentFlags.activeTorchId !== torchItem?.id;
    const updateData = { light: torchConfig };
    
    if (needsFlagUpdate) {
      updateData.flags = { 
        andragathima: { 
          torchLight: true,
          torchStartTime: isAlreadyLit ? currentFlags.torchStartTime : currentGameTime,
          activeTorchId: torchItem?.id,
          torchDimmed: currentFlags.torchDimmed || false
        } 
      };
    }
    
    await token.document.update(updateData);
    console.log(`Torch lighting applied to token ${token.name || token.id} at game time ${currentGameTime}. Torch total usage: ${totalTorchUsage}s`);
  } else {
    // Only remove lighting if it was created by our torch system
    const isTorchLight = token.document.flags?.andragathima?.torchLight;
    if (isTorchLight && (currentLightConfig.bright > 0 || currentLightConfig.dim > 0)) {
      // Calculate time spent with torch on and save to the torch item
      const torchStartTime = token.document.flags?.andragathima?.torchStartTime;
      const activeTorchId = token.document.flags?.andragathima?.activeTorchId;
      const currentGameTime = game.time.worldTime;
      
      if (torchStartTime && activeTorchId) {
        const torchItem = token.actor.items.get(activeTorchId);
        if (torchItem) {
          const existingAccumulated = torchItem.flags?.andragathima?.accumulatedTime || 0;
          const sessionTime = currentGameTime - torchStartTime;
          const newAccumulatedTime = existingAccumulated + sessionTime;
          
          // Only save if session time > 0 (prevent duplicate saves)
          if (sessionTime > 0) {
            // Save accumulated time to the torch item
            await torchItem.update({
              flags: {
                andragathima: {
                  accumulatedTime: newAccumulatedTime
                }
              }
            });
            console.log(`Torch usage time updated for item ${torchItem.name}: ${newAccumulatedTime}s total`);
          }
        }
      }
      
      // Remove torch lighting (set radii to 0)
      await token.document.update({ 
        light: {
          bright: 0,
          dim: 0
        },
        flags: { 
          andragathima: { 
            torchLight: false,
            torchStartTime: null,
            activeTorchId: null,
            torchDimmed: false
          } 
        }
      });
      console.log(`Torch lighting removed from token ${token.name || token.id}`);
    }
  }
}


/**
 * Update token status effects when a token is created
 */
async function onCreateToken(token, options, userId) {
  const actor = token.actor;
  if (!actor) return;
  
  updateTokenStatusEffects(actor);
  
  // Setup tooltip events for the new token
  setTimeout(() => {
    setupTokenTooltipEvents(token);
  }, 100);
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
    setupTokenTooltipEvents(token);
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
  // Setup tooltips first
  setTimeout(() => {
    setupTokenTooltips();
  }, 100);
  
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
/*  Token Tooltips System                       */
/* -------------------------------------------- */

/**
 * Global tooltip element
 */
let tokenTooltip = null;

/**
 * Create the tooltip element
 */
function createTooltipElement() {
  console.log("Creating tooltip element...");
  
  // Remove existing tooltip if any
  if (tokenTooltip) {
    tokenTooltip.remove();
    tokenTooltip = null;
  }

  // Create tooltip element
  tokenTooltip = document.createElement('div');
  tokenTooltip.className = 'andragathima-rich-tooltip';
  tokenTooltip.style.display = 'none';
  tokenTooltip.style.position = 'fixed';
  tokenTooltip.style.zIndex = '10000';
  tokenTooltip.style.pointerEvents = 'none';
  tokenTooltip.style.backgroundColor = '#f5f5dc'; // Fallback background
  tokenTooltip.style.border = '2px solid #8b4513'; // Fallback border
  tokenTooltip.style.padding = '8px 12px';
  tokenTooltip.style.borderRadius = '5px';
  tokenTooltip.style.fontFamily = 'serif';
  document.body.appendChild(tokenTooltip);

  console.log("Tooltip element created and appended to body:", tokenTooltip);
  return tokenTooltip;
}

/**
 * Setup token tooltips when canvas is ready
 */
function setupTokenTooltips() {
  console.log("Setting up token tooltips...");
  
  // Create tooltip element
  createTooltipElement();

  // Add global canvas event listener for token hovers
  if (canvas && canvas.stage) {
    // Remove existing listeners
    canvas.stage.off('pointerover', handleTokenHover);
    canvas.stage.off('pointerout', handleTokenOut);
    
    // Add new listeners
    canvas.stage.on('pointerover', handleTokenHover);
    canvas.stage.on('pointerout', handleTokenOut);
    
    console.log("Canvas stage event listeners added");
  }

  // Also try individual token setup as backup
  if (!canvas || !canvas.tokens) {
    console.warn("Canvas or canvas.tokens not available yet");
    return;
  }
  
  const tokens = canvas.tokens.placeables;
  console.log(`Found ${tokens.length} tokens on canvas`);
  
  tokens.forEach(token => {
    setupTokenTooltipEvents(token);
  });
}

/**
 * Setup tooltip events for a specific token
 */
function setupTokenTooltipEvents(token) {
  if (!token || !token.mesh) return;
  
  const tokenElement = token.mesh;

  try {
    // Alternative approach: Use HTML element events
    const tokenHTML = token.element;
    
    if (tokenHTML) {
      // Remove existing listeners
      $(tokenHTML).off('mouseenter.tooltip mouseleave.tooltip mousemove.tooltip');
      
      // Add jQuery event listeners
      $(tokenHTML).on('mouseenter.tooltip', (event) => {
        console.log("Mouse enter on token:", token.actor?.name);
        showTokenTooltip(token, event.originalEvent || event);
      });

      $(tokenHTML).on('mousemove.tooltip', (event) => {
        updateTooltipPosition(event.originalEvent || event);
      });

      $(tokenHTML).on('mouseleave.tooltip', () => {
        console.log("Mouse leave on token:", token.actor?.name);
        hideTokenTooltip();
      });
      
      console.log(`Token tooltip events setup for: ${token.actor?.name || 'Unknown'} using HTML element`);
    } else {
      // Fallback to PIXI events
      tokenElement.removeAllListeners('pointerenter');
      tokenElement.removeAllListeners('pointermove');
      tokenElement.removeAllListeners('pointerleave');

      tokenElement.on('pointerenter', (event) => {
        console.log("Pointer enter on token:", token.actor?.name);
        showTokenTooltip(token, event);
      });

      tokenElement.on('pointermove', (event) => {
        updateTooltipPosition(event);
      });

      tokenElement.on('pointerleave', () => {
        console.log("Pointer leave on token:", token.actor?.name);
        hideTokenTooltip();
      });
      
      console.log(`Token tooltip events setup for: ${token.actor?.name || 'Unknown'} using PIXI`);
    }
  } catch (error) {
    console.warn('Failed to setup token tooltip events:', error);
  }
}

/**
 * Show tooltip for a token
 */
function showTokenTooltip(token, event) {
  console.log("showTokenTooltip called for:", token.actor?.name);
  
  // Check if tooltips are enabled in settings
  if (!game.settings.get("andragathima", "showTokenTooltips")) {
    console.log("Token tooltips are disabled in settings");
    return;
  }
  
  if (!token.actor) {
    console.warn("Missing actor for token");
    return;
  }
  
  // Create tooltip if it doesn't exist or if it's been removed from DOM
  if (!tokenTooltip || !document.body.contains(tokenTooltip)) {
    console.log("Creating tooltip element on-demand");
    try {
      createTooltipElement();
      if (!tokenTooltip) {
        console.error("createTooltipElement() did not create the element");
        return;
      }
    } catch (error) {
      console.error("Failed to create tooltip element:", error);
      return;
    }
  }

  const actor = token.actor;
  const tooltipContent = generateTooltipContent(actor);
  
  if (!tooltipContent) {
    console.warn("No tooltip content generated for actor:", actor.name);
    return;
  }

  console.log("Setting tooltip content and showing");
  tokenTooltip.innerHTML = tooltipContent;
  tokenTooltip.style.display = 'block';
  updateTooltipPosition(event);
}

/**
 * Update tooltip position to bottom-left of screen
 */
function updateTooltipPosition(event) {
  if (!tokenTooltip || tokenTooltip.style.display === 'none') return;

  // Position at bottom-left, with some padding from edges
  const padding = 20;
  tokenTooltip.style.left = padding + 'px';
  tokenTooltip.style.bottom = padding + 'px';
  tokenTooltip.style.top = 'auto';
  tokenTooltip.style.right = 'auto';
}

/**
 * Hide tooltip
 */
function hideTokenTooltip() {
  if (tokenTooltip) {
    tokenTooltip.style.display = 'none';
  }
}

/**
 * Generate tooltip content for an actor
 */
function generateTooltipContent(actor) {
  if (!actor || !actor.system) return null;

  try {
    const system = actor.system;
    const flags = actor.flags.andragathima || {};
    
    // Special handling for container actors - show items list instead of combat stats
    if (actor.type === 'container') {
      return generateContainerTooltipContent(actor);
    }
    
    // Special handling for note actors - show note content instead of combat stats
    if (actor.type === 'note') {
      return generateNoteTooltipContent(actor);
    }
    
    // For NPCs, check the useTargetNumbers flag; for characters, default to false
    const useTargetNumbers = flags.useTargetNumbers || false;
    
    // Check if stats should be hidden from players (only for NPCs)
    const hideStatsFromPlayers = (actor.type === 'npc') && flags.hideStatsFromPlayers && !game.user.isGM;
    
    // Function to format stat display
    const formatStat = (value, useTargetNumbers) => {
      if (hideStatsFromPlayers) return "???";
      const result = useTargetNumbers ? `${value + 11}+` : `${value >= 0 ? '+' : ''}${value}`;
      return result.replace(/^-/, '−');
    };
    
    // Function to format simple value
    const formatValue = (value) => {
      if (hideStatsFromPlayers) return "???";
      return value;
    };

  let content = `<div class="item-name">${actor.name}</div>`;
  content += `<div class="item-details">`;

  // Άμυνα (Defense) - Σώμα με σώμα / Μακρόθεν
  if (system.combat?.melee?.defense !== undefined && system.combat?.ranged?.defense !== undefined) {
    const meleeDefense = system.combat.melee.defense;
    const rangedDefense = system.combat.ranged.defense;
    
    const meleeDefenseDisplay = formatStat(meleeDefense, useTargetNumbers);
    const rangedDefenseDisplay = formatStat(rangedDefense, useTargetNumbers);
    
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Defense')}:</span> ${meleeDefenseDisplay}/${rangedDefenseDisplay}</div>`;
  }

  // Αντοχή (Resistance)
  if (system.baseResistance !== undefined) {
    const resistance = system.baseResistance;
    const resistanceDisplay = formatStat(resistance, useTargetNumbers);
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Resistance')}:</span> ${resistanceDisplay}</div>`;
  }

  // Ειδικές αντοχές (Specialized resistances) - εμφάνιση μόνο όσων δεν είναι 0
  if (system.resistances) {
    Object.entries(system.resistances).forEach(([key, resistance]) => {
      if (resistance.total !== undefined && resistance.total !== system.baseResistance && resistance.specialized !== 0) {
        const resistanceDisplay = formatStat(resistance.total, useTargetNumbers);
        const resistanceKey = `Resistance${key.charAt(0).toUpperCase() + key.slice(1)}`;
        content += `<div class="item-property"><span class="property-label">${game.i18n.localize(`ANDRAGATHIMA.${resistanceKey}`)}:</span> ${resistanceDisplay}</div>`;
      }
    });
  }

  // Ζαριές αποφυγής (Saving throws)
  if (system.saves) {
    Object.entries(system.saves).forEach(([key, save]) => {
      if (save.value !== undefined) {
        const saveDisplay = formatStat(save.value, useTargetNumbers);
        const saveKey = `Save${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const saveLabel = game.i18n.localize(`ANDRAGATHIMA.${saveKey}`);
        content += `<div class="item-property"><span class="property-label">${saveLabel}:</span> ${saveDisplay}</div>`;
      }
    });
  }

  // Πάλη/Ευστάθεια
  if (system.combat?.pali?.value !== undefined && system.combat?.eystatheia?.value !== undefined) {
    const pali = system.combat.pali.value;
    const eyst = system.combat.eystatheia.value;
    
    const paliDisplay = formatStat(pali, useTargetNumbers);
    const eystDisplay = formatStat(eyst, useTargetNumbers);
    
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.GrappleStability')}:</span> ${paliDisplay}/${eystDisplay}</div>`;
  }

  // Ταχύτητα
  if (system.combat?.speed?.value !== undefined) {
    const speedDisplay = formatValue(`${system.combat.speed.value} m`);
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Movement')}:</span> ${speedDisplay}</div>`;
  }

  // Πρωτοβουλία
  if (system.combat?.initiative?.value !== undefined) {
    const init = system.combat.initiative.value;
    const initDisplay = formatStat(init, useTargetNumbers);
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Initiative')}:</span> ${initDisplay}</div>`;
  }

  // Επίθεση και Ζημιά από καλύτερο όπλο (από Καταγραφή)
  const weaponInfo = getBestQuickWeaponFromRecord(actor, useTargetNumbers, hideStatsFromPlayers);
  if (weaponInfo) {
    content += weaponInfo;
  }

  // Βαθμός μαγείας (μόνο αν έχει status modifiers ή βασική αξία > 0)
  let finalMagicDegree = system.magic?.degree?.value || 0;
  const statusModifiers = actor._getStatusModifiers ? actor._getStatusModifiers() : {};
  const magicDegreeBonus = statusModifiers.other?.degree || 0;
  finalMagicDegree += magicDegreeBonus;
  
  if (finalMagicDegree > 0) {
    const degreeDisplay = formatValue(finalMagicDegree);
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.MagicDegree')}:</span> ${degreeDisplay}</div>`;
  }

  content += `</div>`;

  return content;
  
  } catch (error) {
    console.warn('Error generating tooltip content for actor:', actor?.name, error);
    return `<div class="item-name">${actor?.name || game.i18n.localize('ANDRAGATHIMA.TooltipUnknownActor')}</div><div class="item-type">${game.i18n.localize('ANDRAGATHIMA.TooltipErrorLoadingData')}</div>`;
  }
}

/**
 * Generate tooltip content specifically for container actors showing their items
 */
function generateContainerTooltipContent(actor) {
  try {
    let content = `<div class="item-name">${actor.name}</div>`;
    content += `<div class="item-details">`;
    
    // Get all items from the container
    const items = actor.items;
    
    if (items && items.size > 0) {
      items.forEach(item => {
        // Create item entry with quantity if applicable
        let itemEntry = item.name;
        if (item.system.quantity && item.system.quantity > 1) {
          itemEntry += ` (×${item.system.quantity})`;
        }
        
        content += `<div class="item-property">${itemEntry}</div>`;
      });
      
    } else {
      // Empty container
      content += `<div class="item-property">${game.i18n.localize('ANDRAGATHIMA.ContainerEmpty') || 'Empty'}</div>`;
    }
    
    content += `</div>`;
    return content;
    
  } catch (error) {
    console.warn('Error generating container tooltip content for actor:', actor?.name, error);
    return `<div class="item-name">${actor?.name || game.i18n.localize('ANDRAGATHIMA.TooltipUnknownActor')}</div><div class="item-type">${game.i18n.localize('ANDRAGATHIMA.TooltipErrorLoadingData')}</div>`;
  }
}

/**
 * Generate tooltip content specifically for note actors showing their text content
 */
function generateNoteTooltipContent(actor) {
  try {
    let content = `<div class="item-name">${actor.name}</div>`;
    content += `<div class="item-details">`;
    
    // Get notes content
    const noteContent = actor.system.notes?.content || "";
    
    if (noteContent.trim()) {
      let displayText = noteContent;
      
      // Check if user is GM or Assistant GM
      const isGMOrAssistant = game.user.isGM || game.user.role >= CONST.USER_ROLES.ASSISTANT;
      
      // Handle // comment separator
      const commentIndex = displayText.indexOf('//');
      if (commentIndex !== -1) {
        if (isGMOrAssistant) {
          // Show everything but with a visual separator
          const publicText = displayText.substring(0, commentIndex).trim();
          const privateText = displayText.substring(commentIndex + 2).trim();
          
          if (publicText && privateText) {
            displayText = publicText + '\n─────────────\n' + privateText;
          } else if (privateText) {
            displayText = '─────────────\n' + privateText;
          } else {
            displayText = publicText;
          }
        } else {
          // Hide everything after //
          displayText = displayText.substring(0, commentIndex).trim();
        }
      }
      
      if (displayText.trim()) {
        // Preserve line breaks by converting them to <br> tags
        // First strip existing HTML tags for safety, then convert line breaks
        const plainText = displayText.replace(/<[^>]*>/g, '');
        const textWithBreaks = plainText.replace(/\n/g, '<br>');
        
        // Truncate if too long - allow more text for notes
        const maxLength = 800;
        let finalText = textWithBreaks;
        if (plainText.length > maxLength) {
          // Find last <br> before maxLength to avoid cutting mid-line
          const truncatedPlain = plainText.substring(0, maxLength);
          const truncatedWithBreaks = truncatedPlain.replace(/\n/g, '<br>');
          finalText = truncatedWithBreaks + '...';
        }
        
        content += `<div class="item-property">${finalText}</div>`;
      } else {
        // Empty note after processing
        content += `<div class="item-property">${game.i18n.localize('ANDRAGATHIMA.NoteEmpty') || 'Empty'}</div>`;
      }
    } else {
      // Empty note
      content += `<div class="item-property">${game.i18n.localize('ANDRAGATHIMA.NoteEmpty') || 'Empty'}</div>`;
    }
    
    content += `</div>`;
    return content;
    
  } catch (error) {
    console.warn('Error generating note tooltip content for actor:', actor?.name, error);
    return `<div class="item-name">${actor?.name || game.i18n.localize('ANDRAGATHIMA.TooltipUnknownActor')}</div><div class="item-type">${game.i18n.localize('ANDRAGATHIMA.TooltipErrorLoadingData')}</div>`;
  }
}

/**
 * Get weapon info from Record tab (Καταγραφή) with all calculated values
 */
function getBestQuickWeaponFromRecord(actor, useTargetNumbers, hideStatsFromPlayers = false) {
  try {
    // First try to get data from an open actor sheet if available
    let weaponsData = null;
    
    // Check if there's an open sheet for this actor
    const openSheet = Object.values(ui.windows).find(w => 
      w.constructor.name === 'AndragathimaActorSheet' && w.actor?.id === actor.id
    );
    
    if (openSheet && openSheet._cachedQuickWeapons) {
      weaponsData = openSheet._cachedQuickWeapons;
    } else {
      // Manual calculation using the same logic as the sheet
      weaponsData = calculateQuickWeaponsData(actor);
    }
    
    if (!weaponsData || (weaponsData.quickWeapons.length === 0 && weaponsData.shieldWeapons.length === 0)) {
      return null;
    }
    
    // Combine all weapons with priority
    const allWeapons = [];
    
    // Add quick weapons (slots 1-8)
    weaponsData.quickWeapons.forEach((weapon, index) => {
      allWeapons.push({
        weapon: weapon,
        position: index + 1,
        showOnToken: weapon.system.showOnToken || false,
        isShield: false
      });
    });
    
    // Add shield weapons (slot 9)
    weaponsData.shieldWeapons.forEach(weapon => {
      allWeapons.push({
        weapon: weapon,
        position: 9,
        showOnToken: weapon.system.showOnToken || false,
        isShield: true
      });
    });
    
    if (allWeapons.length === 0) return null;
    
    // Find weapon with priority: first with showOnToken, or first in order
    const selectedWeapon = allWeapons.find(w => w.showOnToken) || allWeapons[0];
    
    if (!selectedWeapon) return null;
    
    const weapon = selectedWeapon.weapon;
    let content = '';
    
    // Helper functions for formatting
    const formatStat = (value) => {
      if (hideStatsFromPlayers) return "???";
      const result = useTargetNumbers ? `${value + 11}+` : `${value >= 0 ? '+' : ''}${value}`;
      return result.replace(/^-/, '−');
    };
    
    const formatValue = (value) => {
      if (hideStatsFromPlayers) return "???";
      return value;
    };
    
    // Επίθεση (από υπολογισμένες τιμές στην Καταγραφή)
    if (weapon.system.meleeAttackWithPenalty !== undefined && weapon.system.rangedAttackWithPenalty !== undefined) {
      const meleeAttack = weapon.system.meleeAttackWithPenalty;
      const rangedAttack = weapon.system.rangedAttackWithPenalty;
      
      const meleeAttackDisplay = formatStat(meleeAttack);
      const rangedAttackDisplay = formatStat(rangedAttack);
      
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Attack')}:</span> ${meleeAttackDisplay}/${rangedAttackDisplay}</div>`;
    }
    
    // Ζημιά (από υπολογισμένες τιμές στην Καταγραφή)
    if (weapon.system.weaponDamage !== undefined) {
      const damage = weapon.system.weaponDamage;
      const damageType = weapon.system.damageTypeDisplay || '';
      
      let damageDisplay;
      if (hideStatsFromPlayers) {
        damageDisplay = "???";
        if (damageType) {
          damageDisplay += ` ${damageType}`;
        }
      } else {
        damageDisplay = useTargetNumbers ? `${damage + 11}+` : `${damage >= 0 ? '+' : ''}${damage}`;
        damageDisplay = damageDisplay.replace(/^-/, '−');
        if (damageType) {
          damageDisplay += ` ${damageType}`;
        }
      }
      
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Damage')}:</span> ${damageDisplay}</div>`;
    }
    
    // Εμβέλεια (από υπολογισμένες τιμές στην Καταγραφή)
    if (weapon.system.hasRange && weapon.system.range?.displayText) {
      // Replace Greek μ with English m and add space before unit
      let rangeText = weapon.system.range.displayText.replace(/μ/g, ' m');
      // If there's no unit in the original text, add it
      if (!rangeText.includes('m')) {
        // Extract numbers and add m unit with space
        rangeText = rangeText.replace(/(\d+)/g, '$1 m');
      }
      
      const rangeDisplay = formatValue(rangeText);
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Range')}:</span> ${rangeDisplay}</div>`;
    }
    
    return content;
    
  } catch (error) {
    console.error("Error getting weapon info from record:", error);
    return null;
  }
}

/**
 * Calculate quick weapons data manually (same logic as actor sheet)
 */
function calculateQuickWeaponsData(actor) {
  const quickWeapons = [];
  const shieldWeapons = [];
  
  const quickItems = actor.system.equipment?.quickItems || [];
  
  // Process quick weapons (slots 1-8)
  for (let quickItem of quickItems) {
    if (quickItem.id) {
      const item = actor.items.get(quickItem.id);
      if (item && item.type === 'weapon') {
        const weaponData = processWeaponForRecord(actor, item, false);
        if (weaponData) {
          quickWeapons.push(weaponData);
        }
      }
    }
  }
  
  // Process shield weapon (slot 9)
  const shieldSlot = actor.system.equipment?.slots?.shield;
  if (shieldSlot && shieldSlot.id) {
    const item = actor.items.get(shieldSlot.id);
    if (item && item.type === 'weapon') {
      const weaponData = processWeaponForRecord(actor, item, true);
      if (weaponData) {
        shieldWeapons.push(weaponData);
      }
    }
  }
  
  return { quickWeapons, shieldWeapons };
}

/**
 * Process a single weapon for the record (same logic as _prepareQuickWeapons)
 */
function processWeaponForRecord(actor, item, isShieldWeapon = false) {
  try {
    const weaponData = foundry.utils.duplicate(item);
    const system = actor.system;
    
    // Calculate penalties
    const proficiencyPenalty = item.system.proficiencyPenalty || 0;
    const strengthPenalty = item.system.strengthPenalty || 0;
    const rangedWeaponPenalty = item.system.rangedWeaponPenalty || 0;
    
    // Calculate weapon specialization bonus
    const weaponSpecializationBonus = getWeaponSpecializationBonus(actor, item.system.weaponType);
    
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
                const localizedDamageType = getLocalizedDamageType(damageType);
                weaponOtherDamageTypes.push(`+${value} ${localizedDamageType}`);
              }
            }
          }
        }
      }
    }
    
    // Calculate penalties specific to shield weapons
    let shieldSpecificPenalties = 0;
    if (isShieldWeapon) {
      const hasAmfidexios = system.skills?.amfidexios?.hasSkill || false;
      const hasAspidesSkill = system.skills?.aspides?.hasSkill || false;
      const offHandPenalty = hasAmfidexios ? 0 : -2;
      
      let shieldProficiencyPenalty = 0;
      if (!hasAspidesSkill) {
        const weaponType = item.system.weaponType;
        const isLight = item.system.isLight || false;
        
        if (weaponType === 'aspida_varia') {
          shieldProficiencyPenalty = isLight ? -1 : -2;
        }
      }
      
      shieldSpecificPenalties = offHandPenalty + shieldProficiencyPenalty;
    }
    
    // Calculate final attack values
    weaponData.system.meleeAttackWithPenalty = system.combat.melee.attack + 
      proficiencyPenalty + strengthPenalty + rangedWeaponPenalty + 
      shieldSpecificPenalties + weaponSpecializationBonus + weaponMeleeAttackBonus;
      
    weaponData.system.rangedAttackWithPenalty = system.combat.ranged.attack + 
      proficiencyPenalty + strengthPenalty + 
      shieldSpecificPenalties + weaponSpecializationBonus + weaponRangedAttackBonus;
    
    // Calculate damage
    const weaponCoefficient = item.system.damage?.coefficient || 0;
    let abilityMod = 0;
    const ignoreDexterity = system.other?.ignoreDexterityInDamage || false;
    
    if (item.system.ability === 'dyn') {
      abilityMod = system.abilities.dyn.mod || 0;
    } else if (item.system.ability === 'epi') {
      abilityMod = ignoreDexterity ? 0 : (system.abilities.epi.mod || 0);
    } else if (item.system.ability === 'dyn_epi') {
      const dynMod = system.abilities.dyn.mod || 0;
      const epiMod = ignoreDexterity ? 0 : (system.abilities.epi.mod || 0);
      abilityMod = Math.max(dynMod, epiMod);
    }
    
    // Two-handed bonus (0 for shield weapons)
    let twoHandedDamageBonus = 0;
    if (!isShieldWeapon && !item.system.isLight && !item.system.isRanged) {
      const shieldSlot = system.equipment?.slots?.shield;
      const shieldSlotEmpty = !shieldSlot || !shieldSlot.id || shieldSlot.id.trim() === "";
      twoHandedDamageBonus = shieldSlotEmpty ? 1 : 0;
    }
    
    // Get weapon damage modifier from status effects
    const statusModifiers = actor?._getStatusModifiers() || { other: {} };
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
    
    // Set other properties
    weaponData.system.damageTypeDisplay = damageDisplay;
    weaponData.system.range.displayText = (item.system.range?.displayText || '').replace(/μ/g, ' m');
    weaponData.system.hasRange = (item.system.range?.multiplier || 0) > 0 || (item.system.range?.fixed || 0) > 0;
    
    return weaponData;
    
  } catch (error) {
    console.error("Error processing weapon for record:", error);
    return null;
  }
}

/**
 * Get weapon specialization bonus
 */
function getWeaponSpecializationBonus(actor, weaponType) {
  const eidikeysiOpla = actor.system.skills?.eidikeysi_sta_opla;
  
  if (!eidikeysiOpla?.hasSkill || !eidikeysiOpla?.category || !weaponType) {
    return 0;
  }
  
  return (weaponType === eidikeysiOpla.category) ? 2 : 0;
}

/**
 * Get localized damage type name
 */
function getLocalizedDamageType(damageType) {
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
 * Get damage and range from best quick weapon with calculated values (LEGACY)
 */
function getBestQuickWeaponDamage(actor) {
  const quickItems = actor.system.equipment?.quickItems || [];
  const shieldSlot = actor.system.equipment?.slots?.shield;
  
  // Create priority list: quick slots 1-8, then shield slot
  const weaponsToCheck = [];
  
  // Check quick items (slots 1-8) in order
  for (let i = 0; i < Math.min(quickItems.length, 8); i++) {
    const quickItem = quickItems[i];
    if (quickItem.id) {
      const item = actor.items.get(quickItem.id);
      if (item && item.type === 'weapon') {
        weaponsToCheck.push({
          item: item,
          position: i + 1,
          showOnToken: item.system.showOnToken || false
        });
      }
    }
  }
  
  // Check shield slot (position 9)
  if (shieldSlot && shieldSlot.id) {
    const item = actor.items.get(shieldSlot.id);
    if (item && item.type === 'weapon') {
      weaponsToCheck.push({
        item: item,
        position: 9,
        showOnToken: item.system.showOnToken || false
      });
    }
  }
  
  if (weaponsToCheck.length === 0) return null;
  
  // Find weapon with priority:
  // 1. First weapon with showOnToken = true (in order 1,2,3...8,9)  
  // 2. If no weapon has showOnToken, then the first weapon in order (1,2,3...8,9)
  let selectedWeapon = weaponsToCheck.find(w => w.showOnToken) || weaponsToCheck[0];
  
  if (!selectedWeapon) return null;
  
  const weapon = selectedWeapon.item;
  const system = weapon.system;
  let content = '';
  
  // Υπολογισμένη ζημιά (συντελεστής + bonus + ability modifier)
  const damageCoeff = system.damage?.coefficient || 0;
  const damageBonus = system.damage?.bonus || 0;
  
  // Get ability modifier for damage (use calculated values from combat system)
  let totalDamage = damageCoeff + damageBonus;
  const actor_system = actor.system;
  
  // Add the appropriate ability modifier based on weapon type
  if (system.ability === 'dyn') {
    // For STR weapons, use the melee damage modifier
    const strMod = Math.floor((actor_system.abilities?.dyn?.displayValue - 10) / 2) || 0;
    totalDamage += strMod;
  } else if (system.ability === 'epi') {
    // For DEX weapons, use DEX modifier unless ignoreDexterityInDamage is set
    if (!system.ignoreDexterityInDamage) {
      const dexMod = Math.floor((actor_system.abilities?.epi?.displayValue - 10) / 2) || 0;
      totalDamage += dexMod;
    }
  }
  
  if (totalDamage !== 0) {
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Damage')}:</span> ${totalDamage >= 0 ? '+' : ''}${totalDamage}</div>`;
  }
  
  // Υπολογισμένη εμβέλεια
  if (system.range) {
    let rangeText = '';
    if (system.range.text) {
      rangeText = system.range.text;
    } else {
      let shortRange = system.range.short || 0;
      let longRange = system.range.long || 0;
      
      // Apply multiplier if exists
      if (system.range.multiplier > 0) {
        const abilityValue = actor_system.abilities[system.ability]?.displayValue || 10;
        shortRange = Math.floor(abilityValue * system.range.multiplier);
        longRange = shortRange * 2; // Typically long range is double short range
      }
      
      // Apply fixed range if exists
      if (system.range.fixed > 0) {
        shortRange = system.range.fixed;
        longRange = system.range.fixed;
      }
      
      if (shortRange > 0) {
        rangeText += `${shortRange} m`;
        if (longRange > 0 && longRange !== shortRange) {
          rangeText += `/${longRange} m`;
        }
      }
    }
    
    if (rangeText) {
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Range')}:</span> ${rangeText}</div>`;
    }
  }
  
  return content;
}

/**
 * Get the best quick weapon for display based on priority (LEGACY - keeping for reference)
 */
function getBestQuickWeapon(actor, useTargetNumbers) {
  const quickItems = actor.system.equipment?.quickItems || [];
  const shieldSlot = actor.system.equipment?.slots?.shield;
  
  // Create priority list: quick slots 1-8, then shield slot
  const weaponsToCheck = [];
  
  // Check quick items (slots 1-8) in order
  for (let i = 0; i < Math.min(quickItems.length, 8); i++) {
    const quickItem = quickItems[i];
    if (quickItem.id) {
      const item = actor.items.get(quickItem.id);
      if (item && item.type === 'weapon') {
        weaponsToCheck.push({
          item: item,
          position: i + 1,
          showOnToken: item.system.showOnToken || false
        });
      }
    }
  }
  
  // Check shield slot (position 9)
  if (shieldSlot && shieldSlot.id) {
    const item = actor.items.get(shieldSlot.id);
    if (item && item.type === 'weapon') {
      weaponsToCheck.push({
        item: item,
        position: 9,
        showOnToken: item.system.showOnToken || false
      });
    }
  }
  
  if (weaponsToCheck.length === 0) return null;
  
  // Find weapon with priority:
  // 1. First weapon with showOnToken = true (in order 1,2,3...8,9)  
  // 2. If no weapon has showOnToken, then the first weapon in order (1,2,3...8,9)
  let selectedWeapon = weaponsToCheck.find(w => w.showOnToken) || weaponsToCheck[0];
  
  if (!selectedWeapon) return null;
  
  const weapon = selectedWeapon.item;
  const system = weapon.system;
  let content = '';
  
  // Επίθεση
  if (system.attack !== undefined && system.attack.bonus !== undefined) {
    const attack = system.attack.bonus;
    const attackDisplay = useTargetNumbers ? `${attack + 11}+` : `${attack >= 0 ? '+' : ''}${attack}`;
    content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Attack')}:</span> ${attackDisplay}</div>`;
  }
  
  // Ζημιά
  if (system.damage !== undefined) {
    const damageCoeff = system.damage.coefficient || 0;
    const damageBonus = system.damage.bonus || 0;
    let damageText = '';
    
    if (damageCoeff > 0) {
      damageText += `${damageCoeff}`;
    }
    if (damageBonus !== 0) {
      damageText += `${damageBonus >= 0 ? '+' : ''}${damageBonus}`;
    }
    
    if (damageText) {
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Damage')}:</span> ${damageText}</div>`;
    }
  }
  
  // Εμβέλεια (αν υπάρχει)
  if (system.range && (system.range.short > 0 || system.range.long > 0 || system.range.text)) {
    let rangeText = '';
    if (system.range.text) {
      rangeText = system.range.text;
    } else {
      if (system.range.short > 0) rangeText += `${system.range.short}μ`;
      if (system.range.long > 0 && system.range.long !== system.range.short) {
        rangeText += `/${system.range.long}μ`;
      }
    }
    
    if (rangeText) {
      content += `<div class="item-property"><span class="property-label">${game.i18n.localize('ANDRAGATHIMA.Range')}:</span> ${rangeText}</div>`;
    }
  }
  
  return content;
}

/**
 * Handle canvas pointer over events
 */
function handleTokenHover(event) {
  console.log("Canvas pointer over event:", event);
  
  // Find if we're hovering over a token
  const point = event.data.global;
  const tokens = canvas.tokens.quadtree.getObjects(new PIXI.Rectangle(point.x - 1, point.y - 1, 2, 2));
  
  if (tokens.length > 0) {
    const token = tokens[0];
    console.log("Hovering over token:", token.actor?.name);
    showTokenTooltip(token, event);
  }
}

/**
 * Handle canvas pointer out events
 */
function handleTokenOut(event) {
  // Small delay to prevent flickering when moving between parts of the same token
  setTimeout(() => {
    if (tokenTooltip && tokenTooltip.style.display === 'block') {
      const point = event.data.global;
      const tokens = canvas.tokens.quadtree.getObjects(new PIXI.Rectangle(point.x - 1, point.y - 1, 2, 2));
      
      if (tokens.length === 0) {
        console.log("No longer hovering over any token");
        hideTokenTooltip();
      }
    }
  }, 50);
}

/**
 * Setup Token class hover override for direct integration
 */
function setupTokenHoverOverride() {
  console.log("Setting up Token hover override...");
  
  // Don't override if already overridden (avoid double overrides)
  if (Token.prototype._onHoverIn._andragathimaOverride) {
    console.log("Token hover already overridden, skipping");
    return;
  }
  
  // Store original methods
  const originalOnHoverIn = Token.prototype._onHoverIn;
  const originalOnHoverOut = Token.prototype._onHoverOut;
  
  // Override _onHoverIn
  Token.prototype._onHoverIn = function(event, options) {
    console.log("Token hover in:", this.actor?.name);
    
    // Call original method first
    let result;
    if (originalOnHoverIn) {
      result = originalOnHoverIn.call(this, event, options);
    }
    
    // Add our tooltip
    try {
      showTokenTooltip(this, event);
    } catch (error) {
      console.error("Error showing tooltip:", error);
    }
    
    return result;
  };
  
  // Mark as overridden
  Token.prototype._onHoverIn._andragathimaOverride = true;
  
  // Override _onHoverOut  
  Token.prototype._onHoverOut = function(event, options) {
    console.log("Token hover out:", this.actor?.name);
    
    // Call original method first
    let result;
    if (originalOnHoverOut) {
      result = originalOnHoverOut.call(this, event, options);
    }
    
    // Hide our tooltip
    try {
      hideTokenTooltip();
    } catch (error) {
      console.error("Error hiding tooltip:", error);
    }
    
    return result;
  };
  
  // Mark as overridden
  Token.prototype._onHoverOut._andragathimaOverride = true;
  
  console.log("Token hover override setup complete");
}

/**
 * Handle token hover events (backup method)
 */
function onTokenHover(token, hovered) {
  if (hovered) {
    showTokenTooltip(token, { clientX: 0, clientY: 0 });
  } else {
    hideTokenTooltip();
  }
}

/* -------------------------------------------- */
/*  Preload Handlebars Templates                */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // Actor sheets
    "systems/andragathima/templates/actor/character-sheet.html",
    "systems/andragathima/templates/actor/npc-sheet.html",
    "systems/andragathima/templates/actor/container-sheet.html",
    
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

/* -------------------------------------------- */
/*  System Settings                             */
/* -------------------------------------------- */

// Register system settings
function registerSystemSettings() {
  // Token tooltip on/off setting
  game.settings.register("andragathima", "showTokenTooltips", {
    name: "ANDRAGATHIMA.Settings.ShowTokenTooltips",
    hint: "ANDRAGATHIMA.Settings.ShowTokenTooltipsHint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  
  // Torch duration setting (in minutes)
  game.settings.register("andragathima", "torchDurationMinutes", {
    name: "ANDRAGATHIMA.Settings.TorchDuration",
    hint: "ANDRAGATHIMA.Settings.TorchDurationHint",
    scope: "world",
    config: true,
    default: 60,
    type: Number,
    range: {
      min: 1,
      max: 480,
      step: 1
    }
  });
  
  // Frightened stroke effect setting
  game.settings.register("andragathima", "frightenedStrokeShape", {
    name: "ANDRAGATHIMA.Settings.FrightenedStrokeShape",
    hint: "ANDRAGATHIMA.Settings.FrightenedStrokeShapeHint",
    scope: "world",
    config: true,
    default: "ellipse",
    type: String,
    choices: {
      "ellipse": "ANDRAGATHIMA.Settings.FrightenedStrokeEllipse",
      "rectangle": "ANDRAGATHIMA.Settings.FrightenedStrokeRectangle",
      "off": "ANDRAGATHIMA.Settings.FrightenedStrokeOff"
    }
  });
}

// Initialize settings on init hook
Hooks.once("init", () => {
  registerSystemSettings();
});

/* -------------------------------------------- */
/*  Torch Duration Management                   */
/* -------------------------------------------- */

/**
 * Handle world time updates to check torch duration
 */
async function onUpdateWorldTime(currentTime, deltaTime) {
  // Only check if time has actually advanced
  if (deltaTime <= 0) return;
  
  console.log(`World time updated: current=${currentTime}, delta=${deltaTime}`);
  
  // Check all tokens on the current scene for expired torches
  await checkAllTorchDurations();
}

/**
 * Calculate total torch usage time (accumulated + current session if active)
 */
function calculateTorchTotalUsage(token, torchItem, currentTime) {
  if (!torchItem) return 0;
  
  const torchAccumulatedTime = torchItem.flags?.andragathima?.accumulatedTime || 0;
  const torchStartTime = token.document.flags?.andragathima?.torchStartTime;
  const activeTorchId = token.document.flags?.andragathima?.activeTorchId;
  const isTorchLight = token.document.flags?.andragathima?.torchLight;
  
  // If this torch is currently active, add current session time
  if (isTorchLight && torchStartTime && activeTorchId === torchItem.id) {
    const currentSessionTime = currentTime - torchStartTime;
    return torchAccumulatedTime + currentSessionTime;
  }
  
  // Otherwise return just the accumulated time
  return torchAccumulatedTime;
}

/**
 * Check all tokens for expired torches (used by both time update and periodic checks)
 */
async function checkAllTorchDurations() {
  if (!canvas || !canvas.tokens || !game.time) return;
  
  const currentTime = game.time.worldTime;
  
  for (const token of canvas.tokens.placeables) {
    await checkTorchDuration(token, currentTime);
  }
}

/**
 * Check if a token's torch has expired and handle destruction
 */
async function checkTorchDuration(token, currentTime) {
  if (!token.document || !token.actor) return;
  
  const torchStartTime = token.document.flags?.andragathima?.torchStartTime;
  const activeTorchId = token.document.flags?.andragathima?.activeTorchId;
  const isTorchLight = token.document.flags?.andragathima?.torchLight;
  
  // Skip if this token doesn't have an active torch
  if (!isTorchLight || !torchStartTime || !activeTorchId) return;
  
  // Get the active torch item and calculate its total usage
  const torchItem = token.actor.items.get(activeTorchId);
  if (!torchItem) return;
  
  const totalElapsedTime = calculateTorchTotalUsage(token, torchItem, currentTime);
  const torchDurationMinutes = game.settings.get("andragathima", "torchDurationMinutes");
  const TORCH_DURATION = torchDurationMinutes * 60; // Convert minutes to seconds
  const usagePercentage = totalElapsedTime / TORCH_DURATION;
  
  // Check if torch needs dimming (80% usage) but hasn't been dimmed yet
  if (usagePercentage > 0.8 && usagePercentage < 1.0) {
    const currentLight = token.document.light;
    const isDimmed = token.document.flags?.andragathima?.torchDimmed;
    
    // Only dim if it's currently at full brightness (bright: 10) and not already marked as dimmed
    if (currentLight.bright === 10 && !isDimmed) {
      await token.document.update({
        light: {
          ...currentLight,
          bright: 5,
          dim: 10
        },
        flags: {
          andragathima: {
            ...token.document.flags.andragathima,
            torchDimmed: true
          }
        }
      });
      console.log(`Torch dimmed for token ${token.name || token.id} due to ${Math.round(usagePercentage * 100)}% usage`);
    }
  }
  
  if (totalElapsedTime >= TORCH_DURATION) {
    console.log(`Torch expired for token ${token.name || token.id}. Total elapsed: ${totalElapsedTime}s`);
    
    // Remove torch lighting first
    await token.document.update({ 
      light: {
        bright: 0,
        dim: 0
      },
      flags: { 
        andragathima: { 
          torchLight: false,
          torchStartTime: null,
          activeTorchId: null,
          torchDimmed: false
        } 
      }
    });
    
    // Destroy the torch item in a separate try-catch to isolate errors
    try {
      if (torchItem) {
        await destroyTorchItem(token.actor, torchItem);
      }
    } catch (error) {
      console.error("Error in torch destruction (isolated):", error);
      // Continue with the rest of the function even if destruction fails
    }
    
    // Show notification to the token's owner
    const owners = token.actor.ownership ? Object.entries(token.actor.ownership)
      .filter(([userId, level]) => level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
      .map(([userId]) => userId) : [];
      
    for (const userId of owners) {
      const user = game.users.get(userId);
      if (user && user.active) {
        ui.notifications.warn(`Ο δαυλός του ${token.name || token.actor.name} έσβησε και καταστράφηκε!`, 
          { permanent: false, userId: userId });
      }
    }
  }
}

/**
 * Find a torch item (Δαυλός or Πυρσός) in an actor's inventory
 */
function findTorchItem(actor) {
  for (const item of actor.items) {
    if (item.type === 'weapon' && item.system.showOnToken) {
      const name = item.name.toLowerCase();
      if (name.includes('δαυλός') || name.includes('πυρσός') || 
          name.includes('δαυλος') || name.includes('πυρσος')) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Destroy a torch item from an actor's inventory
 */
async function destroyTorchItem(actor, torchItem) {
  if (!torchItem || !torchItem.id || !actor) {
    console.warn("Invalid parameters passed to destroyTorchItem");
    return;
  }
  
  try {
    // First, find and clear the torch from quick items
    const quickItems = actor.system.equipment?.quickItems || [];
    const updatedQuickItems = quickItems.map(quickItem => {
      // Handle potentially undefined/null quickItems
      if (!quickItem) {
        return { id: "", name: "", img: "", tooltip: "" };
      }
      if (quickItem.id === torchItem.id) {
        // Clear the quick item slot
        return { id: "", name: "", img: "", tooltip: "" };
      }
      return quickItem;
    });
    
    // Prepare all updates in a single operation
    const updateData = {
      "system.equipment.quickItems": updatedQuickItems
    };
    
    // Also check and clear shield slot if needed
    const shieldSlot = actor.system.equipment?.slots?.shield;
    if (shieldSlot && shieldSlot.id === torchItem.id) {
      updateData["system.equipment.slots.shield"] = { id: "", name: "", img: "", tooltip: "" };
    }
    
    // Update all equipment references first
    await actor.update(updateData);
    
    // Now remove the item from the actor
    await torchItem.delete();
    
    console.log(`Successfully destroyed torch item "${torchItem.name}" from ${actor.name}`);
    
    // Token status effects will be updated automatically by the item deletion hook
  } catch (error) {
    console.error("Error destroying torch item:", error);
    console.error("Actor:", actor?.name, "Item:", torchItem?.name, "ItemID:", torchItem?.id);
  }
}