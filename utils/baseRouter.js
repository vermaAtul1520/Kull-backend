const express = require("express");
const { queryParser } = require("../middleware/queryParser");

function baseRouter(controller, opts = {}) {
  const router = express.Router();

  router.get("/", queryParser(opts), controller.getAll);
  router.get("/:id", controller.getOne);
  router.post("/", controller.createOne);
  router.put("/:id", controller.updateOne);
  router.delete("/:id", controller.deleteOne);

  return router;
}

module.exports = { baseRouter };
