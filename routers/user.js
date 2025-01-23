const express = require("express");

const {
  registerUser,
  login,
  VerifyAccount,
  getUser,
  createCheckoutSession,
  deletePlan,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");
const VerifyUserToken = require("../middleware/verifyUser");

const UserRouter = express.Router();

UserRouter.route("/register").post(registerUser);
UserRouter.route("/login").post(login);
UserRouter.route("/verify-account").put(VerifyUserToken, VerifyAccount);
UserRouter.route("/forgot-password").post(forgotPassword);
UserRouter.route("/reset-password").put(VerifyUserToken, resetPassword);
UserRouter.route("/get-user").get(VerifyUserToken, getUser);
UserRouter.route("/checkout").post(VerifyUserToken, createCheckoutSession);
UserRouter.route("/delete-plan").delete(VerifyUserToken, deletePlan);

module.exports = UserRouter;
