# Settings common to all environments (development|staging|production)
# Place environment specific settings in env_settings.py
# An example file (env_settings_example.py) can be used as a starting point

import os

# Application settings
APP_NAME = "LabelBee"
APP_SYSTEM_ERROR_SUBJECT_LINE = APP_NAME + " system error"

# Flask settings
CSRF_ENABLED = True

# Flask-SQLAlchemy settings
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask-User settings
USER_APP_NAME = APP_NAME
USER_ENABLE_CHANGE_PASSWORD = True  # Allow users to change their password
USER_ENABLE_CHANGE_USERNAME = False  # Allow users to change their username
USER_ENABLE_CONFIRM_EMAIL = False  # Force users to confirm their email during registration
USER_ENABLE_FORGOT_PASSWORD = False  # Allow users to reset their passwords
USER_ENABLE_EMAIL = True  # Register with Email
USER_ENABLE_REGISTRATION = True  # Allow new users to register
USER_REQUIRE_RETYPE_PASSWORD = True  # Prompt for `retype password` in:
USER_ENABLE_USERNAME = False  # Register and Login with username
USER_ENABLE_REMEMBER_ME = False
USER_AFTER_LOGIN_ENDPOINT = 'user_page'
USER_AFTER_LOGOUT_ENDPOINT = 'home_page'
USER_EMAIL_SENDER_NAME = USER_APP_NAME
USER_EMAIL_SENDER_EMAIL = "fakeEmail@fakeEmail.com"
USER_SEND_REGISTERED_EMAIL = False # Send an email to user confirming registration
USER_SEND_PASSWORD_CHANGED_EMAIL = False

USER_AFTER_CHANGE_PASSWORD_ENDPOINT = 'user_page'
USER_AFTER_CHANGE_USERNAME_ENDPOINT = 'user_page'
USER_AFTER_CONFIRM_ENDPOINT = 'user_page'
USER_AFTER_EDIT_USER_PROFILE_ENDPOINT = 'user_page'
USER_AFTER_FORGOT_PASSWORD_ENDPOINT = 'user_page'
USER_AFTER_REGISTER_ENDPOINT = 'user_page'
USER_AFTER_RESEND_EMAIL_CONFIRMATION_ENDPOINT = 'user_page'
USER_AFTER_RESET_PASSWORD_ENDPOINT = 'user_page'
USER_AFTER_INVITE_ENDPOINT = 'user_page'
USER_UNAUTHORIZED_ENDPOINT = 'home_page'
