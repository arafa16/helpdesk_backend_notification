const express = require("express");
const {
  checkTicketActivity,
} = require("../controllers/ticket_activity.controller");
const router = express.Router();

router.get("/data", checkTicketActivity);

module.exports = router;
