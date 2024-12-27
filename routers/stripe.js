const express = require("express");
const {
  createMonthlyPlan,
  listAllPrices,
  stripeWebhook,
  createYearlyPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/stripe");
const VerifyUserToken = require("../middleware/verifyUser");
const StripeRouter = express.Router();

StripeRouter.route("/create-monthly-plan").post(createMonthlyPlan);
StripeRouter.route("/create-yearly-plan").post(createYearlyPlan);
StripeRouter.route("/list-plans").post(listAllPrices);
StripeRouter.route("/webhook").post(
  express.raw({ type: "application/json" }),
  stripeWebhook
);
StripeRouter.route("/update-plan").post(VerifyUserToken, updatePlan);

module.exports = StripeRouter;
