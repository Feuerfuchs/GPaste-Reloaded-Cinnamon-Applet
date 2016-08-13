const Main      = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

// ------------------------------------------------------------------------------------------------------

function GPasteMenu(launcher, orientation) {
    this._init(launcher, orientation);
}

GPasteMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,

    _init: function(launcher, orientation) {
        PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);

        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
    }
};
