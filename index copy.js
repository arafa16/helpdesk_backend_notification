const express = require("express");
// const db = require("./src/models/index.js");
const dotenv = require("dotenv");
const ticket_activity_router = require("./src/routes/ticket_activity.route");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const { Client, LocalAuth } = require("whatsapp-web.js");
const multer = require("multer");
const {
  findActivity,
} = require("./src/controllers/ticket_activity.controller");

const app = express();

dotenv.config();

app.use(express.json());

const upload = multer();

const client = new Client({
  authStrategy: new LocalAuth(),
});

app.use("/api/v1/ticket_activity", ticket_activity_router);

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

const sendMessage = async () => {
  console.log("start check activity");
  const dataActivity = await findActivity();

  let messageId = null;
  let ticket_display_name = null;
  let ticket_status_name = null;

  if (dataActivity.data !== null) {
    console.log(
      dataActivity?.data?.ticket?.ticket_user_reminders.length,
      "cek contact user"
    );
    let contact = [];

    if (
      Number(dataActivity?.data?.ticket?.ticket_user_reminders.length) !== 0
    ) {
      dataActivity?.data?.ticket?.ticket_user_reminders.map(user)(
        contact.push(user)
      );
      contact = await client.getNumberId(
        dataActivity?.data?.ticket?.ticket_user_reminders[0]?.user?.phone_number
      );
    }

    console.log(contact, "contact");

    if (!contact || contact === null) {
      dataActivity.data.reminder = false;
      dataActivity.data.schedule_reminder = null;

      await dataActivity.data.save();

      console.log("finish check activity");
      return {
        message: `Number not found`,
      };
      // return res.status(404).send({
      //   success: false,
      //   message: `Number not found`,
      // });
    }

    const link_ticket =
      process.env.LINK_FRONTEND +
      "/ticket/view/" +
      dataActivity?.data?.ticket?.uuid +
      "?back=/";

    ticket_display_name = dataActivity?.data?.ticket?.display_name;
    ticket_status_name = dataActivity?.data?.ticket_status?.name;

    //message whatsapp
    const whatsapp_message = `${ticket_display_name}
ticket activity (${ticket_status_name}) has passed the time limit, check this link :
- ${link_ticket}`;

    const formattedNumber = contact._serialized;
    const response = await client.sendMessage(
      formattedNumber,
      whatsapp_message
    );

    messageId = response.id._serialized;

    dataActivity.data.reminder = false;
    dataActivity.data.schedule_reminder = null;

    await dataActivity.data.save();
  } else {
    console.log("overall the activity is good");
  }

  console.log("finish check activity");

  return { messageId, ticket_display_name, data: dataActivity.data };
};

client.on("ready", () => {
  app.use(upload.array());

  //cron
  cron.schedule(process.env.CRON_TIME, function () {
    sendMessage();
  });

  app.post("/api/v1/send-message", async (req, res) => {
    try {
      const send = await sendMessage();

      let message;

      if (send.messageId === null) {
        message = "overall the activity is good";
      } else {
        message = `${send.ticket_display_name} - Message sent successfully`;
      }

      res.send({
        success: true,
        message: message,
        data: {
          messageId: send.messageId,
          data: send.data,
        },
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
    }
  });

  app.listen(process.env.BACKEND_PORT, () => {
    console.log(`Server is running on port ${process.env.BACKEND_PORT}`);
  });
});

client.initialize();
