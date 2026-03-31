import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.model.js";
import dotenv from "dotenv";
dotenv.config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/oauth/google/callback`,
    },
    async (_, __, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email"));

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          isEmailVerified: true,
          profileImage: profile.photos?.[0]?.value,
          providers: [{ provider: "google", providerUserId: profile.id }],
        });
      }

      done(null, user);
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/oauth/github/callback`,
      scope: ["user:email"],
    },
    async (_, __, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email"));

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          isEmailVerified: true,
          providers: [{ provider: "github", providerUserId: profile.id }],
        });
      }

      done(null, user);
    }
  )
);

export default passport;
