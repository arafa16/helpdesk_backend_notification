const express = require("express");
const {
  checkTicketActivity,
  findTicketByHours,
} = require("../controllers/ticket_activity.controller");
const router = express.Router();

router.get("/data", checkTicketActivity);
router.get("/data_reminder", findTicketByHours);

module.exports = router;
