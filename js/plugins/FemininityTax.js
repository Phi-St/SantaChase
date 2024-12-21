Scene_Shop.prototype.buyingPrice = function() {
    return (this._buyWindow.price(this._item) / $gameVariables.value(131)) * 100;
};

Scene_Shop.prototype.sellingPrice = function() {
    return Math.floor((this._item.price * $gameVariables.value(131)) / 100);
};