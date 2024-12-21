/*:
 * @target MZ
 * @plugindesc Provides manual item consumption functions to handle item usage without relying on $gameParty.useItem.
 * @author 
 *
 * @help
 * =============================================================================
 * ManualItemConsumption.js
 * =============================================================================
 *
 * This plugin offers functions to manually consume items, weapons, and armors,
 * applying their effects without using the potentially overridden $gameParty.useItem method.
 *
 * -----------------------------------------------------------------------------
 * **Script Calls**
 * -----------------------------------------------------------------------------
 *
 * 1. **Consume a Consumable Item and Apply Its Effects**
 *    - **Function:** ManualItemConsumption.consumeItem(itemId)
 *    - **Parameters:**
 *        - itemId (Number): The ID of the consumable item to consume.
 *    - **Description:** Consumes one instance of the specified consumable item, applies its effects, and removes it from the inventory.
 *    - **Example:**
 *        ```javascript
 *        ManualItemConsumption.consumeItem(5); // Consumes item with ID 5
 *        ```
 *
 * 2. **Consume a Weapon or Armor Without Applying Effects**
 *    - **Function:** ManualItemConsumption.consumeEquipment(equipmentId)
 *    - **Parameters:**
 *        - equipmentId (Number): The ID of the weapon or armor to consume.
 *    - **Description:** Removes one instance of the specified weapon or armor from the inventory without applying any effects.
 *    - **Example:**
 *        ```javascript
 *        ManualItemConsumption.consumeEquipment(10); // Consumes weapon/armor with ID 10
 *        ```
 *
 * -----------------------------------------------------------------------------
 * **Notes**
 * -----------------------------------------------------------------------------
 *
 * - **Effect Codes:**
 *    - **11:** Parameter Change (e.g., ATK, DEF)
 *    - **21:** Add State (e.g., poison, regen)
 *    - **Other codes:** Can be handled as needed.
 *
 * - **Error Handling:**
 *    - The plugin checks for the existence of the item and sufficient quantity before consuming.
 *    - Logs warnings to the console if consumption fails.
 *
 * - **Compatibility:**
 *    - Designed to work seamlessly with VisuMZ plugins.
 *    - Ensure this plugin is placed **after** VisuMZ plugins in the Plugin Manager.
 *
 * -----------------------------------------------------------------------------
 * **Changelog**
 * -----------------------------------------------------------------------------
 * Version 1.0.0 - Initial release.
 */

var ManualItemConsumption = ManualItemConsumption || {};

(() => {
    'use strict';

    /**
     * Consumes a consumable item, applies its effects, and removes it from the inventory.
     * @param {Number} itemId - The ID of the consumable item.
     */
    ManualItemConsumption.consumeItem = function(itemId) {
        const item = $dataItems[itemId];
        
        if (!item) {
            console.warn(`ManualItemConsumption: Item ID ${itemId} does not exist.`);
            return;
        }
        
        if (!$gameParty.hasItem(item, false)) {
            console.warn(`ManualItemConsumption: No ${item.name} left to consume.`);
            return;
        }
        
        // Apply item's effects
        const user = $gameParty.leader(); // Modify as needed for multiple users
        item.effects.forEach(effect => {
            switch (effect.code) {
                case 11: // Parameter Change
                    user.addParam(effect.dataId, effect.value1);
                    break;
                case 21: // Add State
                    user.addState(effect.dataId);
                    break;
                // Handle other effect codes as needed
                default:
                    console.warn(`ManualItemConsumption: Unsupported effect code ${effect.code}.`);
            }
        });
        
        // Remove the item from inventory
        $gameParty.gainItem(item, -1, false);
        console.log(`ManualItemConsumption: Consumed one ${item.name}.`);
    };

    /**
     * Consumes a weapon or armor without applying any effects.
     * @param {Number} equipmentId - The ID of the weapon or armor to consume.
     */
    ManualItemConsumption.consumeEquipment = function(equipmentId) {
        let equipment = null;
        let type = '';

        if ($dataWeapons[equipmentId]) {
            equipment = $dataWeapons[equipmentId];
            type = 'Weapon';
        } else if ($dataArmors[equipmentId]) {
            equipment = $dataArmors[equipmentId];
            type = 'Armor';
        } else {
            console.warn(`ManualItemConsumption: Equipment ID ${equipmentId} does not exist.`);
            return;
        }

        if (!$gameParty.hasItem(equipment, false)) {
            console.warn(`ManualItemConsumption: No ${type} (${equipment.name}) left to consume.`);
            return;
        }

        // Remove the equipment from inventory
        $gameParty.gainItem(equipment, -1, false);
        console.log(`ManualItemConsumption: Consumed one ${type} (${equipment.name}).`);
    };

})();
