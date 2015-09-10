const Lang      = imports.lang;
const St        = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Pango     = imports.gi.Pango;

const GPaste    = imports.gi.GPaste;

// ------------------------------------------------------------------------------------------------------

function GPasteHistoryItem(text, index) {
    this._init(text, index);
}

GPasteHistoryItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(client, settings) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

        this.client   = client;
        this.settings = settings;

        //
        // Label

        this.label                        = new St.Label({ text: '' });
        this.label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this.addActor(this.label);

        this.setTextLength();
        this.settingsChangedID = settings.connect('changed::element-size', Lang.bind(this, this.setTextLength));

        //
        // Delete button

        let iconDelete = new St.Icon({
            icon_name:   'edit-delete',
            icon_type:   St.IconType.SYMBOLIC,
            style_class: 'popup-menu-icon'
        });
        this.deleteButton = new St.Button({ child: iconDelete });
        this.deleteButton.connect('clicked', Lang.bind(this, this.remove));
        this.addActor(this.deleteButton, { expand: false, span: -1, align: St.Align.END });

        //
        //

        this.actor.connect('destroy', Lang.bind(this, this.onDestroy));
    },

    /*
     * Set max text length using GPaste's setting
     */
    setTextLength: function() {
        this.label.clutter_text.max_length = this.settings.get_element_size();
    },

    /*
     * Set specified index and get respective history item's content
     */
    setIndex: function(index) {
        this.index = index;

        if (index != -1) {
            this.client.get_element(index, Lang.bind(this, function(client, result) {
                this.label.set_text(client.get_element_finish(result).replace(/[\t\n\r]/g, ''));
            }));

            this.actor.show();
        }
        else {
            this.actor.hide();
        }
    },

    /*
     * Remove history item
     */
    remove: function() {
        this.client.delete(this.index, null);
    },

    /*
     * Select history item
     */
    activate: function(event) {
        this.client.select(this.index, null);
    },

    //
    // Events
    // ---------------------------------------------------------------------------------

    /*
     * History item has been removed, disconnect bindings
     */
    onDestroy: function() {
        this.settings.disconnect(this.settingsChangedID);
    }
};
