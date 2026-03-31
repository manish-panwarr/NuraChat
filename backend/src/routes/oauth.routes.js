import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

/* ===========================
   COMMON SUCCESS HANDLER
=========================== */
const oauthSuccessHandler = (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      console.error("OAuth Success Handler: No user found in req");
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      );
    }

    console.log("OAuth Success: User found:", user._id);

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?token=${token}`
    );
  } catch (error) {
    console.error("OAuth Error:", error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=oauth_failed`
    );
  }
};

/* ===========================
   GOOGLE OAUTH
=========================== */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  oauthSuccessHandler
);

/* ===========================
   FACEBOOK OAUTH
=========================== */
// router.get(
//   "/facebook",
//   passport.authenticate("facebook", { scope: ["email"] })
// );

// router.get(
//   "/facebook/callback",
//   passport.authenticate("facebook", {
//     session: false,
//     failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
//   }),
//   oauthSuccessHandler
// );

/* ===========================
   GITHUB OAUTH
=========================== */
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  oauthSuccessHandler
);

export default router;
