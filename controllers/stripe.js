const User = require("../models/user");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_SECRET_KEY;

exports.createMonthlyPlan = async (req, res) => {
  try {
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: 1000,
      recurring: {
        interval: "month",
      },
      product_data: {
        name: "Monthly Plan",
      },
    });

    const response = price.id;
    return res.status(201).json({ message: "Monthly Plan Created", response });
  } catch (error) {
    console.log(error, "Error in Creating Monthly Plan");
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error?.message });
  }
};

exports.createYearlyPlan = async (req, res) => {
  try {
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: 50000,
      recurring: {
        interval: "year",
      },
      product_data: {
        name: "Yearly Plan",
      },
    });
    return res
      .status(201)
      .json({ message: "Yearly Plan Created", price: price.id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.listAllPrices = async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      limit: 3,
    });
    return res.status(200).json({ prices });
  } catch (error) {
    let message = error.message;
    return res.status(500).json({ message });
  }
};

exports.stripeWebhook = async (req, res) => {
  let event;

  if (endpointSecret) {
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } catch (error) {
      console.log(`⚠️  Webhook signature verification failed.`, error.message);
      return res.sendStatus(400);
    }
  }

  switch (event.type) {
    case "customer.subscription.created":
      const paymentIntent = event.data.object;
      console.log(paymentIntent, "event data object");

      await User.updateOne(
        { stripeId: event.data.object.customer },
        {
          $set: {
            isSubscribed: true,
            subscriptionId: event.data.object.id,
            plan:
              event.data.object.plan.id === process.env.YEARLY_PLAN
                ? "Yearly"
                : process.env.MONTHLY_PLAN
                ? "Monthly"
                : "Free",
          },
        }
      );

      break;

    case "customer.subscription.updated":
      const subscription = event.data.object;
      console.log(subscription.plan.amount, "subscription");

      if (User && subscription.customer) {
        await User.updateOne(
          { stripeId: subscription.customer },
          {
            $set: {
              plan:
                subscription.plan.id === process.env.YEARLY_PLAN
                  ? "Yearly"
                  : subscription.plan.id === process.env.MONTHLY_PLAN
                  ? "Monthly"
                  : "Free",
            },
          }
        );
      }

      break;

    case "customer.subscription.deleted":
      console.log(event.data.object, "subscription deleted");
      if (event.data.object.customer && User) {
        await User.updateOne(
          { stripeId: event.data.object.customer },
          {
            $set: {
              plan: "Free",
              isSubscribed: false,
              subscriptionId: "Not Subscribed",
            },
          }
        );
      }
      break;

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
      return res.status(200).json({ message: "Unhandled Event Type" });
  }

  return res.status(200).json({ message: "Payment Intent Succeeded" });
};

exports.upgradePlan = async (req, res) => {
  const { email } = req.user;
  try {
    const user = await User.findOne({ email });
    const fetchSubscription = await stripe.subscriptions.retrieve(
      user?.subscriptionId
    );
    const plan = process.env.YEARLY_PLAN;
    const updatedSubscription = await stripe.subscriptions.update(
      user?.subscriptionId,
      {
        items: [
          {
            id: fetchSubscription.items.data[0].id,
            plan: plan,
          },
        ],
      }
    );

    return res.status(200).json({
      message: "Plan upgraded Successfully",
      updatedSubscription,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: error.message });
  }
};

exports.downgradePlan = async (req, res) => {
  const { email } = req.user;
  try {
    const user = await User.findOne({ email });
    const fetchSubscription = await stripe.subscriptions.retrieve(
      user?.subscriptionId
    );
    const plan = process.env.MONTHLY_PLAN;
    const updatedSubscription = await stripe.subscriptions.update(
      user?.subscriptionId,
      {
        items: [
          {
            id: fetchSubscription.items.data[0].id,
            plan: plan,
          },
        ],
      }
    );

    return res.status(200).json({
      message: "Plan Downgraded Successfully",
      updatedSubscription,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: error.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  const { email } = req.user;
  try {
    const user = await User.findOne({ email });
    if (user.subscriptionId) {
      const subscription = await stripe.subscriptions.cancel(
        user.subscriptionId
      );

      return res
        .status(200)
        .json({ message: "Subscription Cancelled", subscription });
    } else {
      return res.status(400).json({ message: "No Subscription Found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
