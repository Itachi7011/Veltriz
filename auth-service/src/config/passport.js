const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
          return done(new Error('Google account has no public email'), null);
        }

        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email: email.toLowerCase() }],
        });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isEmailVerified = true;
            if (!user.avatarUrl && profile.photos && profile.photos[0]) {
              user.avatarUrl = profile.photos[0].value;
            }
            await user.save();
          }
          return done(null, user);
        }

        user = await User.create({
          googleId: profile.id,
          email: email.toLowerCase(),
          displayName: profile.displayName || email.split('@')[0],
          username: `${email.split('@')[0]}_${Math.floor(1000 + Math.random() * 9000)}`,
          avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined,
          isEmailVerified: true,
          authProvider: 'google',
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Not using persistent sessions (we're stateless w/ JWT), but passport
// requires these for the OAuth handshake redirect flow to work.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
