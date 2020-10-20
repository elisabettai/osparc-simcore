/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2020 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)

************************************************************************ */

/**
 *
 */

qx.Class.define("osparc.data.model.StudyUI", {
  extend: qx.core.Object,

  /**
   * @param studyDataUI {Object} Object containing the serialized Study UI Data
   */
  construct: function(studyDataUI) {
    this.base(arguments);

    this.set({
      workbech: studyDataUI.workbench || {},
      slideshow: studyDataUI.slideshow || {},
      currentNodeId: studyDataUI.currentNodeId || null
    });
  },

  properties: {
    workbech: {
      check: "Object",
      nullable: true
    },

    slideshow: {
      check: "Object",
      nullable: true,
      event: "changeSlideshow"
    },

    currentNodeId: {
      check: "String",
      nullable: true,
      event: "changeCurrentNodeId"
    }
  },

  members: {
    serialize: function() {
      const currentStudy = osparc.store.Store.getInstance().getCurrentStudy();
      let jsonObject = {};
      jsonObject["workbench"] = currentStudy.getWorkbench().serializeUI();
      jsonObject["slideshow"] = this.getSlideshow();
      jsonObject["currentNodeId"] = this.getCurrentNodeId();
      return jsonObject;
    }
  }
});