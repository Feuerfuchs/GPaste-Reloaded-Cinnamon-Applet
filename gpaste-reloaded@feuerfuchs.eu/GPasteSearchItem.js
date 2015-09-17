const Lang      = imports.lang;
const St        = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Gettext   = imports.gettext;

const _         = Gettext.domain('GPaste').gettext;

// ------------------------------------------------------------------------------------------------------

function GPasteSearchItem() {
    this._init();
}

GPasteSearchItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function() {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {
            activate: false,
            reactive: true,
            hover:    true
        });

        //
        // Text field

        this.entry = new St.Entry({
            name:        'GPasteSearchEntry',
            track_hover: true,
            can_focus:   true
        });

        //
        // Search icon (left)

        this.entry.set_primary_icon(new St.Icon({
            icon_name: 'edit-find-symbolic'
        }));

        //
        // Clear icon (right)

        this.iconClear = new St.Icon({
            style_class: 'menu-search-entry-icon',
            icon_name:   'edit-clear-symbolic'
        });

        this.entry.clutter_text.connect('text-changed', Lang.bind(this, this.onTextChanged));
        this.addActor(this.entry, { expand: true, span: -1 });
        
        // Binding ID of the remove icon
        this.iconClickedID = 0;
    },

    /*
     * Reset search field
     */
    reset: function() {
        this.entry.set_text("");
    },

    //
    // Events
    // ---------------------------------------------------------------------------------

    /*
     * Search string has changed
     */
    onTextChanged: function(se, prop) {
        let emptyText = (this.entry.get_text() == '');
        this.entry.set_secondary_icon((emptyText) ? null : this.iconClear);
        if (!emptyText && this.iconClickedID == 0) {
            this.iconClickedID = this.entry.connect('secondary-icon-clicked', Lang.bind(this, this.reset));
        }
        this.emit('text-changed');
        global.logError(this.entry.get_text());

    },

    /*
     * The serahc field was selected via keyboard
     */
    _onKeyFocusIn: function (actor) {
        global.stage.set_key_focus(this.entry);
    },

    /*
     * The search  field was selected via mouse hover
     */
    _onHoverChanged: function (actor) {
        global.stage.set_key_focus(this.entry);
    }
};
