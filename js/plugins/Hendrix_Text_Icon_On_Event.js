/*:
 * @target MZ
 * @plugindesc Display icon or text on events within a few clicks when the player is in range or at a region ID
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io/
 * 
 * @help
 * Verion 1.2.1
 * ----------------------------------------------------------------------------
 * This is a plugin for RPG Maker MZ that allows you to show icon or text on top
 * of events when the player is within a certain range or at a certain region ID.
 * It's helpful when you want to notify playeres which item is pickable, 
 * which item is treasure, what NPC is a shop owner, etc. It's up to your imagination. 
 * ----------------------------------------------------------------------------
 * FEATURES
 * - Display icons on events or groups of events using notetags, saving tons of time
 *   and making it less disruptive when changing icons later.
 * - Display icons only when the player is within a certain range of the events.
 * - Display text on events with extensive customization options: add icons alongside text, 
 *   include idle animations, display text only when the player is within a certain range, etc.
 * - Display icons, text based on the region ID the player is standing on.
 * - Option to display only the nearest event's icon to the player.
 * - An awesome developer who will support you 24/7!
 * ----------------------------------------------------------------------------
 * CHANGELOG
 * [ver 1.2.1]
 * [ver 1.2.0] - New feature: Now the icon & text will automatically display above
 *             all size of events automatically without the need to adjust
 *             offset y manually to each event
 *             - Nea feature: The option to adjust height offset for group 
 *             of events incase you need it
 * [ver 1.1.0] New feature: A mode for icon/text to display when player is at
 *             a certain region id.
 * ----------------------------------------------------------------------------
 * HOW TO USE
 * Display Icon:
 * 1. Setup a notetag in parameter and the icon for events with said notetag
 * 2. Now any event with the same notetag will display icon you've just setup
 * Example: Any events with notetag <pickable> will display icon Hand
 * 
 * Display Text:
 * 1. In notetag field of an event, write: 
 * <text: text, icon ID, animation? (default is false), range (default is 7)>
 * 
 * Usage: <text: Shop>               -> Display text Shop
 *        <text: Shop, 12>           -> Display text Shop along with icon 12
 *        <text: Shop, 12, true>     -> Same but with a nice idle animation
 *        <text: Shop, 12, true, 9>  -> This text will hide if you're not within 9 tiles
 *        if range is  infinite      -> Always show text wherever you are
 *        if range is  region x      -> Only show when player is standing on region ID x
 * 
 *        <text: Shop, 12, true, region 2>  -> Show when player is at region ID 2 
 * ----------------------------------------------------------------------------
 * For feedback, please dm me on X or via Discord:
 * https://x.com/sanghendrix96
 * https://discord.com/invite/YKPscqHV8b
 * https://www.patreon.com/c/SangHendrix
 * 
 * 
 * @param iconStructs
 * @text Icon ID and Range
 * @type struct<IconStruct>[]
 * @default []
 * @desc List of icon IDs, ranges, and trigger ranges with corresponding notetags.
 *
 * @param onlyShowNearest
 * @text Only Show Nearest
 * @type boolean
 * @default true
 * @desc If true, only the nearest event's icon to the player will be displayed when multiple events are within range.
 * 
 * @param textSettings
 * @text Text Display Settings
 * @type struct<TextSettings>
 * @default {"fontSize":"18","fontFace":"","textColor":"","outlineColor":"","outlineWidth":""}
 * @desc Settings for text display above events
 */

/*~struct~IconStruct:
 * @param notetag
 * @text Notetag
 * @type string
 * @desc The notetag to look for in events.
 *
 * @param iconId
 * @text Icon ID
 * @type icon
 * @desc The icon ID to display above the event.
 *
 * @param range
 * @text Range
 * @type string
 * @desc The range within which the icon will be displayed. Use  region x  for regionID-based or number for distance to player.
 * @default 5
 * 
 * @param heightOffset
 * @text Height Offset
 * @type number
 * @desc (Optional) Vertical offset for the icon. Only use for rare case.
 * @default 0
 */
/*~struct~TextSettings:
 * @param fontSize
 * @text Font Size
 * @type number
 * @default 18
 * @desc Size of the displayed text
 *
 * @param fontFace
 * @text Font Face
 * @type string
 * @default
 * @desc Font to use for the text (something.ttf/otf)
 *
 * @param textColor
 * @text Text Color
 * @type string
 * @default
 * @desc Color of the text (hex code)
 *
 * @param outlineColor
 * @text Outline Color
 * @type string
 * @default
 * @desc Color of the text outline (hex code)
 *
 * @param outlineWidth
 * @text Outline Width
 * @type number
 * @default
 * @desc Width of the text outline
 */

(() => {
    const parameters = PluginManager.parameters('Hendrix_Text_Icon_On_Event');
    const iconStructs = JSON.parse(parameters['iconStructs'] || '[]').map(JSON.parse);
    const onlyShowNearest = parameters['onlyShowNearest'] === 'true';
    const updateFrequency = Number(parameters['updateFrequency'] || 5);
    const textSettings = JSON.parse(parameters['textSettings'] || '{}');

    if (textSettings.fontFace && (textSettings.fontFace.endsWith('.ttf') || textSettings.fontFace.endsWith('.otf'))) {
        const fontName = textSettings.fontFace.split('.')[0];
        const fontPath = `fonts/${textSettings.fontFace}`;
        
        const font = new FontFace(fontName, `url('${fontPath}')`);
        font.load().then(function(loadedFont) {
            document.fonts.add(loadedFont);
            textSettings.fontFace = fontName;
        }).catch(function() {
            textSettings.fontFace = 'rmmz-mainfont';
        });
    }
    
    const eventHeightCache = new Map();
    const eventIconCache = new Map();
    let frameCount = 0;

    function parseTextNote(note) {
        const DEFAULT_ANIMATION = false;
        const DEFAULT_RANGE = 7;
        
        const match = note.match(/<text:\s*(.+?)>/i);
        if (!match) return null;

        const params = match[1].split(',').map(p => p.trim());
        
        const text = params[0];
        const iconId = params[1] ? parseInt(params[1]) : null;
        const animation = params[2] ? params[2].toLowerCase() === 'true' : DEFAULT_ANIMATION;
        
        let range;
        const rangeStr = params[3] ? params[3].toLowerCase() : String(DEFAULT_RANGE);
        
        if (rangeStr === 'infinite') {
            range = { type: 'infinite' };
        } else if (rangeStr.startsWith('region ')) {
            const regionId = parseInt(rangeStr.split(' ')[1]);
            range = { type: 'region', value: regionId };
        } else {
            range = { type: 'distance', value: parseInt(rangeStr) || DEFAULT_RANGE };
        }

        return {
            text,
            iconId,
            animation,
            range
        };
    }

    Game_Map.prototype.isPlayerInRegion = function(regionId) {
        return this.regionId($gamePlayer.x, $gamePlayer.y) === regionId;
    };

    Spriteset_Map.prototype.isInRange = function(event, range) {
        if (!range) return false;
        
        switch (range.type) {
            case 'infinite':
                return true;
            case 'region':
                return $gameMap.isPlayerInRegion(range.value);
            case 'distance':
                const distance = this.getDistanceToPlayer(event, $gamePlayer);
                return distance <= range.value;
            default:
                return false;
        }
    };

    class Sprite_EventText extends Sprite {
        constructor(config) {
            super();
            this._text = config.text;
            this._iconId = config.iconId;
            this._useAnimation = config.animation;
            this._currentScale = 0;
            this._idleAmplitude = 20;
            this._idleSpeed = 0.1;
            this._idlePhase = Math.random() * Math.PI * 2;
            this.scale.set(0, 0);
            this.anchor.set(0.5, 1);
            this.createTextBitmap();
        }

        createTextBitmap() {
            const fontSize = Number(textSettings.fontSize || 16);
            const iconSize = 32;
            const iconPadding = this._iconId ? 4 : 0;
            const textWidth = 1000;
            const height = Math.max(fontSize + 8, iconSize);
            
            const bitmap = new Bitmap(textWidth, height);
            bitmap.fontFace = textSettings.fontFace || 'rmmz-mainfont';
            bitmap.fontSize = fontSize;
            bitmap.textColor = textSettings.textColor || '#ffffff';
            bitmap.outlineColor = textSettings.outlineColor || '#000000';
            bitmap.outlineWidth = Number(textSettings.outlineWidth || 4);

            if (this._iconId) {
                // Draw icon
                const iconBitmap = ImageManager.loadSystem('IconSet');
                const sx = (this._iconId % 16) * iconSize;
                const sy = Math.floor(this._iconId / 16) * iconSize;
                
                // Calculate positions for centering
                const textWidth = bitmap.measureTextWidth(this._text);
                const totalWidth = textWidth + (this._iconId ? iconSize + iconPadding : 0);
                const startX = (bitmap.width - totalWidth) / 2;
                
                // Draw icon
                bitmap.blt(
                    iconBitmap, 
                    sx, sy, 
                    iconSize, iconSize,
                    startX, 
                    (height - iconSize) / 2, 
                    iconSize, iconSize
                );
                
                // Draw text after icon
                bitmap.drawText(
                    this._text,
                    startX + iconSize + iconPadding,
                    0,
                    textWidth + iconPadding,
                    height,
                    'left'
                );
            } else {
                // Draw only text centered
                bitmap.drawText(this._text, 0, 0, textWidth, height, 'center');
            }

            this.bitmap = bitmap;
        }

        update() {
            super.update();
            this.updateScaleAnimation();
            if (this._useAnimation) {
                this.updateIdleAnimation();
            }
        }

        updateScaleAnimation() {
            const targetScale = 1.0;
            const scaleSpeed = 0.1;

            if (this.visible) {
                if (this._currentScale < targetScale) {
                    this._currentScale = Math.min(this._currentScale + scaleSpeed, targetScale);
                    this.scale.set(this._currentScale, this._currentScale);
                }
            } else {
                this._currentScale = 0;
                this.scale.set(0, 0);
            }
        }

        updateIdleAnimation() {
            if (!this.visible) return;

            const idleScale = 1 + Math.sin(this._idlePhase) * this._idleAmplitude / 100;
            this._idlePhase += this._idleSpeed;

            this.scale.set(this._currentScale * idleScale, this._currentScale * idleScale);
        }
    }

    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        _Spriteset_Map_createLowerLayer.call(this);
        this.createIconContainer();
        this.createIconSprites();
        this.createTextSprites();
    };

    Spriteset_Map.prototype.createTextSprites = function() {
        $gameMap.events().forEach(event => {
            const eventData = event.event();
            const textConfig = parseTextNote(eventData.note);
            if (textConfig) {
                this.createTextSpriteForEvent(event, textConfig);
            }
        });
    };

    Spriteset_Map.prototype.createTextSpriteForEvent = function(event, textConfig) {
        const textSprite = new Sprite_EventText(textConfig);
        this._iconContainer.addChild(textSprite);
        event._textSprite = textSprite;
        event._textConfig = textConfig;
        textSprite.visible = false;
    };

    Spriteset_Map.prototype.createIconContainer = function () {
        this._iconContainer = new Sprite();
        this.addChild(this._iconContainer);
    };

    Spriteset_Map.prototype.createIconSprites = function () {
        $gameMap.events().forEach(event => {
            if (event._iconData) {
                this.createIconSpriteForEvent(event);
            }
        });
    };

    Spriteset_Map.prototype.createIconSpriteForEvent = function (event) {
        const iconSprite = new Sprite_Icon(event._iconData.iconId);
        this._iconContainer.addChild(iconSprite);
        event._iconSprite = iconSprite;
        iconSprite.visible = false;
    };

    Spriteset_Map.prototype.createIconsForEvents = function () {
        const events = $gameMap.events();
        events.forEach(event => {
            const iconStruct = this.getEventIconStruct(event);
            if (iconStruct) {
                this.initializeEventIcon(event, iconStruct.iconId);
            }
        });
    };

    Spriteset_Map.prototype.getEventIconStruct = function (event) {
        const eventId = event.eventId();
        if (eventIconCache.has(eventId)) {
            return eventIconCache.get(eventId);
        }

        const iconStruct = iconStructs.find(struct => event.event().meta[struct.notetag]);
        eventIconCache.set(eventId, iconStruct || null);
        return iconStruct;
    };

    Spriteset_Map.prototype.initializeEventIcon = function (event, iconId) {
        if (!event._iconSprite) {
            event._iconSprite = new Sprite_Icon(iconId);
            this._iconContainer.addChild(event._iconSprite);
        }
        event._iconSprite.visible = false;
    };

    class Sprite_Icon extends Sprite {
        constructor(iconIndex) {
            super();
            this._iconIndex = iconIndex;
            this.bitmap = ImageManager.loadSystem('IconSet');
            this.anchor.set(0.5, 1);
            this._currentScale = 0;
            this._idleAmplitude = 20;
            this._idleSpeed = 0.1;
            this._idlePhase = Math.random() * Math.PI * 2;
            this.scale.set(0, 0);
            this.updateIcon();
        }

        updateIcon() {
            const pw = 32;
            const ph = 32;
            const sx = this._iconIndex % 16 * pw;
            const sy = Math.floor(this._iconIndex / 16) * ph;
            this.setFrame(sx, sy, pw, ph);
        }

        update() {
            super.update();
            this.updateScaleAnimation();
            this.updateIdleAnimation();
        }

        updateScaleAnimation() {
            const targetScale = 1.0;
            const scaleSpeed = 0.1;

            if (this.visible) {
                if (this._currentScale < targetScale) {
                    this._currentScale = Math.min(this._currentScale + scaleSpeed, targetScale);
                    this.scale.set(this._currentScale, this._currentScale);
                }
            } else {
                this._currentScale = 0;
                this.scale.set(0, 0);
            }
        }

        updateIdleAnimation() {
            if (!this.visible) return;

            const idleScale = 1 + Math.sin(this._idlePhase) * this._idleAmplitude / 100;
            this._idlePhase += this._idleSpeed;

            this.scale.set(this._currentScale * idleScale, this._currentScale * idleScale);
        }

        set iconIndex(value) {
            if (this._iconIndex !== value) {
                this._iconIndex = value;
                this.updateIcon();
            }
        }

        get iconIndex() {
            return this._iconIndex;
        }
    }

    Spriteset_Map.prototype.pageHasValidCommands = function (page) {
        if (!page || !page.list || page.list.length === 0) return false;

        // Ignore first "Empty" command (code 0) and last "End" command (code 0)
        const commands = page.list.slice(1, -1);

        // Check if there are any commands that are not comments
        return commands.some(command => {
            // 108: Comment, 408: Comment continuation, 0: Empty
            return command.code !== 108 && command.code !== 408 && command.code !== 0;
        });
    };

    Spriteset_Map.prototype.isEventInScreen = function (event) {
        const margin = 5; // tiles
        const left = $gameMap.displayX() - margin;
        const top = $gameMap.displayY() - margin;
        const right = left + Graphics.width / $gameMap.tileWidth() + margin * 2;
        const bottom = top + Graphics.height / $gameMap.tileHeight() + margin * 2;

        return event.x >= left && event.x <= right && event.y >= top && event.y <= bottom;
    };

    Spriteset_Map.prototype.updateIcons = function () {
        if (frameCount % updateFrequency !== 0) {
            frameCount++;
            return;
        }
        frameCount = 0;

        const player = $gamePlayer;
        const events = $gameMap.events();
        const isEventRunning = $gameMap.isEventRunning();

        // Clear icons for non-existent events (good for events spawned dynamically)
        this._iconContainer.children.forEach(sprite => {
            if (sprite instanceof Sprite_Icon && !events.some(event => event._iconSprite === sprite)) {
                this._iconContainer.removeChild(sprite);
            }
        });

        const visibleEvents = events.filter(event =>
            this.isEventInScreen(event) &&
            this.isValidIconEvent(event) &&
            !isEventRunning
        );

        if (onlyShowNearest) {
            let nearestEvent = null;
            let nearestDistance = Infinity;

            for (const event of visibleEvents) {
                const iconStruct = this.getEventIconStruct(event);
                if (!iconStruct) continue;

                // Parse the range from iconStruct
                let range;
                if (typeof iconStruct.range === 'string' && iconStruct.range.toLowerCase().startsWith('region ')) {
                    const regionId = parseInt(iconStruct.range.split(' ')[1]);
                    range = { type: 'region', value: regionId };
                } else {
                    range = { type: 'distance', value: parseInt(iconStruct.range) || 5 };
                }

                if (this.isInRange(event, range)) {
                    const distance = this.getDistanceToPlayer(event, $gamePlayer);
                    if (distance < nearestDistance) {
                        nearestEvent = event;
                        nearestDistance = distance;
                    }
                }
            }

            events.forEach(event => {
                if (event === nearestEvent) {
                    const iconStruct = this.getEventIconStruct(event);
                    this.showIcon(event, iconStruct.iconId);
                } else {
                    this.hideIcon(event);
                }
            });
        } else {
            events.forEach(event => {
                if (visibleEvents.includes(event)) {
                    const iconStruct = this.getEventIconStruct(event);
                    if (iconStruct) {
                        // Parse the range
                        let range;
                        if (typeof iconStruct.range === 'string' && iconStruct.range.toLowerCase().startsWith('region ')) {
                            const regionId = parseInt(iconStruct.range.split(' ')[1]);
                            range = { type: 'region', value: regionId };
                        } else {
                            range = { type: 'distance', value: parseInt(iconStruct.range) || 5 };
                        }

                        if (this.isInRange(event, range)) {
                            this.showIcon(event, iconStruct.iconId);
                        } else {
                            this.hideIcon(event);
                        }
                    } else {
                        this.hideIcon(event);
                    }
                } else {
                    this.hideIcon(event);
                }
            });
        }

        this.updateEventTexts();
    };

    Spriteset_Map.prototype.updateEventTexts = function() {
        if (frameCount % updateFrequency !== 0) return;
    
        const events = $gameMap.events();
        const isEventRunning = $gameMap.isEventRunning();
    
        events.forEach(event => {
            // Check if the current page has valid commands
            if (!this.pageHasValidCommands(event.page())) {
                this.hideText(event);
                return;
            }
    
            const eventData = event.event();
            const textConfig = event._textConfig || parseTextNote(eventData.note);
            
            if (textConfig && this.isEventInScreen(event) && !isEventRunning) {
                if (this.isInRange(event, textConfig.range)) {
                    this.showText(event);
                } else {
                    this.hideText(event);
                }
            } else if (event._textSprite) {
                this.hideText(event);
            }
        });
    };
    

    Spriteset_Map.prototype.showText = function(event) {
        if (!this.pageHasValidCommands(event.page())) {
            this.hideText(event);
            return;
        }
    
        const textConfig = event._textConfig;
        if (!event._textSprite) {
            event._textSprite = new Sprite_EventText(textConfig);
            this._iconContainer.addChild(event._textSprite);
        }
        event._textSprite.visible = true;
        this.updateTextPosition(event);
    };

    Spriteset_Map.prototype.hideText = function(event) {
        if (event._textSprite) {
            event._textSprite.visible = false;
        }
    };

    Spriteset_Map.prototype.updateTextPosition = function(event) {
        if (!event._textSprite || !event._textSprite.parent) return;
        
        let yOffset = 0;
        const eventData = event.event();
        
        if (eventData?.meta?.textY) {
            yOffset = parseInt(eventData.meta.textY || 0);
        }
        
        event._textSprite.x = event.screenX();
        event._textSprite.y = event.screenY() - event.getSpriteHeight() + yOffset;
    };

    Spriteset_Map.prototype.isValidIconEvent = function (event) {
        const page = event.page();
        return page && this.pageHasValidCommands(page);
    };

    Spriteset_Map.prototype.pageHasValidCommands = function (page) {
        if (!page || !page.list || page.list.length === 0) return false;

        // Ignore first "Empty" command (code 0) and last "End" command (code 0)
        const commands = page.list.slice(1, -1);

        // Check if there are any commands that are not comments
        return commands.some(command => {
            // 108: Comment, 408: Comment continuation, 0: Empty
            return command.code !== 108 && command.code !== 408 && command.code !== 0;
        });
    };


    Spriteset_Map.prototype.getDistanceToPlayer = function (event, player) {
        const dx = Math.abs(event.x - player.x);
        const dy = Math.abs(event.y - player.y);
        return dx + dy;
    };

    Spriteset_Map.prototype.isPlayerFacingEvent = function (player, event) {
        switch (player.direction()) {
            case 2:
                return player.x === event.x && player.y < event.y;
            case 4:
                return player.y === event.y && player.x > event.x;
            case 6:
                return player.y === event.y && player.x < event.x;
            case 8:
                return player.x === event.x && player.y > event.y;
            default:
                return false;
        }
    };

    Spriteset_Map.prototype.showIcon = function (event, iconId) {
        if (!event._iconSprite) {
            event._iconSprite = new Sprite_Icon(iconId);
            this._iconContainer.addChild(event._iconSprite);
        } else {
            event._iconSprite.visible = true;
            event._iconSprite.iconIndex = iconId;
        }
        this.updateIconPosition(event);
    };

    Spriteset_Map.prototype.hideIcon = function (event) {
        if (event._iconSprite && event._iconSprite.visible) {
            const scaleSpeed = 0.1;
            const sprite = event._iconSprite;
            const scaleDownAnimation = () => {
                if (sprite && sprite.transform && sprite.transform.scale) {
                    if (sprite.transform.scale.x > 0 || sprite.transform.scale.y > 0) {
                        sprite.transform.scale.x -= scaleSpeed;
                        sprite.transform.scale.y -= scaleSpeed;
                        sprite.transform.scale.x = Math.max(sprite.transform.scale.x, 0);
                        sprite.transform.scale.y = Math.max(sprite.transform.scale.y, 0);
                        
                        if (event && $gameMap) {
                            try {
                                this.updateIconPosition(event);
                            } catch (e) {
                                sprite.visible = false;
                            }
                        }
    
                        requestAnimationFrame(scaleDownAnimation);
                    } else {
                        sprite.visible = false;
                    }
                } else {
                    sprite.visible = false;
                }
            };
    
            scaleDownAnimation();
        }
    };

    Spriteset_Map.prototype.updateIconPosition = function (event) {
        if (!event._iconSprite || !event._iconSprite.parent) return;
        
        let iconYOffset = 0;
        const eventData = event.event();
        const iconStruct = this.getEventIconStruct(event);
        
        // First check for event-specific <iconY: x> meta tag
        if (eventData?.meta?.iconY) {
            iconYOffset = parseInt(eventData.meta.iconY || 0);
        } 
        // If no event-specific offset, use the struct's heightOffset
        else if (iconStruct && iconStruct.heightOffset) {
            iconYOffset = parseInt(iconStruct.heightOffset || 0);
        }
        
        event._iconSprite.x = event.screenX();
        event._iconSprite.y = event.screenY() - event.getSpriteHeight() + iconYOffset;
    };

    Game_Event.prototype.getSpriteHeight = function() {
        const characterName = this.characterName();
        
        // If event uses tileset or has no sprite, make it 48
        if (!characterName) {
            return 48;
        }
        
        if (eventHeightCache.has(characterName)) {
            return eventHeightCache.get(characterName);
        }
    
        const bitmap = ImageManager.loadCharacter(characterName);
        const defaultHeight = ImageManager.isBigCharacter(characterName) ? 64 : 48;
        
        // Set default height initially
        eventHeightCache.set(characterName, defaultHeight);
    
        // Calculate actual height once bitmap is loaded
        bitmap.addLoadListener(() => {
            const big = ImageManager.isBigCharacter(characterName);
            const charWidth = big ? bitmap.width / 3 : bitmap.width / 12;
            const charHeight = big ? bitmap.height / 4 : bitmap.height / 8;
            
            // Create a temporary canvas to analyze the sprite
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = charWidth;
            canvas.height = charHeight;
            
            // Draw the character
            const sx = (this.characterIndex() % 4 * 3) * charWidth;
            const sy = Math.floor(this.characterIndex() / 4) * 4 * charHeight;
            ctx.drawImage(bitmap._canvas || bitmap._image, 
                sx, sy, charWidth, charHeight,
                0, 0, charWidth, charHeight);
            
            // Get image data to analyze pixels
            const imageData = ctx.getImageData(0, 0, charWidth, charHeight);
            const data = imageData.data;
            
            // Find the highest non-transparent pixel
            let topPixel = charHeight;
            for (let y = 0; y < charHeight; y++) {
                for (let x = 0; x < charWidth; x++) {
                    const alpha = data[(y * charWidth + x) * 4 + 3];
                    if (alpha > 0) {
                        topPixel = y;
                        y = charHeight;
                        break;
                    }
                }
            }
            
            // Find the lowest non-transparent pixel
            let bottomPixel = 0;
            for (let y = charHeight - 1; y >= 0; y--) {
                for (let x = 0; x < charWidth; x++) {
                    const alpha = data[(y * charWidth + x) * 4 + 3];
                    if (alpha > 0) {
                        bottomPixel = y + 1;
                        y = -1;
                        break;
                    }
                }
            }
            
            // Calculate actual height and cache it
            const actualHeight = bottomPixel - topPixel;
            eventHeightCache.set(characterName, actualHeight > 0 ? actualHeight : defaultHeight);
        });
    
        return eventHeightCache.get(characterName);
    };

    Game_Map.prototype.clearEventHeightCache = function () {
        eventHeightCache.clear();
    };

    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function (mapId) {
        _Game_Map_setup.call(this, mapId);
        eventHeightCache.clear();
        eventIconCache.clear();
        this.createIconsForEvents();
    };

    Game_Map.prototype.createIconsForEvents = function () {
        this.events().forEach(event => {
            const iconStruct = this.getEventIconStruct(event);
            if (iconStruct) {
                event._iconData = { iconId: iconStruct.iconId, range: iconStruct.range };
            }
        });
    };

    Game_Map.prototype.getEventIconStruct = function (event) {
        const eventId = event.eventId();
        if (eventIconCache.has(eventId)) {
            return eventIconCache.get(eventId);
        }
    
        const iconStruct = iconStructs.find(struct => {
            const notetag = struct.notetag.replace(/[<>]/g, '');
            const eventNotetags = Object.keys(event.event().meta);
            return eventNotetags.some(tag => tag === notetag);
        });
        
        eventIconCache.set(eventId, iconStruct || null);
        return iconStruct;
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        _Spriteset_Map_update.call(this);
        this.updateIcons();
    };

    const _Scene_Map_create = Scene_Map.prototype.create;
    Scene_Map.prototype.create = function () {
        _Scene_Map_create.call(this);
        if (this._spriteset) {
            this._spriteset.createIconsForEvents();
        }
    };

    const _Game_Event_initialize = Game_Event.prototype.initialize;
    Game_Event.prototype.initialize = function (mapId, eventId) {
        _Game_Event_initialize.call(this, mapId, eventId);
        Object.defineProperty(this, '_iconSprite', {
            value: null,
            writable: true,
            enumerable: false,
            configurable: true
        });
    };
})();