const Lang      = imports.lang;
const St        = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Gettext   = imports.gettext;

const _         = Gettext.gettext;

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
            hint_text:   _("Type to search..."),
            track_hover: true,
            can_focus:   true
        });
        this.addActor(this.entry, {
            expand: true,
            span:   -1
        });

        //
        // Search icon (left)

        this.iconSearch = new St.Icon({
            icon_name: 'edit-find-symbolic'
        });
        this.entry.set_secondary_icon(this.iconSearch);

        //
        // Clear icon (right)

        this.iconClear = new St.Icon({
            style_class: 'menu-search-entry-icon',
            icon_name:   'edit-clear-symbolic'
        });

        //
        // 

        this.entry.clutter_text.connect('text-changed', Lang.bind(this, this.onTextChanged));
        
        //
        // Binding ID of the remove icon

        this.iconClearClickedID = 0;
    },

    /*
     * Reset search field
     */
    reset: function() {
        this.entry.set_text("");
    },

    /*
     * Append string to current search string
     */
    appendText: function(text) {
        this.entry.set_text(this.entry.get_text() + text);
    },

    //
    // Events
    // ---------------------------------------------------------------------------------

    /*
     * Search string has changed
     */
    onTextChanged: function(se, prop) {
        let emptyText = (this.entry.get_text() == '');
        if (!emptyText) {
            if (this.iconClearClickedID == 0) {
                this.entry.set_secondary_icon(this.iconClear);
                this.iconClearClickedID = this.entry.connect('secondary-icon-clicked', Lang.bind(this, this.reset));
            }
        }
        else {
            if (this.iconClearClickedID != 0) {
                this.entry.set_secondary_icon(this.iconSearch);
                this.entry.disconnect(this.iconClearClickedID);
                this.iconClearClickedID = 0;
            }
        }
        this.emit('text-changed');
    },

    /*
     * The search field was selected via keyboard
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
