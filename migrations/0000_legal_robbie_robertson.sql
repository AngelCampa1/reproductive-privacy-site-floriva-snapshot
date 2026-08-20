CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  source_page TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  survey_completed INTEGER DEFAULT 0 NOT NULL,
  reminder_sent INTEGER DEFAULT 0 NOT NULL,
  referral_code TEXT NOT NULL,
  survey_token TEXT NOT NULL,
  referred_by TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS signups_email_unique
  ON signups(email);

CREATE UNIQUE INDEX IF NOT EXISTS signups_referral_code_unique
  ON signups(referral_code);

CREATE UNIQUE INDEX IF NOT EXISTS signups_survey_token_unique
  ON signups(survey_token);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  referrer_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (referrer_email) REFERENCES signups(email)
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_pair_idx
  ON referrals(referral_code, referred_email);

CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  signup_email TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (signup_email) REFERENCES signups(email)
);

CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_unique_idx
  ON survey_responses(signup_email, question_id);
