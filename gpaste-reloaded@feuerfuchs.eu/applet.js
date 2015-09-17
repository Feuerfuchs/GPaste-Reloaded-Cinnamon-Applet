const Lang              = imports.lang;
const St                = imports.gi.St;
const PopupMenu         = imports.ui.popupMenu;
const Gettext           = imports.gettext;
const Applet            = imports.ui.applet;

const GPaste            = imports.gi.GPaste;

const _                 = Gettext.domain('GPaste').gettext;

const AppletDir         = imports.ui.appletManager.applets['gpaste-reloaded@feuerfuchs.eu'];
const GPasteMenu        = AppletDir.GPasteMenu;
const GPasteSearchItem  = AppletDir.GPasteSearchItem;
const GPasteHistoryItem = AppletDir.GPasteHistoryItem;

// ------------------------------------------------------------------------------------------------------

function GPasteApplet(orientation) {
    this._init(orientation);
}

GPasteApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {
        Applet.IconApplet.prototype._init.call(this, orientation);

        //
        // Applet icon
        
        this.set_applet_icon_symbolic_name("edit-paste");
        this.set_applet_tooltip(_("GPaste clipboard"));

        //
        // Prepare Menu

        this.menuManager         = new PopupMenu.PopupMenuManager(this);
        this.menu                = new GPasteMenu.GPasteMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        
        this.mitemTrack          = new PopupMenu.PopupSwitchMenuItem(_("Track clipboard changes"), true);
        this.mitemTrack.connect('toggled', Lang.bind(this, this.toggleDaemon));

        this.mitemSearch         = new GPasteSearchItem.GPasteSearchItem();
        this.mitemSearch.connect('text-changed', Lang.bind(this, this.onSearch));

        this.mitemHistoryIsEmpty = new PopupMenu.PopupMenuItem(_("(Empty)"));
        this.mitemHistoryIsEmpty.setSensitive(false);

        this.mitemUI             = new PopupMenu.PopupMenuItem(_("GPaste User Interface"));
        this.mitemUI.connect('activate', Lang.bind(this, this.openUI));

        this.mitemSettings       = new PopupMenu.PopupMenuItem(_("GPaste Settings"));
        this.mitemSettings.connect('activate', Lang.bind(this, this.openSettings));

        this.mitemEmptyHistory   = new PopupMenu.PopupMenuItem(_("Empty history"));
        this.mitemEmptyHistory.connect('activate', Lang.bind(this, this.empty));

        //
        // Create GPaste Client

        this.settings            = new GPaste.Settings();
        this.searchResults       = [];
        this.history             = [];

        GPaste.Client.new(Lang.bind(this, function (obj, result) {
            this.client                   = GPaste.Client.new_finish(result);

            this.clientUpdateID           = this.client.connect('update',       Lang.bind(this, this.onClientUpdate));
            this.clientShowID             = this.client.connect('show-history', Lang.bind(this, this.onClientShowHistory));
            this.clientTrackingID         = this.client.connect('tracking',     Lang.bind(this, this.onClientTracking));

            this.settingsMaxSizeChangedID = this.settings.connect('changed::max-displayed-history-size', Lang.bind(this, this.createHistory));

            this.actor.connect('destroy', Lang.bind(this, this.onDestroy));

            this.createHistory();
            this.populateMenu();
        }));

        //
        // Events

        this.menu.connect('open-state-changed', Lang.bind(this, function(menu, open) {
            if (open) {
                global.stage.set_key_focus(this.mitemSearch.entry);
            } else {
                this.mitemSearch.reset();
            }
        }));
    },

    /*
     * Generate the required number of history items (or delete excessive ones)
     */
    createHistory: function() {
        let oldSize = this.history.length;
        let newSize = this.settings.get_max_displayed_history_size();

        if (newSize > oldSize) {
            for (let index = oldSize; index < newSize; ++index) {
                this.history[index] = new GPasteHistoryItem.GPasteHistoryItem(this.client, this.settings);
            }
        } else {
            for (let i = newSize; i < oldSize; ++i) {
                this.history.pop().destroy();
            }
        }

        if (this.mitemSearch.entry.text.length == 0) {
            this.history[0].actor.set_style("font-weight: bold;");
        }

        this.refresh(oldSize);
    },

    /*
     * Add all necessary menu items to the menu
     */
    populateMenu: function() {
        this.menu.addMenuItem(this.mitemTrack);
        this.menu.addMenuItem(this.mitemSearch);

        for (let i = 0; i < this.history.length; ++i) {
            this.menu.addMenuItem(this.history[i]);
        }

        this.menu.addMenuItem(this.mitemHistoryIsEmpty);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this.mitemUI);
        this.menu.addMenuItem(this.mitemSettings);
        this.menu.addMenuItem(this.mitemEmptyHistory);
    },

    /*
     * Refresh the history items
     */
    refresh: function(resetTextFrom) {
        if (this.searchResults.length > 0) { // Search field isn't empty
            this.onSearch();
        } else {
            this.client.get_history_size(Lang.bind(this, function(client, result) {
                let size    = client.get_history_size_finish(result);
                let maxSize = this.history.length;

                if (size > maxSize) {
                    size = maxSize;
                }

                for (let i = resetTextFrom; i < size; ++i) {
                    this.history[i].setIndex(i);
                }
                for (let i = size; i < maxSize; ++i) {
                    this.history[i].setIndex(-1);
                }

                if (size == 0) { // There aren't any history items, display "(empty)"
                    this.mitemHistoryIsEmpty.actor.show();
                }
                else {    
                    this.mitemHistoryIsEmpty.actor.hide();
                }
            }));
        }
    },

    /*
     * Toggle GPaste's tracking status
     */
    toggleDaemon: function() {
        this.client.track(this.mitemTrack.state, null);
    },

    /*
     * Empty the history
     */
    empty: function() {
        this.client.empty(null);
    },

    /*
     * Open GPaste's own GUI
     */
    openUI: function() {
        GPaste.util_spawn('Ui');
    },

    /*
     * Open GPaste's settings
     */
    openSettings: function() {
        GPaste.util_spawn('Settings');
    },

    //
    // Events
    // ---------------------------------------------------------------------------------

    /*
     * The history has changed
     */
    onClientUpdate: function(client, action, target, position) {
        switch (target) {
            case GPaste.UpdateTarget.ALL:
                this.refresh(0);
                break;

            case GPaste.UpdateTarget.POSITION:
                switch (action) {
                    case GPaste.UpdateAction.REPLACE:
                        this.history[position].refresh();
                        break;
                    case GPaste.UpdateAction.REMOVE:
                        this.refresh(position);
                        break;
                }
                break;
        }
    },

    /*
     * Show menu
     */
    onClientShowHistory: function() {
        this.menu.open();
    },

    /*
     * GPaste's tracking status has changed
     */
    onClientTracking: function(c, state) {
        this.mitemTrack.setToggleState(state);
    },

    /*
     * User entered search input
     */
    onSearch: function() {
        let searchStr = this.mitemSearch.entry.text.toLowerCase();

        if (searchStr.length > 0) {
            this.client.search(searchStr, Lang.bind(this, function(client, result) {
                this.searchResults = client.search_finish(result);
                let results = this.searchResults.length;
                let maxSize = this.history.length;

                if (results > maxSize)
                    results = maxSize;

                for (let i = 0; i < results; ++i) {
                    this.history[i].setIndex(this.searchResults[i]);
                }
                for (let i = results; i < maxSize; ++i) {
                    this.history[i].setIndex(-1);
                }

                this.history[0].actor.set_style(null);
            }));
        } else {
            this.searchResults = [];
            this.refresh(0);
            this.history[0].actor.set_style("font-weight: bold;");
        }
    },

    /*
     * Applet has been removed, disconnect bindings
     */
    onDestroy: function() {
        this.client.disconnect(this.clientUpdateID);
        this.client.disconnect(this.clientShowID);
        this.client.disconnect(this.clientTrackingID);
        this.settings.disconnect(this.settingsMaxSizeChangedID);
    },

    /*
     * Display menu
     */
    on_applet_clicked: function(event) {
        this.menu.toggle();       
    }
};

// ------------------------------------------------------------------------------------------------------

/*
 * Entry point
 */
function main(metadata, orientation) {  
    let applet = new GPasteApplet(orientation);
    return applet;      
};
