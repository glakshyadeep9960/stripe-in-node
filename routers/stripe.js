const express = require("express");
const {
  createMonthlyPlan,
  listAllPrices,
  stripeWebhook,
  createYearlyPlan,
  upgradePlan,
  downgradePlan,
  cancelSubscription,
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
StripeRouter.route("/upgrade-plan").post(VerifyUserToken, upgradePlan);
StripeRouter.route("/downgrade-plan").post(VerifyUserToken, downgradePlan);

StripeRouter.route("/cancel-subscription").post(
  VerifyUserToken,
  cancelSubscription
);
module.exports = StripeRouter;
