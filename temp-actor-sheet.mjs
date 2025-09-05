  /**
   * Handle dropping items onto equipment slots
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData ? 
      foundry.applications.ux.TextEditor.implementation.getDragEventData(event) :
      TextEditor.getDragEventData(event);
    
    console.log("Drop event data:", data);
    
    // Only handle item drops
    if (data.type !== "Item") {
      console.log("Not an item drop, passing to super");
      return super._onDrop(event);
    }
    
    // Check if dropped on an equipment slot or misc equipment slot
    const equipmentSlot = event.target.closest('.item-slot');
    const miscSlot = event.target.closest('.misc-equipment-slot');

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
    console.log("Dropped outside specific slots, checking misc slots");
    const miscEquipmentSlots = this._getMiscEquipmentSlots();
    const firstEmptySlot = miscEquipmentSlots.findIndex(slot => slot === null);
    
    console.log("First empty misc slot:", firstEmptySlot);
    
    if (firstEmptySlot !== -1) {
      console.log("Placing in misc slot", firstEmptySlot);
      return this._handleMiscSlotDrop(event, null, firstEmptySlot, data);
    }
    
    // If no misc slots available, fall back to default behavior
    console.log("No misc slots available, using default behavior");
    return super._onDrop(event);
  }