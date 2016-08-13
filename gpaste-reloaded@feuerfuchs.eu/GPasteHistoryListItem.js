const PopupMenu = imports.ui.popupMenu;

// ------------------------------------------------------------------------------------------------------

function GPasteHistoryListItem(text, index) {
    this._init(text, index);
}

GPasteHistoryListItem.prototype = {
    __proto__: PopupMenu.PopupMenuItem.prototype,

    _init: function(applet, name, params) {
        PopupMenu.PopupMenuItem.prototype._init.call(this, name, params);

        this.applet   = applet;
        this.histName = name;
    },

    /*
     * Select history item
     */
    activate: function(event) {
        this.applet.selectHistory(this.histName);
        this.applet._applet_context_menu.close(true);
    },
};
