const User = require("../models/user");
const sendMail = require("./sendMail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.registerUser = async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password || !phone || !address) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }
  try {
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      const customer = await stripe.customers.create({
        name: name,
        email: email,
      });
      const createUser = await User.create({
        name: name,
        email: email,
        password: password,
        phone: phone,
        address: address,
        stripeId: customer.id,
      });
      const token = await createUser.generateToken();
      const message = `${token}`;
      await sendMail(
        email,
        "Welcome to our platform",

        message
      );

      return res.status(201).json({
        message:
          "We Have sent a email to your email address. Please verify your account to login!",
      });
    }
  } catch (error) {
    console.log(error, "Error in Registering User");
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error?.message });
  }
};

exports.VerifyAccount = async (req, res) => {
  const { id } = req.user;
  console.log(id);

  try {
    const findUser = await User.findById(id);
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    } else {
      const isAlreadyVerified = findUser.isVerified;
      if (isAlreadyVerified) {
        return res.status(202).json({ message: "User already Verified" });
      } else {
        await User.updateOne({ _id: id }, { isVerified: true });
        return res.status(200).json({ message: "User Verified Successfully!" });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error In verification of account!" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(404).json({ message: "Data is not provided!" });
  }

  try {
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).json({ message: "User not found!" });
    } else {
      const isUserVerified = await User.findOne({ isVerified: true });
      const token = await findUser.generateToken();

      if (!isUserVerified) {
        const message = token;
        await sendMail(email, "Account Verification", message);
        return res
          .status(404)
          .json({ message: "Please Verify Your Account First!" });
      } else {
        const matchPassword = await findUser.comparePass(password);
        if (!matchPassword) {
          return res.status(402).json({ message: "Incorrect Password!" });
        } else {
          return res.status(200).json({ message: "Logging In!", token: token });
        }
      }
    }
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: "An Error Occured at login" });
  }
};

exports.getUser = async (req, res) => {
  const { id } = req.user;
  try {
    const findUser = await User.findById(id);
    if (!findUser) {
      return res.status(404).json({ message: "User not found!" });
    }
    return res.status(200).json({
      message: "User fetched Successfully",
      data: findUser,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An Error Occured at Fetching User" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.user;
  const { name, phone, address } = req.body;
  try {
    const findUser = await User.findById(id);
    if (!findUser) {
      return res.status(404).json({ message: "User not found!" });
    } else {
      await User.updateOne(
        { _id: id },
        {
          name,
          phone,
          address,
        }
      );
      const findUpdatedUser = await User.findById(id);
      return res
        .status(200)
        .json({ message: "User has been updated", data: findUpdatedUser });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An Error Occured at Updating User" });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.user;
  const { currentPassword, newPassword } = req.body;
  try {
    const findUser = await User.findById(id);
    if (!findUser) {
      return res.status(404).json({ message: "User not found!" });
    } else {
      const matchPassword = await findUser.comparePass(currentPassword);
      if (!matchPassword) {
        return res.status(400).json({ message: "Password Incorrect!" });
      } else {
        const genSalt = await bcrypt.genSalt(12);
        const hashPassword = await bcrypt.hash(newPassword, genSalt);
        await User.updateOne({ _id: id }, { password: hashPassword });
        return res.status(200).json({ message: "Password has been changed!" });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error Occured at Changing password" });
  }
};

exports.createCheckoutSession = async (req, res) => {
  const { id } = req.user;
  console.log(process.env.MONTHLY_PLAN, "plan");
  const { plan } = req.body;
  console.log(plan);

  try {
    const user = await User.findById(id);
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price:
            plan === "monthly"
              ? process.env.MONTHLY_PLAN
              : plan === "yearly"
              ? process.env.YEARLY_PLAN
              : "none",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
      customer: user?.stripeId,
    });
    const response = {
      url: session.url,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in creating checkout session" });
  }
};
exports.deletePlan = async (req, res) => {
  const { plan } = req.body;
  try {
    const deleted = await stripe.plans.del(plan);

    return res.status(200).json({ message: "Plan Deleted", deleted });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
