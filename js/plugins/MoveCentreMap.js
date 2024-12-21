/*:
 * @target MZ
 * @plugindesc Change the camera rest position.
 * @author Caethyril
 * @url https://forums.rpgmakerweb.com/threads/168111/
 * @help Free to use and/or modify for any project, no credit required.
 */
;void (alias => {
  Game_Player.prototype.centerX = function() {
    return alias.apply(this, arguments) - 3;  // move center left by 3 tiles
  };
})(Game_Player.prototype.centerX);