const express = require("express");
const {
  createMonthlyPlan,
  listAllPrices,
  stripeWebhook,
  createYearlyPlan,
} = require("../controllers/stripe");
const StripeRouter = express.Router();

StripeRouter.route("/create-monthly-plan").post(createMonthlyPlan);
StripeRouter.route("/create-yearly-plan").post(createYearlyPlan);
StripeRouter.route("/list-plans").post(listAllPrices);
StripeRouter.route("/webhook").post(
  express.raw({ type: "application/json" }),
  stripeWebhook
);

module.exports = StripeRouter;
