// TODO:
// Somehow detect if a new history has been added (there seems to be no suitable DBus signal)

const uuid                  = imports.applet.uuid;

const Util                  = imports.misc.util;
const Lang                  = imports.lang;
const St                    = imports.gi.St;
const PopupMenu             = imports.ui.popupMenu;
const Applet                = imports.ui.applet;
const Settings              = imports.ui.settings;
const ModalDialog           = imports.ui.modalDialog;

const GPaste                = imports.gi.GPaste;

const AppletDir             = imports.ui.appletManager.applets[uuid];
const GPasteMenu            = AppletDir.GPasteMenu;
const GPasteSearchItem      = AppletDir.GPasteSearchItem;
const GPasteHistoryItem     = AppletDir.GPasteHistoryItem;
const GPasteHistoryListItem = AppletDir.GPasteHistoryListItem;
const GPasteNewItemDialog   = AppletDir.GPasteNewItemDialog;

const _                     = imports.applet._;

// ------------------------------------------------------------------------------------------------------

function GPasteApplet(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

GPasteApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation);

        try {
            //
            // Applet icon

            this.set_applet_icon_symbolic_name("edit-paste");
            this.set_applet_tooltip(_("GPaste clipboard"));

            //
            // Applet menu

            this.cmitemUI            = new PopupMenu.PopupMenuItem(_("GPaste Main Program"));
            this.cmitemUI.connect('activate', Lang.bind(this, this.openUI));

            this.cmitemSelectHistory = new PopupMenu.PopupSubMenuMenuItem(_("Select History"));

            //
            // Prepare Menu

            this.menuManager         = new PopupMenu.PopupMenuManager(this);
            this.menu                = new GPasteMenu.GPasteMenu(this, orientation);
            this.menuManager.addMenu(this.menu);

            this.mitemTrack          = new PopupMenu.PopupSwitchMenuItem(_("Track clipboard changes"), true);
            this.mitemTrack.connect('toggled', Lang.bind(this, this.toggleDaemon));

            this.mitemSearch         = new GPasteSearchItem.GPasteSearchItem();
            this.mitemSearch.connect('text-changed', Lang.bind(this, this.onSearch));

            this.msepTop             = new PopupMenu.PopupSeparatorMenuItem();

            this.mitemHistoryIsEmpty = new PopupMenu.PopupMenuItem(_("(Empty)"));
            this.mitemHistoryIsEmpty.setSensitive(false);

            this.msepBottom          = new PopupMenu.PopupSeparatorMenuItem();

            this.mitemNewItem        = new PopupMenu.PopupIconMenuItem(_("New item"), "list-add", St.IconType.SYMBOLIC);
            this.mitemNewItem.connect('activate', Lang.bind(this, this.showNewItemDialog));

            this.mitemEmptyHistory   = new PopupMenu.PopupIconMenuItem(_("Empty history"), "edit-clear-all", St.IconType.SYMBOLIC);
            this.mitemEmptyHistory.connect('activate', Lang.bind(this, this.emptyHistory));

            this.msepBottom2         = new PopupMenu.PopupSeparatorMenuItem();

            this.mitemUI             = new PopupMenu.PopupIconMenuItem(_("GPaste Main Program"), "edit-paste", St.IconType.SYMBOLIC);
            this.mitemUI.connect('activate', Lang.bind(this, this.openUI));

            //
            // Dialogs

            this.dNewItem            = new GPasteNewItemDialog.GPasteNewItemDialog(Lang.bind(this, function(text) {
                this.client.add(text, Lang.bind(this, function(client, result) {
                    this.client.add_finish(result);
                }));
            }));

            //
            // Applet settings

            this.appletSettings = new Settings.AppletSettings(this, uuid, instance_id);

            this.appletSettings.bindProperty(Settings.BindingDirection.IN, "display-track-switch",  "displayTrackSwitch",  this.onDisplaySettingsUpdated, null);
            this.appletSettings.bindProperty(Settings.BindingDirection.IN, "display-new-item",      "displayNewItem",      this.onDisplaySettingsUpdated, null);
            this.appletSettings.bindProperty(Settings.BindingDirection.IN, "display-searchbar",     "displaySearchBar",    this.onDisplaySettingsUpdated, null);
            this.appletSettings.bindProperty(Settings.BindingDirection.IN, "display-gpaste-ui",     "displayGPasteUI",     this.onDisplaySettingsUpdated, null);
            this.appletSettings.bindProperty(Settings.BindingDirection.IN, "display-empty-history", "displayEmptyHistory", this.onDisplaySettingsUpdated, null);

            //
            // Create GPaste Client

            this.settings         = new GPaste.Settings();
            this.searchResults    = [];
            this.historyName      = "";
            this.historyItems     = [];
            this.historyListItems = [];

            GPaste.Client.new(Lang.bind(this, function (obj, result) {
                this.client                   = GPaste.Client.new_finish(result);

                this.clientUpdateID           = this.client.connect('update',         Lang.bind(this, this.onClientUpdate));
                this.clientShowID             = this.client.connect('show-history',   Lang.bind(this, this.onClientShowHistory));
                this.clientSwitchHistoryID    = this.client.connect('switch-history', Lang.bind(this, this.onClientSwitchHistory));
                this.clientTrackingID         = this.client.connect('tracking',       Lang.bind(this, this.onClientTracking));
                this.clientDeleteHistoryID    = this.client.connect('delete-history', Lang.bind(this, function() { this.client.list_histories(Lang.bind(this, this.onClientHistoriesListed)); }));

                this.settingsMaxSizeChangedID = this.settings.connect('changed::max-displayed-history-size', Lang.bind(this, this.createHistoryItems));

                this.actor.connect('destroy', Lang.bind(this, this.onDestroy));

                //
                // Applet menu

                let i = -1;
                if (this.compareVersion("3.18") != -1) {
                    this._applet_context_menu.addMenuItem(this.cmitemUI, ++i);
                }

                this._applet_context_menu.addMenuItem(this.cmitemSelectHistory, ++i);
                this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(), ++i);

                this.client.get_history_name(Lang.bind(this, function(client, result) {
                    this.historyName = this.client.get_history_name_finish(result);
                }));
                this.client.list_histories(Lang.bind(this, this.onClientHistoriesListed));

                this.mitemTrack.setToggleState(this.client.is_active());

                //
                //

                this.createHistoryItems();
                this.populateMenu();
            }));

            //
            // Events

            this.menu.connect('open-state-changed', Lang.bind(this, function(menu, open) {
                if (open) {
                    if (this.displaySearchBar) {
                        global.stage.set_key_focus(this.mitemSearch.entry);
                    }
                } else {
                    this.mitemSearch.reset();
                }
            }));
        }
        catch (e) {
            global.logError(e);
        }
    },

    /*
     * Compares the current GPaste version with the given version string (only first 2 digits).
     * -1 = older, 0 = same, 1 = newer
     */
    compareVersion: function(version) {
        version        = version.split(".");
        let curVersion = this.client.get_version().split(".");
        let maxLen     = Math.min(curVersion.length, version.length);

        for (var i = 0; i < maxLen; i++) {
            let cv = parseInt(curVersion[i], 10);
            let v  = parseInt(version[i],    10);
            if (cv == v) {
                continue;
            }
            return ((cv < v) ? -1 : 1);
        }
        return 0;
    },

    /*
     * Applet settings were changed
     */
    onDisplaySettingsUpdated: function() {
        this.mitemSearch.reset();

        this.mitemTrack.actor.visible        = this.displayTrackSwitch;
        this.msepTop.actor.visible           = this.displayTrackSwitch;
        this.mitemSearch.actor.visible       = this.displaySearchBar;

        this.msepBottom.actor.visible        = this.displayNewItem || this.displayGPasteUI || this.displayEmptyHistory;
        this.mitemNewItem.actor.visible      = this.displayNewItem;
        this.mitemEmptyHistory.actor.visible = this.displayEmptyHistory;

        this.msepBottom2.actor.visible       = this.displayGPasteUI;
        this.mitemUI.actor.visible           = this.displayGPasteUI;
    },

    /*
     * Generate the required number of history items (or delete excessive ones)
     */
    createHistoryItems: function() {
        let oldSize = this.historyItems.length;
        let newSize = this.settings.get_max_displayed_history_size();

        if (newSize > oldSize) {
            for (let index = oldSize; index < newSize; ++index) {
                this.historyItems[index] = new GPasteHistoryItem.GPasteHistoryItem(this);
            }
        }
        else {
            for (let i = newSize; i < oldSize; ++i) {
                this.historyItems.pop().destroy();
            }
        }

        if (this.mitemSearch.entry.get_text() == '') {
            this.historyItems[0].actor.set_style("font-weight: bold;");
        }

        this.refresh(oldSize);
    },

    /*
     * Add all necessary menu items to the menu
     */
    populateMenu: function() {
        this.menu.addMenuItem(this.mitemTrack);
        this.menu.addMenuItem(this.mitemSearch);

        this.menu.addMenuItem(this.msepTop);

        for (let i = 0; i < this.historyItems.length; ++i) {
            this.menu.addMenuItem(this.historyItems[i]);
        }
        this.menu.addMenuItem(this.mitemHistoryIsEmpty);

        this.menu.addMenuItem(this.msepBottom);

        this.menu.addMenuItem(this.mitemNewItem);
        this.menu.addMenuItem(this.mitemEmptyHistory);

        if (this.compareVersion("3.18.2") != -1) {
            this.menu.addMenuItem(this.msepBottom2);
            this.menu.addMenuItem(this.mitemUI);
        }

        this.onDisplaySettingsUpdated();
    },

    /*
     * Refresh the history items
     */
    refresh: function(resetTextFrom) {
        if (this.searchResults.length > 0) { // Search field isn't empty
            this.onSearch();
        } else {
            this.client.get_history_size(this.historyName, Lang.bind(this, function(client, result) {
                let size    = client.get_history_size_finish(result);
                let maxSize = this.historyItems.length;

                if (size > maxSize) {
                    size = maxSize;
                }

                for (let i = resetTextFrom; i < size; ++i) {
                    this.historyItems[i].setIndex(i);
                }
                for (let i = size; i < maxSize; ++i) {
                    this.historyItems[i].setIndex(-1);
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
     * Select another history
     */
    selectHistory: function(name) {
        this.client.switch_history(name, Lang.bind(this, function(client, result) {
            this.client.switch_history_finish(result);
        }));
    },

    /*
     * Empty the history
     */
    emptyHistory: function() {
        new ModalDialog.ConfirmDialog(_("Do you really want to empty the current history?"), Lang.bind(this, function() {
            this.client.empty_history(this.historyName, null);
        })).open(global.get_current_time());
    },

    /*
     * Open GPaste's own GUI
     */
    openUI: function() {
        try {
            GPaste.util_spawn('Ui');
        }
        catch (e) { // Native approach didn't work, try alternative
            Util.spawnCommandLine("gpaste-client ui");
        }
    },

    /*
     *
     */
    showNewItemDialog: function() {
        this.dNewItem.open(global.get_current_time());
    },

    //
    // Events
    // ---------------------------------------------------------------------------------

    /*
     * The history has changed
     */
    onClientUpdate: function(client, action, target, position) {
        global.log("GPaste applet event: onClientUpdate");

        switch (target) {
            case GPaste.UpdateTarget.ALL:
                this.refresh(0);
                break;

            case GPaste.UpdateTarget.POSITION:
                switch (action) {
                    case GPaste.UpdateAction.REPLACE:
                        this.historyItems[position].refresh();
                        break;
                    case GPaste.UpdateAction.REMOVE:
                        this.refresh(position);
                        break;
                }
                break;
        }
    },

    /*
     * GPaste returned the list of histories
     */
    onClientHistoriesListed: function(client, result) {
        global.log("GPaste applet event: onClientHistoriesListed");

        let histories = this.client.list_histories_finish(result);

        while (this.historyListItems.length > 0) {
            this.historyListItems.pop().destroy();
        }

        for (let i = 0; i < histories.length; ++i) {
            let name = histories[i];

            if (name == "") continue;

            let item = new GPasteHistoryListItem.GPasteHistoryListItem(this, name);

            if (name == this.historyName) {
                item.setShowDot(true);
            }

            this.cmitemSelectHistory.menu.addMenuItem(item);
            this.historyListItems.push(item);
        }
    },

    /*
     * Show menu
     */
    onClientShowHistory: function() {
        global.log("GPaste applet event: onClientShowHistory");

        this.menu.open();
    },

    /*
     *
     */
    onClientSwitchHistory: function() {
        global.log("GPaste applet event: onClientSwitchHistory");

        this.client.get_history_name(Lang.bind(this, function(client, result) {
            this.historyName = this.client.get_history_name_finish(result);

            this.refresh();

            for (let i = 0; i < this.historyListItems.length; ++i) {
                let item = this.historyListItems[i];
                item.setShowDot(item.histName == this.historyName);
            }
        }));
    },

    /*
     * GPaste's tracking status has changed
     */
    onClientTracking: function(client, state) {
        global.log("GPaste applet event: onClientTracking");

        this.mitemTrack.setToggleState(state);
    },

    /*
     * User entered search input
     */
    onSearch: function() {
        global.log("GPaste applet event: onSearch");

        let searchStr = this.mitemSearch.entry.get_text().toLowerCase();

        if (searchStr.length > 0) {
            this.client.search(searchStr, Lang.bind(this, function(client, result) {
                this.searchResults = client.search_finish(result);
                let results = this.searchResults.length;
                let maxSize = this.historyItems.length;

                if (results > maxSize)
                    results = maxSize;

                for (let i = 0; i < results; ++i) {
                    this.historyItems[i].setIndex(this.searchResults[i]);
                }
                for (let i = results; i < maxSize; ++i) {
                    this.historyItems[i].setIndex(-1);
                }

                this.historyItems[0].actor.set_style(null);
            }));
        }
        else {
            this.searchResults = [];
            this.refresh(0);
            this.historyItems[0].actor.set_style("font-weight: bold;");
        }
    },

    /*
     * Applet has been removed, disconnect bindings
     */
    onDestroy: function() {
        this.client.disconnect(this.clientUpdateID);
        this.client.disconnect(this.clientShowID);
        this.client.disconnect(this.clientTrackingID);
        this.client.disconnect(this.clientSwitchHistoryID);
        this.client.disconnect(this.clientDeleteHistoryID);
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
function main(metadata, orientation, panel_height, instance_id) {
    return new GPasteApplet(orientation, panel_height, instance_id);
};
