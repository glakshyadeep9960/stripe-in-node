const jwt = require("jsonwebtoken");

async function VerifyUserToken(req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }
  const tokenWithoutBearer = token.split(" ")[1];

  try {
    const verifyUser = await jwt.verify(
      tokenWithoutBearer,
      process.env.JWT_SECRET_KEY
    );

    if (!verifyUser) {
      return res.status(401).json({ message: "Invalid Token" });
    } else {
      req.user = verifyUser;
      next();
    }
  } catch (error) {
    console.log(error, "error in middleware");
  }
}

module.exports = VerifyUserToken;
