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
    console.log("Stripe Webhook Signature:", signature);
    console.log("Raw Body:", req.body);
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
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log(event, "event data object");

      const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);
      console.log(invoice.subscription, "invoice from webhook lavi");

      const customer = paymentIntent?.customer;
      if (User && customer) {
        const updatedData = {
          isSubscribed: true,
          plan: paymentIntent?.amount === 50000 ? "Yearly" : "Monthly",
          subscriptionId: invoice.subscription,
        };
        await User.updateOne({ stripeId: customer }, { $set: updatedData });
      }
      console.log(paymentIntent, "data coming from webhook");

      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      break;
    case "payment_method.attached":
      const paymentMethod = event.data.object;
      console.log(paymentMethod, "paymentMethod");

      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
      return res.status(200).json({ message: "Unhandled Event Type" });
  }

  return res.status(200).json({ message: "Payment Intent Succeeded" });
};

exports.updatePlan = async (req, res) => {
  const { email } = req.user;
  try {
    const user = await User.findOne({ email });
    console.log(user.subscriptionId, "subscriptionId");
    const fetchSubscription = await stripe.subscriptions.retrieve(
      user?.subscriptionId
    );
    console.log(fetchSubscription, "fetchSubscription");
    const plans = await stripe.plans.list({
      limit: 5,
    });
    console.log(plans, "plans");

    // const subscriptionItem = await stripe.subscriptionItems.update(
    //   fetchSubscription.items.data[0].id,
    //   {
    //     plans: await stripe.plans.update(
    //       fetchSubscription.items.data[0].plan.id,
    //       process.env.YEARLY_PLAN
    //     ),
    //   }
    // );
    return res
      .status(200)
      .json({ message: "details", user, fetchSubscription });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
