// src/config/passport.js
import dotenv from 'dotenv';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../database/db.js';

dotenv.config();

/**
 * Configure Passport with Google OAuth strategy
 * This module exports a function that accepts the passport instance.
 */
export default function configurePassport(passport) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  passport.serializeUser((user, done) => {
    // user should be a plain object with id
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const q = 'SELECT id, first_name, last_name, email, phone, is_verified FROM users WHERE id = $1';
      const result = await db.query(q, [id]);
      if (result.rows.length === 0) return done(null, false);
      return done(null, result.rows[0]);
    } catch (err) {
      return done(err);
    }
  });

  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL.replace(/\/$/, '')}/auth/google/callback`
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        const firstName = profile.name?.givenName || (profile.displayName || '').split(' ')[0] || '';
        const lastName = profile.name?.familyName || (profile.displayName || '').split(' ').slice(1).join(' ') || '';
        const providerId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Upsert user: if user exists by provider_id or email, update provider fields; otherwise create
        const findQuery = 'SELECT * FROM users WHERE provider_id = $1 OR email = $2 LIMIT 1';
        const found = await db.query(findQuery, [providerId, email]);

        if (found.rows.length > 0) {
          const user = found.rows[0];

          // If provider_id already set, return user
          if (user.provider_id) {
            return done(null, {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              phone: user.phone,
              is_verified: user.is_verified
            });
          }

          // If user was created with a local account, do NOT overwrite their auth_provider or provider_id.
          // Allow sign-in by returning the existing user record (they'll keep using local auth for password logins).
          // This prevents accidentally converting a local account into a Google account.
          if (user.auth_provider === 'local' || !user.auth_provider) {
            return done(null, {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              phone: user.phone,
              is_verified: user.is_verified
            });
          }

          // If user was created by an external provider (e.g. google) but provider_id is missing, update it
          const upd = 'UPDATE users SET provider_id = $1, auth_provider = $2, first_name = $3, last_name = $4, is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, first_name, last_name, email, phone, is_verified';
          const updRes = await db.query(upd, [providerId, 'google', firstName || user.first_name, lastName || user.last_name, user.id]);
          return done(null, updRes.rows[0]);
        }

        // Create new user record
        const insertQuery = `
          INSERT INTO users (first_name, last_name, email, auth_provider, provider_id, is_verified)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING id, first_name, last_name, email, phone, is_verified
        `;
        const insertRes = await db.query(insertQuery, [firstName, lastName, email, 'google', providerId]);
        return done(null, insertRes.rows[0]);
      } catch (error) {
        return done(error);
      }
    }
  ));
}
