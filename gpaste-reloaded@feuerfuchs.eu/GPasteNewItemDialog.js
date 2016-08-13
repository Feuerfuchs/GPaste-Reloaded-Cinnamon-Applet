const Lang        = imports.lang;
const ModalDialog = imports.ui.modalDialog;
const St          = imports.gi.St;

const _           = imports.applet._;

// ------------------------------------------------------------------------------------------------------

function GPasteNewItemDialog(callback) {
    this._init(callback);
}

GPasteNewItemDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(callback) {
        ModalDialog.ModalDialog.prototype._init.call(this);

        this.callback = callback;
        this.entry = new St.Entry({
            name:        'GPasteNewItemEntry',
            track_hover: true,
            can_focus:   true
        });

        this.entry.clutter_text.connect('activate', Lang.bind(this, this.onOK));

        let contentBox = new St.BoxLayout({ vertical: true, style: 'spacing: 16px;' });
        this.contentLayout.add(contentBox);

        contentBox.add(new St.Label({ text: _("Just enter whatever you want to add to the current history:") }));
        contentBox.add(this.entry);

        this.setButtons([
            {
                label: _("OK"),
                action: Lang.bind(this, this.onOK)
            },
            {
                label: _("Cancel"),
                action: Lang.bind(this, function() {
                    this.close(global.get_current_time());
                })
            }
        ]);
    },

    onOK: function() {
        this.close(global.get_current_time());
        this.callback(this.entry.get_text());

        this.entry.set_text("");
    },

    open: function(timestamp) {
        ModalDialog.ModalDialog.prototype.open.call(this, timestamp);

        global.stage.set_key_focus(this.entry);
    }
};
