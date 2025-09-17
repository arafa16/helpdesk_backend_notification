const {
  ticket_activity: ticketActivityModel,
  ticket: ticketModel,
  ticket_user_reminder: ticketUserReminderModel,
  user: userModel,
  ticket_status: ticketStatusModel,
} = require("../models/index.js");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const dayjs = require("dayjs");

const findActivity = async () => {
  let date = Date.now();

  // date = dayjs(date).format("YYYY-MM-DD HH:mm:ss");

  console.log(date, "date");

  const data = await ticketActivityModel.findOne({
    where: {
      reminder: true,
      schedule_reminder: {
        [Op.lt]: date,
      },
    },
    include: [
      {
        model: ticketModel,
        attributes: ["uuid", "display_name"],
        include: [
          {
            model: ticketUserReminderModel,
            attributes: { exclude: ["id", "user_id", "ticket_id"] },
            include: {
              model: userModel,
              attributes: ["uuid", "name", "phone_number", "email"],
            },
          },
        ],
      },
      {
        model: ticketStatusModel,
      },
    ],
    order: [["id", "ASC"]],
    attributes: ["id", "uuid", "reminder", "schedule_reminder"],
  });

  data && console.log(data?.id, "data id");

  return { data };
};

const checkTicketActivity = async (req, res) => {
  const findData = await findActivity();

  if (findData) {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const emailMessage = {
      from: '"Helpdesk" <no-replay@kopkarla.co.id>',
      to: "ara.fa@kopkarla.co.id",
      subject: "Reset Password",
      html: `
      <p>${findActivity.id}</p>
    `,
    };

    await transporter.sendMail(emailMessage);

    findActivity.reminder = false;
    findActivity.schedule_reminder = null;

    await findActivity.save();
  }

  return res.status(200).json({
    success: true,
    data: findActivity,
  });
};

module.exports = {
  checkTicketActivity,
  findActivity,
};
