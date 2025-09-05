/**
 * Custom Active Effect sheet for ΑΝΔΡΑΓΑΘΗΜΑ
 * @extends {FormApplication}
 */
export class AndragathimaActiveEffectSheet extends FormApplication {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["andragathima", "sheet", "active-effect"],
      width: 540,
      height: 600,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true
    });
  }

  /** @override */
  get id() {
    return `active-effect-${this.object.id}`;
  }

  /** @override */
  get title() {
    return `${this.object.name} - Active Effect`;
  }

  /** @override */
  get template() {
    return "systems/andragathima/templates/effect/effect-sheet.html";
  }

  /** @override */
  async getData() {
    const context = {
      effect: this.object,
      data: this.object.system,
      isEditable: this.isEditable,
      owner: this.object.isOwner,
      cssClass: this.options.classes.join(" ")
    };
    
    // Add CONFIG data for status effects and other options
    context.config = CONFIG.ANDRAGATHIMA;
    
    // Prepare status effects list
    context.statusEffects = CONFIG.ANDRAGATHIMA.statusEffects;
    
    // Process the effect's statuses for checkboxes
    if (context.effect.statuses && Array.isArray(context.effect.statuses)) {
      context.effect.statusesSet = new Set(context.effect.statuses);
    } else {
      context.effect.statusesSet = new Set();
    }
    
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Effect change management
    html.find('.add-effect-change').click(this._onAddEffectChange.bind(this));
    html.find('.effect-change-delete').click(this._onDeleteEffectChange.bind(this));
    
    // Value field select all on focus
    html.find('.effect-value').on('focus', function() {
      this.select();
    });
    
    // Auto-save when effect fields change
    html.find('.effect-attribute, .effect-mode, .effect-value').change(this._onEffectFieldChange.bind(this));
    html.find('input[name="name"]').change(this._onEffectFieldChange.bind(this));
    html.find('textarea[name="description"]').change(this._onEffectFieldChange.bind(this));
    html.find('input[name="disabled"]').change(this._onEffectFieldChange.bind(this));
    html.find('input[name="flags.andragathima.showOnToken"]').change(this._onEffectFieldChange.bind(this));
    
    // Duration fields
    html.find('select[name="duration.units"], input[name="duration.value"]').change(this._onEffectFieldChange.bind(this));
    
    // Status checkboxes
    html.find('input[name="statuses"]').change(this._onStatusChange.bind(this));
    
    // Image click handler for changing effect icon
    html.find('img[data-edit="img"]').click(this._onEditImage.bind(this));
  }

  /**
   * Handle adding a new effect change
   */
  async _onAddEffectChange(event) {
    event.preventDefault();
    
    const changes = foundry.utils.duplicate(this.object.changes || []);
    changes.push({
      key: "",
      mode: 2, // Add mode
      value: "0"
    });
    
    await this.object.update({changes: changes});
    this.render(); // Force re-render to update the UI
  }

  /**
   * Handle deleting an effect change
   */
  async _onDeleteEffectChange(event) {
    event.preventDefault();
    
    const changeIndex = parseInt(event.currentTarget.dataset.changeIndex);
    const changes = foundry.utils.duplicate(this.object.changes || []);
    
    if (changeIndex >= 0 && changeIndex < changes.length) {
      changes.splice(changeIndex, 1);
      await this.object.update({changes: changes});
      this.render(); // Force re-render to update the UI
    }
  }

  /**
   * Handle field changes and auto-save
   */
  async _onEffectFieldChange(event) {
    event.preventDefault();
    await this.submit();
    
    // If this is the showOnToken field, update token overlays
    if (event.target.name === 'flags.andragathima.showOnToken') {
      console.log('Show on token checkbox changed:', event.target.checked);
      const actor = this.object.parent;
      if (actor && actor.documentName === 'Actor') {
        console.log('Updating token overlays for actor:', actor.name);
        // Call the global update function
        if (game.andragathima?.updateTokenStatusEffects) {
          game.andragathima.updateTokenStatusEffects(actor);
        } else {
          console.error('updateTokenStatusEffects function not found in game.andragathima');
        }
      } else {
        console.log('Effect parent is not an Actor:', this.object.parent);
      }
    }
  }

  /**
   * Handle status condition checkbox changes
   */
  async _onStatusChange(event) {
    event.preventDefault();
    
    const statusId = event.currentTarget.value;
    const isChecked = event.currentTarget.checked;
    
    let statuses = [...(this.object.statuses || [])];
    
    if (isChecked) {
      if (!statuses.includes(statusId)) {
        statuses.push(statusId);
      }
    } else {
      statuses = statuses.filter(s => s !== statusId);
    }
    
    await this.object.update({statuses: statuses});
  }

  /** @override */
  async _updateObject(event, formData) {
    
    // Handle status checkboxes - collect all checked statuses
    const statusInputs = event.target?.querySelectorAll('input[name="statuses"]:checked');
    if (statusInputs) {
      const statuses = Array.from(statusInputs).map(input => input.value);
      formData.statuses = statuses;
    } else {
      formData.statuses = [];
    }
    
    // Handle changes array properly
    const changes = [];
    const changeIndices = new Set();
    
    // Collect all change indices from form data
    Object.keys(formData).forEach(key => {
      const match = key.match(/^changes\.(\d+)\./);
      if (match) {
        changeIndices.add(parseInt(match[1]));
      }
    });
    
    
    // Build changes array
    Array.from(changeIndices).sort((a, b) => a - b).forEach(index => {
      const key = formData[`changes.${index}.key`];
      const mode = parseInt(formData[`changes.${index}.mode`]) || 2;
      const value = formData[`changes.${index}.value`] || "";
      
      
      // Include even empty keys to preserve structure
      changes.push({ key, mode, value });
      
      // Remove from formData to avoid conflicts
      delete formData[`changes.${index}.key`];
      delete formData[`changes.${index}.mode`];
      delete formData[`changes.${index}.value`];
    });
    
    formData.changes = changes;
    
    return this.object.update(formData);
  }

  /**
   * Handle clicking on the effect image to change it
   */
  async _onEditImage(event) {
    const fp = new FilePicker({
      type: "image",
      current: this.object.img,
      callback: async (path) => {
        await this.object.update({ img: path });
        // Re-render the sheet to update the image
        this.render();
      }
    });
    fp.render(true);
  }

}