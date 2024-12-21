Game_Character.prototype.jumpBack = function()
{
    let dir = this.reverseDir(this.direction());
    if (!this.canPass(this.x, this.y, dir))
        return;
    let x = 0, y = 0;
    switch (dir)
    {
        case 2:
            y++;
            break;
        case 4:
            x--;
            break;
        case 8:
            y--;
            break;
        case 6:
            x++;
            break;
    }
    this.jump(x, y);
};