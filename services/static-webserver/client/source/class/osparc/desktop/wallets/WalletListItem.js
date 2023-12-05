/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2023 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)

************************************************************************ */

qx.Class.define("osparc.desktop.wallets.WalletListItem", {
  extend: osparc.ui.list.ListItemWithMenu,

  construct: function() {
    this.base(arguments);

    const creditsCol = 4;
    const layout = this._getLayout();
    layout.setSpacingX(10);
    layout.setColumnWidth(creditsCol, 110);
    layout.setColumnAlign(creditsCol, "right", "middle");
  },

  properties: {
    creditsAvailable: {
      check: "Number",
      nullable: false,
      apply: "__applyCreditsAvailable"
    },

    status: {
      check: ["ACTIVE", "INACTIVE"],
      init: null,
      nullable: false,
      apply: "__applyStatus"
    },

    preferredWallet: {
      check: "Boolean",
      init: null,
      nullable: false,
      apply: "__applyPreferredWallet"
    }
  },

  events: {
    "openEditWallet": "qx.event.type.Data",
    "buyCredits": "qx.event.type.Data",
    "toggleFavourite": "qx.event.type.Data"
  },

  members: {
    _createChildControlImpl: function(id) {
      let control;
      switch (id) {
        case "credits-layout":
          control = new qx.ui.container.Composite(new qx.ui.layout.VBox(5)).set({
            marginLeft: 10,
            alignY: "middle",
            width: 140
          });
          break;
        case "credits-indicator":
          control = new osparc.desktop.credits.CreditsIndicator();
          control.getChildControl("credits-text").set({
            alignX: "right"
          });
          this._add(control, {
            row: 0,
            column: 4,
            rowSpan: 2
          });
          break;
        case "status-button":
          control = new qx.ui.form.Button().set({
            maxHeight: 30,
            width: 62,
            alignX: "center",
            alignY: "middle",
            enabled: false
          });
          control.addListener("execute", () => {
            const walletId = this.getKey();
            const store = osparc.store.Store.getInstance();
            const found = store.getWallets().find(wallet => wallet.getWalletId() === parseInt(walletId));
            if (found) {
              // switch status
              const newStatus = found.getStatus() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
              const params = {
                url: {
                  "walletId": walletId
                },
                data: {
                  "name": found.getName(),
                  "description": found.getDescription(),
                  "thumbnail": found.getThumbnail(),
                  "status": newStatus
                }
              };
              osparc.data.Resources.fetch("wallets", "put", params)
                .then(() => found.setStatus(newStatus))
                .catch(err => {
                  console.error(err);
                  const msg = err.message || (this.tr("Something went wrong updating the state"));
                  osparc.FlashMessenger.getInstance().logAs(msg, "ERROR");
                });
            }
          }, this);
          this._add(control, {
            row: 0,
            column: 5,
            rowSpan: 2
          });
          break;
        case "buy-credits-button":
          control = new qx.ui.form.Button().set({
            label: this.tr("Buy Credits"),
            icon: "@FontAwesome5Solid/dollar-sign/16",
            maxHeight: 30,
            alignY: "middle",
            visibility: "hidden"
          });
          this.bind("accessRights", control, "enabled", {
            converter: accessRights => {
              const myAr = osparc.data.model.Wallet.getMyAccessRights(accessRights);
              return Boolean(myAr && myAr["write"]);
            }
          });
          control.addListener("execute", () => this.fireDataEvent("buyCredits", {
            walletId: this.getKey()
          }), this);
          this._add(control, {
            row: 0,
            column: 6,
            rowSpan: 2
          });
          break;
        case "favourite-button":
          control = new qx.ui.form.Button().set({
            iconPosition: "right",
            width: 110, // make Primary and Secondary buttons same width
            maxHeight: 30,
            alignY: "middle"
          });
          control.getChildControl("label").set({
            allowGrowX: true,
            textAlign: "right"
          });
          control.addListener("execute", () => this.fireDataEvent("toggleFavourite", {
            walletId: this.getKey()
          }), this);
          this._add(control, {
            row: 0,
            column: 7,
            rowSpan: 2
          });
          break;
      }

      return control || this.base(arguments, id);
    },

    __applyCreditsAvailable: function(creditsAvailable) {
      if (creditsAvailable !== null) {
        const creditsIndicator = this.getChildControl("credits-indicator");
        creditsIndicator.setCreditsAvailable(creditsAvailable);
      }
    },

    __canIWrite: function() {
      const myGid = osparc.auth.Data.getInstance().getGroupId();
      const accessRightss = this.getAccessRights();
      const found = accessRightss && accessRightss.find(ar => ar["gid"] === myGid);
      if (found) {
        return found["write"];
      }
      return false;
    },

    // overridden
    _applyAccessRights: function(accessRights) {
      this.base(arguments, accessRights);

      this.getChildControl("buy-credits-button").set({
        visibility: this.__canIWrite() ? "visible" : "hidden"
      });
    },

    // overridden
    _setSubtitle: function() {
      const accessRightss = this.getAccessRights();
      const myGid = osparc.auth.Data.getInstance().getGroupId();
      const found = accessRightss && accessRightss.find(ar => ar["gid"] === myGid);
      if (found) {
        const subtitle = this.getChildControl("contact");
        if (found["write"]) {
          subtitle.setValue(osparc.data.Roles.WALLET[2].label);
        } else if (found["read"]) {
          subtitle.setValue(osparc.data.Roles.WALLET[1].label);
        }
      }
    },

    // overridden
    _getOptionsMenu: function() {
      let menu = null;
      const accessRightss = this.getAccessRights();
      const myGid = osparc.auth.Data.getInstance().getGroupId();
      const found = accessRightss && accessRightss.find(ar => ar["gid"] === myGid);
      if (found && found["write"]) {
        const optionsMenu = this.getChildControl("options");
        optionsMenu.show();

        menu = new qx.ui.menu.Menu().set({
          position: "bottom-right"
        });

        const editWalletButton = new qx.ui.menu.Button(this.tr("Edit details..."));
        editWalletButton.addListener("execute", () => this.fireDataEvent("openEditWallet", this.getKey()));
        menu.add(editWalletButton);
      }
      return menu;
    },

    // overridden
    _applyThumbnail: function(value) {
      const thumbnail = this.getChildControl("thumbnail");
      if (value) {
        thumbnail.setSource(value);
      } else {
        this.__setDefaultThumbnail();
      }
    },

    __setDefaultThumbnail: function() {
      if (this.getThumbnail() === null) {
        // default thumbnail only if it's null
        const thumbnail = this.getChildControl("thumbnail");
        if (this.getAccessRights() && this.getAccessRights().length > 1) {
          thumbnail.setSource(osparc.utils.Icons.organization(osparc.ui.list.ListItemWithMenu.ICON_SIZE));
        } else {
          thumbnail.setSource(osparc.utils.Icons.user(osparc.ui.list.ListItemWithMenu.ICON_SIZE));
        }
      }
    },

    __applyStatus: function(status) {
      if (status) {
        const statusButton = this.getChildControl("status-button");
        statusButton.set({
          icon: status === "ACTIVE" ? "@FontAwesome5Solid/toggle-on/16" : "@FontAwesome5Solid/toggle-off/16",
          label: status === "ACTIVE" ? this.tr("ON") : this.tr("OFF"),
          toolTipText: status === "ACTIVE" ? this.tr("Credit Account enabled") : this.tr("Credit Account blocked"),
          enabled: this.__canIWrite(),
          visibility: "excluded" // excluded until the backed implements it
        });
      }
    },

    __applyPreferredWallet: function(isPreferredWallet) {
      const favouriteButton = this.getChildControl("favourite-button");
      favouriteButton.setBackgroundColor("transparent");
      const favouriteButtonIcon = favouriteButton.getChildControl("icon");
      if (isPreferredWallet) {
        favouriteButton.set({
          label: this.tr("Primary"),
          toolTipText: this.tr("Default Credit Account"),
          icon: "@FontAwesome5Solid/toggle-on/20"
        });
        favouriteButtonIcon.setTextColor("strong-main");
      } else {
        favouriteButton.set({
          label: this.tr("Secondary"),
          toolTipText: this.tr("Make it Default Credit Account"),
          icon: "@FontAwesome5Solid/toggle-off/20"
        });
        favouriteButtonIcon.setTextColor("text");
      }
    }
  }
});