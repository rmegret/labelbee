<!-- GENERATED from ../behaviors/cap-100-manage-data-users.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Manage data and users ([CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users"))

Conventions: see [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.

Scope: Flask backend `labelbee/` (app factory, models, gallery / admin / auth / home / labelbee / download blueprints, REST API `/api/v1`, database helpers, settings) and their Jinja templates. Server side of annotation save/load ([CAP-703](../capabilities.md)) is documented here as API behaviors ([BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)") to [BEH-147](#beh-147-api-delete-annotation-record "API delete annotation record")); the browser side is in the [CAP-700](view_capabilities.md#cap-700-annotation-model-and-io "Annotation model and IO") file. By [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior") the code is the reference: where the code looks broken the current behavior is described and the defect is a DEBT item ([DEBT-101](view_debt.md#debt-101-annotation-lineage-created_from_id-is-never-stored "Annotation lineage `created_from_id` is never stored") to [DEBT-124](view_debt.md#debt-124-posted-timestamp-of-an-annotation-record-is-loaded-as-a-datetime "Posted `timestamp` of an annotation record is loaded as a datetime")). Sub-claims about library behavior (Flask-User, Flask-Login, WTForms, Werkzeug, SQLAlchemy) or about code that was not re-read in the last review are marked *(library)* or *(unverified)*.

Conventions used below: "page" = server-rendered HTML route; "API" = flask_restful resource under `/api/v1`. "HTTP status" is the real response status; "body status" is a `status_code` field inside a JSON body (which may differ, see [BEH-129](#beh-129-api-conventions-envelopes-status-codes-errors "API conventions: envelopes, status codes, errors")). URLs are shown without any reverse-proxy prefix.

## Contents

| ID | Name |
|---|---|
| BEH-101 | [Application factory and logging](#beh-101-application-factory-and-logging) |
| BEH-102 | [Configuration layering and environment variables](#beh-102-configuration-layering-and-environment-variables) |
| BEH-103 | [Reverse-proxy header handling](#beh-103-reverse-proxy-header-handling) |
| BEH-104 | [CSRF protection policy](#beh-104-csrf-protection-policy) |
| BEH-105 | [Page access control (login and role checks)](#beh-105-page-access-control-login-and-role-checks) |
| BEH-106 | [Shared page layout and navigation](#beh-106-shared-page-layout-and-navigation) |
| BEH-107 | [Home page](#beh-107-home-page) |
| BEH-108 | [User page](#beh-108-user-page) |
| BEH-109 | [Datasets list page](#beh-109-datasets-list-page) |
| BEH-110 | [New dataset form](#beh-110-new-dataset-form) |
| BEH-111 | [Delete dataset route](#beh-111-delete-dataset-route) |
| BEH-112 | [Videos page (list of videos, optionally of one dataset)](#beh-112-videos-page-list-of-videos-optionally-of-one-dataset) |
| BEH-113 | [Videos table columns and interactions](#beh-113-videos-table-columns-and-interactions) |
| BEH-114 | [Video detail page (`/videodata`)](#beh-114-video-detail-page-videodata) |
| BEH-115 | [Annotation file table on the video page](#beh-115-annotation-file-table-on-the-video-page) |
| BEH-116 | [Annotation record details page](#beh-116-annotation-record-details-page) |
| BEH-117 | [Edit video page (admin)](#beh-117-edit-video-page-admin) |
| BEH-118 | [Edit dataset page (admin)](#beh-118-edit-dataset-page-admin) |
| BEH-119 | [Annotator page route and deep links](#beh-119-annotator-page-route-and-deep-links) |
| BEH-120 | [Login, logout and password change (Flask-User pages)](#beh-120-login-logout-and-password-change-flask-user-pages) |
| BEH-121 | [Self-registration page](#beh-121-self-registration-page) |
| BEH-122 | [User profile page](#beh-122-user-profile-page) |
| BEH-123 | [Admin hub page](#beh-123-admin-hub-page) |
| BEH-124 | [Manage users page: user table](#beh-124-manage-users-page-user-table) |
| BEH-125 | [Manage users page: edit form](#beh-125-manage-users-page-edit-form) |
| BEH-126 | [`edit_user` semantics](#beh-126-edit_user-semantics) |
| BEH-127 | [Version information page](#beh-127-version-information-page) |
| BEH-128 | [Roles and permissions model](#beh-128-roles-and-permissions-model) |
| BEH-129 | [API conventions: envelopes, status codes, errors](#beh-129-api-conventions-envelopes-status-codes-errors) |
| BEH-130 | [API login](#beh-130-api-login) |
| BEH-131 | [API logout](#beh-131-api-logout) |
| BEH-132 | [API whoami](#beh-132-api-whoami) |
| BEH-133 | [API list videos](#beh-133-api-list-videos) |
| BEH-134 | [API upload video](#beh-134-api-upload-video) |
| BEH-135 | [API get one video](#beh-135-api-get-one-video) |
| BEH-136 | [API edit video](#beh-136-api-edit-video) |
| BEH-137 | [API delete video](#beh-137-api-delete-video) |
| BEH-138 | [API list datasets](#beh-138-api-list-datasets) |
| BEH-139 | [API create dataset](#beh-139-api-create-dataset) |
| BEH-140 | [API get dataset](#beh-140-api-get-dataset) |
| BEH-141 | [API update dataset](#beh-141-api-update-dataset) |
| BEH-142 | [API delete dataset](#beh-142-api-delete-dataset) |
| BEH-143 | [API list annotation records (server load, step 1)](#beh-143-api-list-annotation-records-server-load-step-1) |
| BEH-144 | [API save annotation snapshot (server save)](#beh-144-api-save-annotation-snapshot-server-save) |
| BEH-145 | [API load one annotation record (server load, step 2)](#beh-145-api-load-one-annotation-record-server-load-step-2) |
| BEH-146 | [API update annotation record metadata](#beh-146-api-update-annotation-record-metadata) |
| BEH-147 | [API delete annotation record](#beh-147-api-delete-annotation-record) |
| BEH-148 | [API raw data browser (`/api/v1/rawdata`)](#beh-148-api-raw-data-browser-apiv1rawdata) |
| BEH-149 | [Static data download with byte ranges (`/data`)](#beh-149-static-data-download-with-byte-ranges-data) |
| BEH-150 | [Field validation rules of the serializers](#beh-150-field-validation-rules-of-the-serializers) |
| BEH-151 | [Persistent records and constraints](#beh-151-persistent-records-and-constraints) |
| BEH-152 | [How the annotator uses the server for annotations](#beh-152-how-the-annotator-uses-the-server-for-annotations) |
| BEH-153 | [Extensions, CSRF mode and blueprint registration](#beh-153-extensions-csrf-mode-and-blueprint-registration) |
| BEH-154 | [Gallery POST handlers apply the profile form to the current user](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user) |
| BEH-155 | [Delete behavior of foreign keys and ORM relationships](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships) |

## BEH-101: Application factory and logging

`create_app()` builds the Flask app with `static_url_path=""` (the folder `labelbee/static` is served from the site root) and `template_folder="blueprints/templates"`, then wraps the WSGI app in `ReverseProxied` ([BEH-103](#beh-103-reverse-proxy-header-handling "Reverse-proxy header handling")). Logging: the first handler of `app.logger` is removed, the directory named by env `LABELBEE_LOGDIR` (read once when `labelbee/app.py` is imported) is created and a file handler writes `<LABELBEE_LOGDIR>/flask_errors.log` at DEBUG level with format `[time] [file] [level] message`; start fails with a `TypeError` if the env var is unset. A start message with the time and the logger name is logged. Config is then loaded ([BEH-102](#beh-102-configuration-layering-and-environment-variables "Configuration layering and environment variables")), extensions and blueprints are set up ([BEH-153](#beh-153-extensions-csrf-mode-and-blueprint-registration "Extensions, CSRF mode and blueprint registration")). The last step logs `APPLICATION_ROOT` and the whole `app.config` ([DEBT-107](view_debt.md#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential "Security hygiene: CSRF exemption, secrets in log, committed credential")).

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`, `log_dir`
  - [appserver.py](../../../appserver.py): `gunicorn_app`
- **Links:** [BEH-102](#beh-102-configuration-layering-and-environment-variables "Configuration layering and environment variables"), [BEH-103](#beh-103-reverse-proxy-header-handling "Reverse-proxy header handling"), [BEH-153](#beh-153-extensions-csrf-mode-and-blueprint-registration "Extensions, CSRF mode and blueprint registration"), [DEBT-107](view_debt.md#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential "Security hygiene: CSRF exemption, secrets in log, committed credential")

## BEH-102: Configuration layering and environment variables

Config is loaded with `app.config.from_object` from `labelbee.settings.settings` (common) then `labelbee.settings.local_settings` (environment specific, tracked in git, reads env via `dotenv`). Defaults in `settings.py`: `APP_NAME="LabelBee"`; Flask-User flags: change password on, change username off, confirm email off, forgot password off, email login on, username login off, retype password required, remember-me off, registered email off; every `USER_AFTER_*_ENDPOINT` is `auth.user_page`; `USER_AFTER_LOGOUT_ENDPOINT` is `home.home_page`; `USER_UNAUTHORIZED_ENDPOINT` is `home.home_page`. `local_settings.py` sets `WTF_CSRF_TIME_LIMIT=None` (CSRF tokens never expire), `SECRET_KEY` and the MySQL URI (`mysql+pymysql`) from env, local mail server `localhost:25`, `PORT=8080`, and `ADMINS`. Env variables used by the backend: `LABELBEE_LOGDIR`, `SECRET_KEY`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `DATA_DIR` (raw data root of [BEH-148](#beh-148-api-raw-data-browser-apiv1rawdata "API raw data browser (`/api/v1/rawdata`)")), `ROOT_PATH` (upload target of [BEH-134](#beh-134-api-upload-video "API upload video") and delete target of [BEH-137](#beh-137-api-delete-video "API delete video")). If the `local_settings` import fails the process exits with an explanatory message. `settings.py` sets `USER_ENABLE_REGISTRATION = True`; the Flask-User 1.0 key is `USER_ENABLE_REGISTER` *(library, unverified)*, so the setting is probably ignored and registration stays at its library default (enabled).

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/settings/settings.py](../../../labelbee/settings/settings.py): `USER_AFTER_LOGIN_ENDPOINT`, `USER_UNAUTHORIZED_ENDPOINT`, `USER_ENABLE_REGISTRATION`
  - [labelbee/settings/local_settings.py](../../../labelbee/settings/local_settings.py): `WTF_CSRF_TIME_LIMIT`, `SQLALCHEMY_DATABASE_URI`
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`
- **Links:** [BEH-101](#beh-101-application-factory-and-logging "Application factory and logging"), [BEH-121](#beh-121-self-registration-page "Self-registration page"), [DEBT-107](view_debt.md#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential "Security hygiene: CSRF exemption, secrets in log, committed credential"), [DEBT-115](view_debt.md#debt-115-dead-duplicated-or-inconsistent-backend-code "Dead, duplicated or inconsistent backend code"), [OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?")

## BEH-103: Reverse-proxy header handling

The `ReverseProxied` middleware honors four headers. `X-Script-Name` sets `SCRIPT_NAME` and, only when `PATH_INFO` starts with that value, strips it from `PATH_INFO`. `X-Scheme` sets `wsgi.url_scheme`, `X-Forwarded-Server` sets `HTTP_HOST` and `X-Forwarded-Port` sets `SERVER_PORT`; an absent or empty header changes nothing. The annotator page receives `SCRIPT_NAME` as `http_script_name` ([BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links")), and the browser `url_for(path)` helper prefixes every API/data URL with it so the app works under a URL prefix.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/middlewares/reverse_proxy.py](../../../labelbee/middlewares/reverse_proxy.py): `ReverseProxied`
  - [labelbee/blueprints/labelbee/labelbee.py](../../../labelbee/blueprints/labelbee/labelbee.py): `labelbee_user_page`
- **Links:** [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links"), [SEAM-102](view_seams.md#seam-102-server-pages-to-annotator-deep-links-and-page-parameters "Server pages to annotator (deep links and page parameters)")

## BEH-104: CSRF protection policy

Flask-WTF `CSRFProtect` is active for the whole app: every POST on server-rendered pages needs a valid CSRF token (form hidden field via `form.hidden_tag()` or header `X-CSRFToken`). Pages that make AJAX calls add `<meta name="csrf-token" content="{{ csrf_token() }}">` and a jQuery `$.ajaxSetup` `beforeSend` hook that sets header `X-CSRFToken` on every non-GET/HEAD/OPTIONS/TRACE request. The whole `/api/v1` blueprint is exempt (`csrf.exempt(api.bp)`), so API writes rely only on the session cookie. The login API returns a fresh token in its body (`csrf_token`, [BEH-130](#beh-130-api-login "API login")) but the API never checks it. Tokens never expire (`WTF_CSRF_TIME_LIMIT=None`). With `app.testing`, CSRF is off.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`, `csrf`
  - [labelbee/settings/local_settings.py](../../../labelbee/settings/local_settings.py): `WTF_CSRF_TIME_LIMIT`
  - [labelbee/blueprints/templates/layout.html](../../../labelbee/blueprints/templates/layout.html): `csrf-token meta tag and ajaxSetup (repeated in each page)`
- **Links:** [BEH-153](#beh-153-extensions-csrf-mode-and-blueprint-registration "Extensions, CSRF mode and blueprint registration"), [DEBT-107](view_debt.md#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential "Security hygiene: CSRF exemption, secrets in log, committed credential"), [SEAM-105](view_seams.md#seam-105-authentication-session-and-csrf "Authentication, session and CSRF")

## BEH-105: Page access control (login and role checks)

Pages are guarded by Flask-User decorators. `@login_required`: `/user`, `/user/profile`, `/datasets`, `/add_dataset`, `/videos`, `/videodata`, `/video_data_details`, `/labelbee/gui`. `@roles_accepted("admin")`: `/admin`, `/manage_users`, `/delete_dataset`, `/edit_video`, `/edit_dataset`. Public: `/` (home), `/admin/version` (no decorator, see [BEH-127](#beh-127-version-information-page "Version information page")), `/data/<path>` ([BEH-149](#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)")), and the Flask-User pages. An unauthenticated request to a guarded page is redirected by Flask-User to its login page (`/user/sign-in`, library default) ; an authenticated user lacking the role is redirected to `USER_UNAUTHORIZED_ENDPOINT` = `home.home_page` (behavior of the library, not read in this repo). The API does not use decorators: each method begins with `if not current_user.is_authenticated: abort(401, ...)`, and only PUT annotation and DELETE video check `current_user.has_roles("admin")` (403).

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `datasets_page`, `add_dataset_page`, `delete_dataset`, `videos_page`, `edit_video_page`, `video_data_page`, `video_data_details_page`, `edit_dataset_page`
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `admin_page`, `manage_users_page`, `version_page`
  - [labelbee/blueprints/auth/auth.py](../../../labelbee/blueprints/auth/auth.py): `user_page`, `user_profile_page`
  - [labelbee/settings/settings.py](../../../labelbee/settings/settings.py): `USER_UNAUTHORIZED_ENDPOINT`
- **Links:** [BEH-128](#beh-128-roles-and-permissions-model "Roles and permissions model"), [BEH-129](#beh-129-api-conventions-envelopes-status-codes-errors "API conventions: envelopes, status codes, errors"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API"), [OQ-102](../../QUESTIONS.md#oq-102 "Who may create, edit and delete datasets, videos and annotation records?")

## BEH-106: Shared page layout and navigation

All server pages extend `common/page_base.html`, which extends `layout.html`: Bootstrap CSS/JS and jQuery from `static/bootstrap`, `static/css/app.css`. Header: app name (link to home); right side: if authenticated "View Profile [first name]" (to `/user/profile`) and "Sign out" (`user.logout`), otherwise "Sign in" (`user.login`). Second bar: links Home, User (`/user`), Admin (`/admin`) shown to everybody (non-admins are bounced by [BEH-105](#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)")). Flash messages are shown as Bootstrap alerts (`error` mapped to `danger`, message rendered with `|safe`). Footer: `<APP_NAME> v3.0` and copyright 2016-2022 University of Puerto Rico. The gallery pages additionally render a three-button "database menu": Datasets (`/datasets`), Videos (`/videos`), Video Data (`/videodata`). The button of the current page is highlighted on the Videos and Video Data pages; no button is highlighted on the Datasets page ([DEBT-117](view_debt.md#debt-117-gallery-page-cosmetics-and-external-dependencies "Gallery page cosmetics and external dependencies")) nor on the annotation details page.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/templates/layout.html](../../../labelbee/blueprints/templates/layout.html): `header, nav bar, flash messages, footer`
  - [labelbee/blueprints/templates/common/macros.html](../../../labelbee/blueprints/templates/common/macros.html): `database_menu`, `is_current`
  - [labelbee/blueprints/templates/common/page_base.html](../../../labelbee/blueprints/templates/common/page_base.html): `extends layout`
- **Links:** [BEH-105](#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)")

## BEH-107: Home page

`GET /` (endpoint `home.home_page`, public) shows "Home page" and a status block. Anonymous: text with links "Sign in" and "Register"; a tools link "LabelBee (CAUTION: limited functionality, log in for full funcitonality)" to `labelbee/gui` (which in fact requires login, [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links")). Authenticated: "You are currently logged as [first name]" and the link "LabelBee (signed in))". Both: "Access to raw data" links `data/` and `data/videos/` ([BEH-149](#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)")) and an external link to the bigdbee web page. The links are relative, not built with `url_for`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/home/home.py](../../../labelbee/blueprints/home/home.py): `home_page`
  - [labelbee/blueprints/home/templates/home_page.html](../../../labelbee/blueprints/home/templates/home_page.html): `tools and raw data links`
- **Links:** [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links"), [BEH-149](#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)"), [DEBT-114](view_debt.md#debt-114-annotator-route-ignores-its-parameters-and-has-dead-code "Annotator route ignores its parameters and has dead code")

## BEH-108: User page

`GET /user` (login required, endpoint `auth.user_page`, also the post-login landing page) shows "User page", the current user's first name, a link `labelbee/gui` (annotator), the database menu buttons ([BEH-106](#beh-106-shared-page-layout-and-navigation "Shared page layout and navigation")), raw data links `data/` and `data/videos/`, and an external link. It passes a hard-coded unused template value `userid={"current_user": "andres"}`. The page includes the CSRF meta tag and ajaxSetup ([BEH-104](#beh-104-csrf-protection-policy "CSRF protection policy")) although it makes no AJAX call.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/auth/auth.py](../../../labelbee/blueprints/auth/auth.py): `user_page`
  - [labelbee/blueprints/auth/templates/user_page.html](../../../labelbee/blueprints/auth/templates/user_page.html): `tools and links`
- **Links:** [BEH-106](#beh-106-shared-page-layout-and-navigation "Shared page layout and navigation"), [BEH-120](#beh-120-login-logout-and-password-change-flask-user-pages "Login, logout and password change (Flask-User pages)")

## BEH-109: Datasets list page

`GET /datasets` (login required) lists all datasets (`DataSet.query.all()`, any user sees all datasets). Table `#datasets_table` columns: Dataset (name, a link to `/videos?dataset=<id>`), Description, Creator, Date and Time. The Creator cell shows the raw `created_by` user id (not a name) and the Date cell is always empty (the dict has no `timestamp` and `DataSet` has no such column). The table is a DataTables table (client-side search box, page length, sorting) with initial order column index 2 (Creator) descending. Below it a "New Dataset" button goes to `/add_dataset`. The heading prints an undefined `uri` (renders as `Datasets: `). A POST to `/datasets` does nothing but redirect back to the GET (the profile copy and commit are commented out in the handler, so it differs from the other gallery POSTs, [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `datasets_page`
  - [labelbee/blueprints/gallery/templates/datasets_page.html](../../../labelbee/blueprints/gallery/templates/datasets_page.html): `#datasets_table`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `dataset_list`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-110](#beh-110-new-dataset-form "New dataset form"), [BEH-113](#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-117](view_debt.md#debt-117-gallery-page-cosmetics-and-external-dependencies "Gallery page cosmetics and external dependencies")

## BEH-110: New dataset form

`GET /add_dataset` (any logged-in user) shows a form with `Dataset Name` (input `name`) and `Description` (textarea `description`) and a submit button. `POST /add_dataset` first builds a `UserProfileForm` from the current user (it requires first name and last name; as those fields are absent from the posted form they keep the user's values, so validation passes only when the user has both names), copies the form to the user and commits, then calls `new_dataset(name, description, user)`: the dataset name is `"New Dataset"` when the posted name is blank after `strip()` (a missing `name` field raises `AttributeError`, HTTP 500), `created_by` is the current user's id. Redirect to `/datasets`. If form validation fails the form is shown again with no message and no dataset is created.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `add_dataset_page`
  - [labelbee/blueprints/gallery/templates/add_dataset.html](../../../labelbee/blueprints/gallery/templates/add_dataset.html): `dataset form`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `new_dataset`
  - [labelbee/models.py](../../../labelbee/models.py): `UserProfileForm`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-139](#beh-139-api-create-dataset "API create dataset"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [OQ-102](../../QUESTIONS.md#oq-102 "Who may create, edit and delete datasets, videos and annotation records?")

## BEH-111: Delete dataset route

`/delete_dataset?dataset=<id>` (admin only). `POST` with valid `UserProfileForm` (same caveat as [BEH-110](#beh-110-new-dataset-form "New dataset form")) calls `delete_dataset_by_id(id)` (silently nothing if the id does not exist), commits, redirects to `/datasets`. `GET` (or invalid POST) executes `render_template(url_for("gallery.datasets_page"))`, i.e. looks for a template named `/datasets`, which does not exist (HTTP 500). No page links to this route.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `delete_dataset`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `delete_dataset_by_id`
- **Links:** [BEH-118](#beh-118-edit-dataset-page-admin "Edit dataset page (admin)"), [BEH-142](#beh-142-api-delete-dataset "API delete dataset"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-111](view_debt.md#debt-111-dataset-deletion-cannot-be-done-from-the-ui "Dataset deletion cannot be done from the UI")

## BEH-112: Videos page (list of videos, optionally of one dataset)

`GET /videos[?dataset=<id>]` (login required). With `dataset`: looks up the dataset and its creator and shows a header table `#video_info` (Dataset ID, Name, Description, "User Created" as "First Last (id)" or `_` when the creator user is not found, Date and Time Created, always empty) plus an "Edit Dataset" button to `/edit_dataset?dataset=<id>` (the button is visible to all users; the target is admin only). A nonexistent dataset id gives HTTP 500 (`AttributeError` on `None`), for GET and POST alike. Without `dataset`, no header table and all videos are listed. The video table `#videos_table` is filled by DataTables AJAX from `GET /api/v1/videos?dataset=<id>` (empty value when no dataset, meaning all videos; [BEH-133](#beh-133-api-list-videos "API list videos")). POST: if the profile form validates, the posted first and last name are copied onto the current user and committed, then the response redirects to `/videos` without the `dataset` parameter; otherwise the page is rendered ([BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `videos_page`
  - [labelbee/blueprints/gallery/templates/videos_page.html](../../../labelbee/blueprints/gallery/templates/videos_page.html): `#video_info`, `#videos_table`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `get_dataset_by_id`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-113](#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions"), [BEH-133](#beh-133-api-list-videos "API list videos"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")

## BEH-113: Videos table columns and interactions

Columns of `#videos_table` (data from the JSON `data[]` rows of [BEH-133](#beh-133-api-list-videos "API list videos")): Thumb (hidden by default; `<img class="thumb" height="40px">` with src = static `data` + `thumb`), Video Name (link text `path + "/" + file_name`, link to `/videodata?dataset=<datasetid>&videoid=<id>`), Colony, Date and Time (`timestamp`, ISO text), Video ID (zero-padded to 6 digits). The checkbox `#show_thumb` ("Show Thumbnail") toggles the Thumb column through `refresh_table()`. Each footer cell holds a text input "Search <title>" that filters its column on `keyup`, `change` and `clear` (the Thumb column has no input; input width comes from the `s` attribute). Initial sort: column index 2 (Colony) descending. DataTables defaults apply (global search, paging, `deferRender`).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/templates/videos_page.html](../../../labelbee/blueprints/gallery/templates/videos_page.html): `#videos_table`, `#show_thumb`, `refresh_table`
- **Links:** [BEH-112](#beh-112-videos-page-list-of-videos-optionally-of-one-dataset "Videos page (list of videos, optionally of one dataset)"), [BEH-114](#beh-114-video-detail-page-videodata "Video detail page (`/videodata`)"), [DEBT-117](view_debt.md#debt-117-gallery-page-cosmetics-and-external-dependencies "Gallery page cosmetics and external dependencies")

## BEH-114: Video detail page (`/videodata`)

`GET /videodata[?videoid=<id>][&dataset=<id>][&video_file=<x>]` (login required) shows the database menu and, if `videoid` matches a video (`video_info(videoid)`), a table `#video_info` (Thumb image or "None", Video ID, Name as `path/file_name`, Time Recorded, Location, Colony, Frames, Height px, Width px) and four buttons: "Edit Video Info" (`/edit_video?video=<id>`), "Open Video in LabelBee" (`/labelbee/gui#video_id=<id>`, new tab; the annotator reads the hash, [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links")), "Show Raw Video" (static `data` + `path/file_name`, new tab) and "Show Thumbnail" (static `data` + `thumb`, or `data/undefined` when there is no thumbnail). A missing or unknown `videoid` shows no video block (no error). `video_file` and `dataset` are passed to the template but unused. The annotation list below is [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page"). POST: if the profile form validates, the names are copied onto the current user and committed, then the response redirects to `/videodata` without parameters; otherwise the page is rendered ([BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `video_data_page`
  - [labelbee/blueprints/gallery/templates/video_data_page.html](../../../labelbee/blueprints/gallery/templates/video_data_page.html): `#video_info`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `video_info`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page"), [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")

## BEH-115: Annotation file table on the video page

On `/videodata` the table `#video_data_table` lists annotation records by DataTables AJAX: with a known video, `GET /api/v1/annotations?video_id=<id>` (the script block sits inside the `{% if video %}` branch of the template); without a known video (`{% else %}` branch) it requests `GET /api/v1/annotations` with no parameters (all videos, current user's records only), and its ID button links to `/video_data_details?video_data=<id>` without the `video` parameter. Because [BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)") filters on the current user, only the current user's records appear. Columns: ID (button link to `/video_data_details?video=<vid>&video_data=<id>`, [BEH-116](#beh-116-annotation-record-details-page "Annotation record details page")), Actions ("JSON" = `/api/v1/annotations?video_id=<video_id>`, i.e. the list of that video and not this record; "GUI" = `/labelbee/gui#video_data=<id>&video_id=<video_id>`, new tab, which makes the annotator load that record), Filename (usually empty, see [BEH-144](#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)")), Data Type, Date and Time, Video (button link to `/videodata?videoid=<video_id>`), Created By (`[created_by_id] First Last`), Notes. Footer search inputs per column except Actions (as [BEH-113](#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions")); initial order column index 4 (Date and Time) descending.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/gallery/templates/video_data_page.html](../../../labelbee/blueprints/gallery/templates/video_data_page.html): `#video_data_table`
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [BEH-116](#beh-116-annotation-record-details-page "Annotation record details page"), [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links"), [BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)"), [DEBT-117](view_debt.md#debt-117-gallery-page-cosmetics-and-external-dependencies "Gallery page cosmetics and external dependencies")

## BEH-116: Annotation record details page

`GET /video_data_details?video_data=<id>[&video=<vid>][&dataset=<did>]` (login required) loads the record and renders `video_data_details_page.html`, which shows a table (ID, File Name, Path, Data Type, Date, Video, Created By) and buttons "Edit Metadata", "RAW JSON", "Open in LabelBee". The template builds its links with unqualified endpoint names (`url_for('video_data_page')`, `edit_video_data_page`, `get_video_data_raw_v2`, `labelbee_user_page`) that do not exist in the app, so rendering raises `BuildError` (the first failing call is `url_for('video_data_page')` in the table row, which is rendered for any record) and the response is HTTP 500. The links from [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page") lead here.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `video_data_details_page`
  - [labelbee/blueprints/gallery/templates/video_data_details_page.html](../../../labelbee/blueprints/gallery/templates/video_data_details_page.html): `#video_info`
- **Links:** [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-110](view_debt.md#debt-110-broken-and-orphan-templates "Broken and orphan templates")

## BEH-117: Edit video page (admin)

`GET /edit_video?video=<id>` (admin) shows a form with text inputs `file_name`, `path`, `timestamp`, `location`, `colony`, `frames`, `width`, `height` (prefilled from the video, the timestamp as `YYYY-MM-DD HH:MM:SS`) and a hidden `video`. A missing `video` parameter leaves `video` undefined and raises `UnboundLocalError` when the template is rendered (HTTP 500). `POST` (valid `UserProfileForm`, [BEH-110](#beh-110-new-dataset-form "New dataset form") caveat; [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")) copies the profile names, commits, then calls `edit_video(...)` with `video`, `file_name`, `path`, `timestamp`, `location`, `colony`, `frames`, `width`, `height`: every field that is blank/falsy keeps its old value, otherwise it is overwritten; `timestamp` is parsed with the format `%Y-%m-%dT%H:%M:%S` (with `T`) *(unverified: body of `edit_video` not re-read)*; `notes`, `dataset`, `fps`, `thumb` cannot be edited here. Redirect to `/videodata?videoid=<id>`. Since the form is prefilled with a space-separated timestamp, submitting it unchanged raises `ValueError` (HTTP 500) *(same caveat)*. The heading prints `video.name`, an attribute `Video` does not have *(unverified)*.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `edit_video_page`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `edit_video`
  - [labelbee/blueprints/gallery/templates/edit_video.html](../../../labelbee/blueprints/gallery/templates/edit_video.html): `video form`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-136](#beh-136-api-edit-video "API edit video"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-112](view_debt.md#debt-112-edit-video-page-defects "Edit video page defects")

## BEH-118: Edit dataset page (admin)

`GET /edit_dataset?dataset=<id>` (admin) shows the form `name`, `description` (prefilled), hidden `dataset`, submit "Edit"; a second form "Delete Dataset" (red button) which POSTs to `/api/v1/datasets?id=<id>`, i.e. the create endpoint [BEH-139](#beh-139-api-create-dataset "API create dataset") (with no `name` it fails with HTTP 500 and deletes nothing); and a button "Add Video to Dataset" linking to `/api/v1/videos?dataset=<id>` (raw JSON list). `POST` (valid profile form, [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")) calls `edit_dataset(dataset, name, description)` (sets both fields as posted, no blank-keeps-old rule, no-op if the id does not exist), commits, redirects to `/videos?dataset=<id>`. Errors (HTTP 500): a missing `dataset` parameter leaves `dataset` undefined (`UnboundLocalError` at render); a nonexistent dataset id gives `AttributeError` on `None`; a dataset whose creator user no longer exists gives `AttributeError` when the creator name is built.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `edit_dataset_page`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `edit_dataset`
  - [labelbee/blueprints/gallery/templates/edit_dataset.html](../../../labelbee/blueprints/gallery/templates/edit_dataset.html): `edit and delete forms`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-111](#beh-111-delete-dataset-route "Delete dataset route"), [BEH-139](#beh-139-api-create-dataset "API create dataset"), [BEH-141](#beh-141-api-update-dataset "API update dataset"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user"), [DEBT-111](view_debt.md#debt-111-dataset-deletion-cannot-be-done-from-the-ui "Dataset deletion cannot be done from the UI")

## BEH-119: Annotator page route and deep links

`GET /labelbee/gui` (login required, endpoint `labelbee.labelbee_user_page`) renders `labelbee_page.html` with `userid`, `http_script_name` (the `SCRIPT_NAME`, written into the page as JS `http_script_name_0`), `video_url`, `tag_file`. The query parameters `video_url` / `tag_file` are read but ignored: in the authenticated branch `video_url` is the constant `datasets/gurabo10avi/mp4/` and `tag_file` `datasets/gurabo10avi/tags/`; the anonymous branch passes the query values through and `userid="anonymous"`; the template does not use `userid`, `video_url` or `tag_file` *(unverified)*. In the authenticated branch the handler also tries `os.makedirs(upload_dir + str(current_user.id))`; `upload_dir` is defined nowhere in the module (it imports only `os` and Flask names), so a `NameError` is swallowed by a bare `except` (prints "could not create upload dir"). The gallery produces deep links that the annotator parses from `location.hash` (URLSearchParams): `#video_id=<id>` selects a database video; `#video_data=<id>[&video_id=<id>]` loads the video then that annotation record; `#frame=<n>` seeks. The page's "Quit" link goes to home. The "Info" link (`a.videoinfolink`) has the template default `url_for('gallery.videos_page')` (`/videos`); once a video is loaded, `VideoControl.js` rewrites its href to `url_for("/videodata?videoid=" + videoManager.currentVideoID)`, so the test must run the JS to see `/videodata?videoid=<currentVideoID>`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/labelbee/labelbee.py](../../../labelbee/blueprints/labelbee/labelbee.py): `labelbee_user_page`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Jinja variables http_script_name`, `videoinfolink`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `videoinfolink href rewrite`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onhashchange`
- **Links:** [BEH-103](#beh-103-reverse-proxy-header-handling "Reverse-proxy header handling"), [BEH-114](#beh-114-video-detail-page-videodata "Video detail page (`/videodata`)"), [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page"), [DEBT-114](view_debt.md#debt-114-annotator-route-ignores-its-parameters-and-has-dead-code "Annotator route ignores its parameters and has dead code"), [SEAM-102](view_seams.md#seam-102-server-pages-to-annotator-deep-links-and-page-parameters "Server pages to annotator (deep links and page parameters)")

## BEH-120: Login, logout and password change (Flask-User pages)

Handled by Flask-User with the app's `User` model and templates under `blueprints/templates/flask_user/`: sign-in form (fields email, password; no remember-me; no forgot-password link; a "New here? Register." link), sign-out, change password (old, new, retype). The settings that drive it are in `settings.py` ([BEH-102](#beh-102-configuration-layering-and-environment-variables "Configuration layering and environment variables")). Sub-claims that are library behavior and not read in this repo *(library, to be confirmed by a run)*: the default URLs (`/user/sign-in`, `/user/sign-out`, `/user/register`, `/user/change-password`); that passwords are hashed by the Flask-User password context; that only active users (`users.is_active`) can sign in; that unauthenticated requests are redirected to sign-in with `next`. From settings: after login/registration/password change the user lands on `auth.user_page` (`/user`) (or on `next`), after logout on home; email confirmation, forgot-password and username login are disabled.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/templates/flask_user/login.html](../../../labelbee/blueprints/templates/flask_user/login.html): `sign-in form`
  - [labelbee/blueprints/templates/flask_user/change_password.html](../../../labelbee/blueprints/templates/flask_user/change_password.html): `change password form`
  - [labelbee/settings/settings.py](../../../labelbee/settings/settings.py): `USER_AFTER_LOGIN_ENDPOINT`, `USER_AFTER_LOGOUT_ENDPOINT`, `USER_ENABLE_CHANGE_PASSWORD`
  - [labelbee/models.py](../../../labelbee/models.py): `User`
- **Links:** [BEH-121](#beh-121-self-registration-page "Self-registration page"), [BEH-130](#beh-130-api-login "API login"), [SEAM-105](view_seams.md#seam-105-authentication-session-and-csrf "Authentication, session and CSRF"), [OQ-104](../../QUESTIONS.md#oq-104 "Is open self-registration intended, and which role should new users get?")

## BEH-121: Self-registration page

Registration is enabled (library default, see [BEH-102](#beh-102-configuration-layering-and-environment-variables "Configuration layering and environment variables")). The template `flask_user/register.html` renders email, `first_name`, `last_name`, password, retype password. The app's `MyRegisterForm` (adds `first_name`, `last_name`, both required) is never installed (`UserManager` is the default one), so the form object has no `first_name` / `last_name` and the template call `render_field(form.first_name)` is expected to fail at render time. A newly registered user has no role (no `users_roles` row is created by the app). The home page offers the "Register" link to anonymous visitors.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/templates/flask_user/register.html](../../../labelbee/blueprints/templates/flask_user/register.html): `register form`
  - [labelbee/models.py](../../../labelbee/models.py): `MyRegisterForm`, `CustomUserManager`
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`
- **Links:** [BEH-107](#beh-107-home-page "Home page"), [BEH-153](#beh-153-extensions-csrf-mode-and-blueprint-registration "Extensions, CSRF mode and blueprint registration"), [DEBT-115](view_debt.md#debt-115-dead-duplicated-or-inconsistent-backend-code "Dead, duplicated or inconsistent backend code"), [OQ-104](../../QUESTIONS.md#oq-104 "Is open self-registration intended, and which role should new users get?")

## BEH-122: User profile page

`GET /user/profile` (login required) shows a form with `first_name` and `last_name` (both required, prefilled) and a Save button, plus a "Change my password" link (`user.change_password`, when `USER_ENABLE_CHANGE_PASSWORD`). `POST` with a valid form copies the two fields to the current user, commits and redirects to home. Invalid input (an empty name) re-renders the form with `help-block` error texts under the field. Email, student number and class cannot be changed here (admins use [BEH-125](#beh-125-manage-users-page-edit-form "Manage users page: edit form")).

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/auth/auth.py](../../../labelbee/blueprints/auth/auth.py): `user_profile_page`
  - [labelbee/models.py](../../../labelbee/models.py): `UserProfileForm`
  - [labelbee/blueprints/auth/templates/user_profile_page.html](../../../labelbee/blueprints/auth/templates/user_profile_page.html): `profile form`
- **Links:** [BEH-125](#beh-125-manage-users-page-edit-form "Manage users page: edit form"), [BEH-154](#beh-154-gallery-post-handlers-apply-the-profile-form-to-the-current-user "Gallery POST handlers apply the profile form to the current user")

## BEH-123: Admin hub page

`GET /admin` (admin only) shows "Admin page" and two buttons: "View Version" (`/admin/version`) and "Manage Users" (`/manage_users`). It loads a nonexistent stylesheet `video.css` and the CSRF/ajaxSetup block.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `admin_page`
  - [labelbee/blueprints/admin/templates/admin_page.html](../../../labelbee/blueprints/admin/templates/admin_page.html): `links`
- **Links:** [BEH-105](#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)"), [BEH-124](#beh-124-manage-users-page-user-table "Manage users page: user table"), [BEH-127](#beh-127-version-information-page "Version information page")

## BEH-124: Manage users page: user table

`GET /manage_users` (admin only) renders all users (`User.query.all()`) as JSON embedded in the page (`users`, from `UserSchema`: `id`, `email`, `first_name`, `last_name`, `studentnum`, `clase`, `active`; never the password hash), each with `roles` (list of `{id, name, label}`). The DataTables table `#users_table` has columns: an "Edit" button, User ID (initial order ascending), Email, First Name, Last Name, Student Number, Class, Roles (labels joined by `, ` or `None`), Active (`Yes`/`No`). The `tbody` loop in the template iterates an undefined `videos` (copy-paste remnant, renders nothing). There is no way in the UI to create or delete users or roles.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `manage_users_page`
  - [labelbee/blueprints/admin/templates/manage_users_page.html](../../../labelbee/blueprints/admin/templates/manage_users_page.html): `#users_table`
  - [labelbee/database/user/schemas.py](../../../labelbee/database/user/schemas.py): `UserSchema`, `RoleSchema`
  - [labelbee/database/user/api.py](../../../labelbee/database/user/api.py): `user_list`, `get_user_roles_by_id`
- **Links:** [BEH-125](#beh-125-manage-users-page-edit-form "Manage users page: edit form"), [BEH-128](#beh-128-roles-and-permissions-model "Roles and permissions model"), [DEBT-109](view_debt.md#debt-109-manage-users-role-wipe-and-no-rollback "Manage users: role wipe and no rollback")

## BEH-125: Manage users page: edit form

Clicking a row's "Edit" button runs `populateFormFields(id)`: it sets the hidden `#id` and fills `#email`, `#first_name`, `#last_name`, `#studentnum`, `#clase` and checks `#active` from the embedded `users` array, then Bootstrap opens the modal `#editUserMenu` ("Edit User Information"). The form (`UserUpdateForm`, rendered with Flask-User's `render_field`, `novalidate`) also has `#password` (left blank), the multi-select `#roles` (all roles, labelled by `Role.label`; help text "Select multiple roles using control+click ...") and a Submit button. `populateFormFields` does not set the password nor preselect the user's current roles. The form POSTs to `/manage_users`; server validation (`validate_on_submit`): email required and valid, first and last name required; other fields optional. On a valid POST `edit_user` runs and the POST response itself renders the refreshed table with an `alert`: "Successfully edited user." or, if `edit_user` returned False, "Could not edit user. Invalid input? Check server logs?". If form validation fails, no alert is shown (the alert needs `editing`, set only after a valid POST) and the table is rendered as before; whether field-level error texts appear under the fields depends on the `render_field` macro of the Flask-User library *(library, unverified)*.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/admin/templates/manage_users_page.html](../../../labelbee/blueprints/admin/templates/manage_users_page.html): `populateFormFields`, `#editUserMenu`
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `manage_users_page`
  - [labelbee/models.py](../../../labelbee/models.py): `UserUpdateForm`
- **Links:** [BEH-124](#beh-124-manage-users-page-user-table "Manage users page: user table"), [BEH-126](#beh-126-edit_user-semantics "`edit_user` semantics"), [DEBT-109](view_debt.md#debt-109-manage-users-role-wipe-and-no-rollback "Manage users: role wipe and no rollback")

## BEH-126: `edit_user` semantics

`edit_user(form.data)` updates the user whose `id` is posted: `email`, `first_name`, `last_name`, `studentnum`, `clase` are replaced only when non-empty (empty keeps the old value, so `studentnum` and `clase` cannot be cleared); `password` is re-hashed with the Flask-User hasher only when non-empty; `active` is taken from the checkbox (a bool, so unchecked means inactive). Roles are replaced wholesale: every `users_roles` row of the user is deleted and one row per posted role id is added (no role posted means the user ends with no role). Returns True when `commit()` succeeds, False when it raises (for example a duplicate email); the session is not rolled back after a failed commit. If the posted `id` matches no user (empty or unknown), `User.query.get` yields no user and the assignment `user.email = ...` raises `AttributeError`, so `manage_users_page` answers HTTP 500.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** intentional
- **Code:**
  - [labelbee/database/user/api.py](../../../labelbee/database/user/api.py): `edit_user`
  - [labelbee/models.py](../../../labelbee/models.py): `UsersRoles`
- **Links:** [BEH-125](#beh-125-manage-users-page-edit-form "Manage users page: edit form"), [BEH-128](#beh-128-roles-and-permissions-model "Roles and permissions model"), [DEBT-109](view_debt.md#debt-109-manage-users-role-wipe-and-no-rollback "Manage users: role wipe and no rollback")

## BEH-127: Version information page

`GET /admin/version` (no authentication or role check) runs `git` through `subprocess` in the server's working directory (`pwd`, `git describe --always`, `git log -n 5`, last commit hash and date, current branch, `git status`) and passes one HTML string to the template, which outputs it with `{{ webapp_version }}` (auto-escaped, so the `<h3>`, `<pre>` tags show as literal text). If the `git` executable is missing the call raises `FileNotFoundError`; if the working directory is not a repository `git` exits non-zero and `CalledProcessError` is raised; both give HTTP 500. Linked from the admin hub *(unverified)*.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/admin/admin.py](../../../labelbee/blueprints/admin/admin.py): `version_page`
  - [labelbee/blueprints/admin/templates/version_page.html](../../../labelbee/blueprints/admin/templates/version_page.html): `webapp_version`
- **Links:** [BEH-123](#beh-123-admin-hub-page "Admin hub page"), [DEBT-108](view_debt.md#debt-108-adminversion-public-shell-based-and-escaped "`/admin/version` public, shell-based and escaped"), [OQ-109](../../QUESTIONS.md#oq-109 "Is the public `/admin/version` page intended?")

## BEH-128: Roles and permissions model

Table `roles` (`id`, `name` unique, `label`) and association table `users_roles` (`id`, `user_id` FK cascade, `role_id` FK cascade). The only role name checked by code is `admin` (page decorators and the two API checks of [BEH-105](#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)")). The role `label` is for display (the multi-select and the Roles column). `seed.py` creates roles `admin` and `user` with sample users; the `user` role is never checked by code, so every authenticated user has the same rights as a role-less one. `User` has `email` (unique), `password`, `active` (column `is_active`), `first_name`, `last_name`, `studentnum`, `clase`, `email_confirmed_at`.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `User`, `Role`, `UsersRoles`
  - [seed.py](../../../seed.py): `role_1`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-105](#beh-105-page-access-control-login-and-role-checks "Page access control (login and role checks)"), [BEH-126](#beh-126-edit_user-semantics "`edit_user` semantics"), [OQ-102](../../QUESTIONS.md#oq-102 "Who may create, edit and delete datasets, videos and annotation records?")

## BEH-129: API conventions: envelopes, status codes, errors

Base URL `/api/v1`, JSON responses (flask_restful), session-cookie authentication ([BEH-130](#beh-130-api-login "API login")), no CSRF check ([BEH-104](#beh-104-csrf-protection-policy "CSRF protection policy")). Authentication failure is always a real HTTP 401 with body `{"message": "<text>"}` (`Authentication Required` / `Unauthenticated user`). Admin failure is HTTP 403 `{"message": "Missing user permissions"}`. Success envelope used by videos, video, annotations, annotation: `{"success": true, "status_code": 200, "data": ...}` (some omit `status_code`: DELETE video; dataset PUT/DELETE return `{"success": true, "id": id}`; dataset list/get return a bare list / object; auth endpoints use `status: "SUCCESS" | "FAIL"`). Handled failures of videos GET, video GET and annotation GET are returned with HTTP 200 and body `{"success": false, "status_code": 400|500, "data": {}}` (the client must read the body field). Aborted failures (`abort(500, msg)`) are real HTTP 500. Unhandled exceptions (for example marshmallow `ValidationError`, `AttributeError` on a missing record) become HTTP 500 pages. Timestamps are exchanged as ISO strings `YYYY-MM-DDTHH:MM:SS` (naive, server-side UTC for new annotation records). Constants: `labelbee/blueprints/api/constants.py`.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/constants.py](../../../labelbee/blueprints/api/constants.py): `STATUS_CODE_200`, `STATUS_CODE_401`, `STATUS_CODE_403`, `STATUS_CODE_500`
  - [labelbee/blueprints/api/__init__.py](../../../labelbee/blueprints/api/__init__.py): `bp`, `api`
- **Links:** [BEH-104](#beh-104-csrf-protection-policy "CSRF protection policy"), [BEH-130](#beh-130-api-login "API login"), [DEBT-106](view_debt.md#debt-106-inconsistent-envelopes-and-failures-returned-with-http-200 "Inconsistent envelopes and failures returned with HTTP 200"), [SEAM-101](view_seams.md#seam-101-browser-to-rest-api-contract "Browser to REST API contract")

## BEH-130: API login

`POST /api/v1/auth/login` with form fields `email`, `password`. Looks the user up by email and verifies the password with `current_app.user_manager.verify_password`. Wrong email or password: HTTP 200 `{"request":"login","email":<email>,"status":"FAIL","message":"Incorrect credentials. Please try again."}`. Success: `login_user(user)` (session cookie) and HTTP 200 `{"request":"login","email":<email>,"status":"SUCCESS","csrf_token":<generate_csrf()>}`. The `active` flag is not checked by this code; the result of `login_user` is ignored, so the response says SUCCESS even if Flask-Login refuses an inactive user *(library, [DEBT-121](view_debt.md#debt-121-api-login-reports-success-for-inactive-users "API login reports SUCCESS for inactive users"))*. The annotator's login dialog (`ajaxlogin`) calls it with jQuery `$.ajax` (POST, form-encoded `email`, `password`); on `SUCCESS` it calls `whoami()` and closes the dialog, on `FAIL` it shows `ERROR: <message>` in the dialog, and on an HTTP error it shows `ERROR: <textStatus> <errorThrown> <responseText>`.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/auth.py](../../../labelbee/blueprints/api/resources/auth.py): `Login`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `ajaxlogin`
- **Links:** [BEH-120](#beh-120-login-logout-and-password-change-flask-user-pages "Login, logout and password change (Flask-User pages)"), [BEH-131](#beh-131-api-logout "API logout"), [BEH-132](#beh-132-api-whoami "API whoami"), [DEBT-121](view_debt.md#debt-121-api-login-reports-success-for-inactive-users "API login reports SUCCESS for inactive users"), [SEAM-105](view_seams.md#seam-105-authentication-session-and-csrf "Authentication, session and CSRF")

## BEH-131: API logout

`POST /api/v1/auth/logout`: not authenticated gives HTTP 200 `{"request":"logout","status":"FAIL"}`; authenticated calls `logout_user()` and returns `{"request":"logout","status":"SUCCESS"}`. The method `GET /api/v1/auth/login` (the `Login` resource's `get`) does exactly the same logout but is addressed on the login URL. The annotator (`ajaxlogout`) uses the POST on `/auth/logout`; on `SUCCESS` it calls `whoami()`, otherwise it only logs to the console.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/auth.py](../../../labelbee/blueprints/api/resources/auth.py): `Logout`, `Login`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `ajaxlogout`
- **Links:** [BEH-130](#beh-130-api-login "API login"), [DEBT-106](view_debt.md#debt-106-inconsistent-envelopes-and-failures-returned-with-http-200 "Inconsistent envelopes and failures returned with HTTP 200")

## BEH-132: API whoami

`GET /api/v1/auth/whoami` (no auth required): authenticated returns `{"is_authenticated": true, "first_name", "last_name", "email", "id"}`; anonymous returns `{"is_authenticated": false}`. The annotator calls it at start-up (`init`) and after login/logout and on its refresh button: it stores the response in `user_data`, stores `user_id = data.id`, shows "Logged as <first_name>" with a Log out button (or a Log in button), and toggles the CSS class `disabled` on all `.require-server` elements. On network failure it shows "No connection" and disables them.

- **Group:** [CAP-102](view_capabilities.md#cap-102-user-administration-and-login "User administration and login")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/auth.py](../../../labelbee/blueprints/api/resources/auth.py): `Whoami`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `whoami`
- **Links:** [BEH-130](#beh-130-api-login "API login"), [SEAM-101](view_seams.md#seam-101-browser-to-rest-api-contract "Browser to REST API contract")

## BEH-133: API list videos

`GET /api/v1/videos[?dataset=<id>]` (auth). `dataset` empty or absent means all videos; otherwise `Video.dataset == <id>`. Response HTTP 200 `{"success": true, "status_code": 200, "data": [video, ...]}` with each video serialized by `VideoSchema`: `id`, `file_name`, `path`, `timestamp`, `location`, `colony`, `dataset` (as a string), `notes`, `frames`, `height`, `width`, `fps`, `realfps`, `filesize`, `hash`, `corrupted`, `trimmed`, `thumb` (the `hasframe*` flags are not exposed). Any exception (for instance a `path` that does not start with `/` or ends with `/`, or a `file_name` starting/ending with `/`, see [BEH-150](#beh-150-field-validation-rules-of-the-serializers "Field validation rules of the serializers")) yields HTTP 200 `{"success": false, "status_code": 500, "data": {}}`. No filtering by user and no pagination. Used by the gallery table ([BEH-113](#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions")) and by the annotator's "Load Video from DB" dialog, which on HTTP failure shows a "not logged in" or "unable to retrieve" message.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoListAPI`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `video_list`
  - [labelbee/database/video/schema.py](../../../labelbee/database/video/schema.py): `VideoSchema`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `receiveVideoSelection`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-113](#beh-113-videos-table-columns-and-interactions "Videos table columns and interactions"), [BEH-150](#beh-150-field-validation-rules-of-the-serializers "Field validation rules of the serializers"), [SEAM-101](view_seams.md#seam-101-browser-to-rest-api-contract "Browser to REST API contract")

## BEH-134: API upload video

`POST /api/v1/videos` (auth; any user), multipart form: file part `file` (required, a missing part gives HTTP 400), fields `video_name`, `dataset_id`, `date`, `colony`, `notes`, `fps` (also reads `location`, but ignores it). Steps: write the bytes to `$ROOT_PATH/<video_name>.mp4` (overwrites an existing file, no name sanitation; failure gives `abort(500, "Error writing video file")`); open it with OpenCV and read real fps, frame count, width, height, file size (failure gives `abort(500, "Error extracting video metadata")`); insert a `Video` row with `file_name="<video_name>.mp4"`, `path="/videos"`, `timestamp=date` (string), `location=10` (constant), `thumb=""`, `hash=""`, `fps = fps field or realfps`, `realfps`, all `hasframe*`, `corrupted`, `trimmed` False. On success HTTP 200 `{"success": true, "status_code": 200, "id": <new id>}`. If the insert fails (including the unique constraint on `file_name`+`path`, or a missing `date`, which is not nullable) the file at the target path is deleted and `abort(500, "Error inserting video metadata")`. No UI of the gallery calls this endpoint.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoListAPI`
  - [labelbee/models.py](../../../labelbee/models.py): `Video`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-102](#beh-102-configuration-layering-and-environment-variables "Configuration layering and environment variables"), [DEBT-113](view_debt.md#debt-113-video-upload-and-delete-are-unsafe "Video upload and delete are unsafe"), [OQ-106](../../QUESTIONS.md#oq-106 "How are videos registered in practice, and are upload/delete endpoints used?")

## BEH-135: API get one video

`GET /api/v1/video/<int:id>` (auth). Success: HTTP 200 `{"success": true, "status_code": 200, "data": {"video_id", "path", "file_name", "videofps" (fps), "realfps", "starttime" (ISO timestamp), "duration" (= frames / fps), "nframes" (frames)}}`. Any exception (unknown id so the dump is empty, `fps` 0 or null, invalid `path`/`file_name` format) gives HTTP 200 `{"success": false, "status_code": 500, "data": {}}`. The annotator calls it when a video is selected (`videoSelected`) and uses `data` to set the video info; the jQuery error callback only fires for HTTP errors (401).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoAPI`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `videoSelected`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-150](#beh-150-field-validation-rules-of-the-serializers "Field validation rules of the serializers"), [SEAM-101](view_seams.md#seam-101-browser-to-rest-api-contract "Browser to REST API contract")

## BEH-136: API edit video

`PUT /api/v1/video/<int:id>` (auth; any authenticated user, no admin check) with a JSON body (`Content-Type: application/json`, otherwise HTTP 415): keys `video_name` (to `file_name`), `location`, `dataset_id` (to `dataset`), `date` (`YYYY-MM-DDTHH:MM:SS`), `colony`. Missing/falsy keys keep the old values (`edit_video` rule). Success HTTP 200 `{"success": true, "status_code": 200, "data": {"id": id}}`; any failure `abort(500)`. `path` is never changed here.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoAPI`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `edit_video`
- **Links:** [BEH-117](#beh-117-edit-video-page-admin "Edit video page (admin)"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API")

## BEH-137: API delete video

`DELETE /api/v1/video/<int:id>` (auth + admin role: 401 / 403). Steps: serialize the record; delete the DB row (and commit); delete the file `$ROOT_PATH/<file_name>` (note: not `path`/`file_name` as in upload). If the file removal fails the row is re-inserted from the serialized dict and `abort(500, "Error deleting video files")`. Other failures: `abort(500, "Error reading video file")` / `"Error deleting video"`. Success HTTP 200 `{"success": true, "data": {"id": id}}` (no `status_code`). Deletion of annotation records of the video depends on the database foreign keys.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/video.py](../../../labelbee/blueprints/api/resources/video.py): `VideoAPI`
  - [labelbee/database/video/api.py](../../../labelbee/database/video/api.py): `delete_video`
- **Links:** [BEH-134](#beh-134-api-upload-video "API upload video"), [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships"), [DEBT-113](view_debt.md#debt-113-video-upload-and-delete-are-unsafe "Video upload and delete are unsafe")

## BEH-138: API list datasets

`GET /api/v1/datasets` (auth): HTTP 200 and a bare JSON array (no envelope) of `DataSetSchema` objects: `id`, `name`, `description`, `creator` (nested user: `id`, `email`, `first_name`, `last_name`, `studentnum`, `clase`, `active`). The schema declares a required `timestamp` field but the model has none, so it is never present. Any exception gives `abort(500)`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetListAPI`
  - [labelbee/database/dataset/schema.py](../../../labelbee/database/dataset/schema.py): `DataSetSchema`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API"), [DEBT-115](view_debt.md#debt-115-dead-duplicated-or-inconsistent-backend-code "Dead, duplicated or inconsistent backend code")

## BEH-139: API create dataset

`POST /api/v1/datasets` (auth; any user) with `name` and `description` (flask_restful `RequestParser`, JSON or form values). Creates the dataset (blank name becomes `"New Dataset"`, a missing name raises and gives HTTP 500) with `created_by = current_user.id`. Response HTTP 200 `{"success": true, "status_code": 200, "data": {"id": <new id>}}`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetListAPI`, `parser`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `new_dataset`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-110](#beh-110-new-dataset-form "New dataset form"), [BEH-118](#beh-118-edit-dataset-page-admin "Edit dataset page (admin)")

## BEH-140: API get dataset

`GET /api/v1/dataset/<int:id>` (auth): the `DataSetSchema` object (bare, same fields as [BEH-138](#beh-138-api-list-datasets "API list datasets")). An unknown id returns HTTP 200 `{}` (dump of `None`). Exceptions give `abort(500)`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetAPI`
- **Links:** [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-138](#beh-138-api-list-datasets "API list datasets")

## BEH-141: API update dataset

`PUT /api/v1/dataset/<int:id>` (auth; any user, no admin check) with `name`, `description`: calls `edit_dataset` which overwrites both fields as given (a missing `name` sets `NULL` and fails the `NOT NULL` column, HTTP 500) and does nothing if the id does not exist. Response HTTP 200 `{"success": true, "id": id}` (also for unknown ids).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetAPI`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `edit_dataset`
- **Links:** [BEH-118](#beh-118-edit-dataset-page-admin "Edit dataset page (admin)"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API")

## BEH-142: API delete dataset

`DELETE /api/v1/dataset/<int:id>` (auth; any user, no admin check): `delete_dataset_by_id` (no-op for unknown id). The ORM relationship `DataSet.videos` (`labelbee/models.py`, `db.relationship("Video", backref="data_set", lazy=True)`) has no cascade option, so videos of the dataset are expected to be detached (`dataset` set to NULL) by SQLAlchemy's default behavior *(library, not run; [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships"))*. Response HTTP 200 `{"success": true, "id": id}`; exceptions give `abort(500)`.

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** intentional
- **Code:**
  - [labelbee/blueprints/api/resources/dataset.py](../../../labelbee/blueprints/api/resources/dataset.py): `DatasetAPI`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `delete_dataset_by_id`
  - [labelbee/models.py](../../../labelbee/models.py): `DataSet`
- **Links:** [BEH-111](#beh-111-delete-dataset-route "Delete dataset route"), [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API"), [OQ-102](../../QUESTIONS.md#oq-102 "Who may create, edit and delete datasets, videos and annotation records?")

## BEH-143: API list annotation records (server load, step 1)

`GET /api/v1/annotations[?video_id=<id>][&data_type=<t>][&allusers=<x>]` (auth). Returns the metadata of stored annotation records, newest first (`ORDER BY timestamp DESC`). Filters: `video_id` (when present), `data_type` (when non-empty; for the annotator `tag` or `event`), and a user filter `created_by_id == <user>` where `<user>` is the current user's id, except that when `allusers` is present with any non-empty value (even the text `false`) the filter value becomes that raw text instead (it then matches no real user). The resource passes `(video_id, data_type, user)` to `video_data_list`, which (for no `video_id` and no `data_type`) selects the columns `id, file_name, path, timestamp, data_type, video_id, created_by_id, created_from_id, notes`, orders by `timestamp` descending and filters on `created_by_id` only when the user value is truthy; the other branches were not shown *(unverified)*. Response HTTP 200 `{"success": true, "status_code": 200, "data": [ {id, file_name, path, timestamp, data_type, video_id, created_by_id, created_from_id, notes, created_by: "First Last"}, ... ]}` ; the `data` payload is not among the selected columns, so it is not returned. A record whose creator no longer exists raises `AttributeError` (HTTP 500). The annotator's "most recent" dialog sends `video_id` and `data_type` and shows the first row (newest); its "advanced" dialog shows the whole list with the columns File Name, Created on, Owner and a Load button per row, and always sends `allusers` (value `true` or `false`).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/database/annotation/api.py](../../../labelbee/database/annotation/api.py): `video_data_list`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `FromServerDialog`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [BEH-115](#beh-115-annotation-file-table-on-the-video-page "Annotation file table on the video page"), [BEH-150](#beh-150-field-validation-rules-of-the-serializers "Field validation rules of the serializers"), [DEBT-104](view_debt.md#debt-104-allusers-flag-is-a-string-own-records-filter-breaks "`allusers` flag is a string, 'own records' filter breaks"), [OQ-103](../../QUESTIONS.md#oq-103 "Intended meaning of 'Show files from all users'")

## BEH-144: API save annotation snapshot (server save)

`POST /api/v1/annotations` (auth), form-encoded fields: the resource serializes `request.form` to JSON and loads it with `VideoDataSchema`: `video_id` (int, used to look up the `Video`), `created_by_id` (int, looked up as a `User`), `data_type` (must be one of `tag`, `event`, `flowers`), `data` (string: the whole annotation JSON), optional `notes`, `file_name`, `path`, `timestamp`. A missing `video_id` or `created_by_id` key raises `KeyError` (HTTP 500). A new `video_data` row is always inserted (never an update; old rows are never modified) through `add_video_data(file_name, path, timestamp, data_type, video, created_by, data, notes, created_from)`: `file_name`, `path`, `notes`, `data` as posted (the annotator sends no `file_name` / `path`, so they are `NULL`); `created_by` = the user in `created_by_id`; `created_from` = the value of a key `created_from` that the schema never produces (it produces `created_from_id`), so it is always `None` and lineage is not stored ([DEBT-101](view_debt.md#debt-101-annotation-lineage-created_from_id-is-never-stored "Annotation lineage `created_from_id` is never stored")). The `timestamp`: the schema loads a posted value as a `datetime`, the resource passes it unchanged, and `add_video_data` calls `datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")` on it, which raises `TypeError` (nothing catches it, HTTP 500); only an omitted or empty `timestamp` works, and then the server stores the current UTC time with second precision ([DEBT-124](view_debt.md#debt-124-posted-timestamp-of-an-annotation-record-is-loaded-as-a-datetime "Posted `timestamp` of an annotation record is loaded as a datetime"), [OQ-110](../../QUESTIONS.md#oq-110 "What should a client-supplied `timestamp` do when saving an annotation record?")); the annotator never sends it. What `add_video_data` does for an unknown `video_id` or `created_by_id` (NULL reference or error) is *(unverified)*. Response HTTP 200 `{"success": true, "status_code": 200, "data": <the new record serialized by VideoDataSchema, including data>}`. The annotator sends `video_id` (current video), `created_by_id` (its stored `user_id` from whoami), `data_type: "event"`, `data` (`JSON.stringify(convertTracksToV2())`) and `created_from_id` (`fromServerDialog.basedOn`, the id of the last loaded record), and on success `alert`s id, file name, path, data type, created_from_id, video_id, timestamp. Validation errors (unknown `data_type`, non-integer `created_from_id` such as the empty text jQuery sends when nothing was loaded, a non-integer id) raise `ValidationError`, which nothing catches (HTTP 500).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationsAPI`
  - [labelbee/database/annotation/api.py](../../../labelbee/database/annotation/api.py): `add_video_data`
  - [labelbee/database/annotation/schema.py](../../../labelbee/database/annotation/schema.py): `VideoDataSchema`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-101](view_debt.md#debt-101-annotation-lineage-created_from_id-is-never-stored "Annotation lineage `created_from_id` is never stored"), [DEBT-102](view_debt.md#debt-102-saving-a-snapshot-not-based-on-a-loaded-record-probably-fails "Saving a snapshot not based on a loaded record probably fails"), [DEBT-103](view_debt.md#debt-103-created_by_id-trusted-from-the-client "`created_by_id` trusted from the client"), [DEBT-124](view_debt.md#debt-124-posted-timestamp-of-an-annotation-record-is-loaded-as-a-datetime "Posted `timestamp` of an annotation record is loaded as a datetime"), [OQ-101](../../QUESTIONS.md#oq-101 "Is `created_from_id` supposed to be stored, and does the first save work?"), [OQ-107](../../QUESTIONS.md#oq-107 "Size limits and tag-record storage of annotation records"), [OQ-110](../../QUESTIONS.md#oq-110 "What should a client-supplied `timestamp` do when saving an annotation record?")

## BEH-145: API load one annotation record (server load, step 2)

`GET /api/v1/annotation/<int:id>` (auth; any user can read any record). HTTP 200 `{"success": true, "status_code": 200, "data": {id, file_name, path, timestamp, data_type, video_id, created_by_id, data, notes, created_from_id}}` where `data` is the stored JSON text (the annotator does `JSON.parse(json.data.data)` and feeds `setTracks`). An unknown id gives HTTP 200 `{"success": false, "status_code": 400, "data": {}}`; any other exception HTTP 200 body status 500. Used by "Load #id" buttons (`loadEvents`) and by the deep link `#video_data=<id>` (`loadEventsFromServerByID`). For `tag` files the annotator instead requests `rest/v2/annotation/<id>`, a route that does not exist in this server ([DEBT-118](view_debt.md#debt-118-tag-file-load-uses-a-nonexistent-route "Tag-file load uses a nonexistent route")).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationAPI`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromServerByID`, `tagsFromServer`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [BEH-119](#beh-119-annotator-page-route-and-deep-links "Annotator page route and deep links"), [DEBT-118](view_debt.md#debt-118-tag-file-load-uses-a-nonexistent-route "Tag-file load uses a nonexistent route")

## BEH-146: API update annotation record metadata

`PUT /api/v1/annotation/<int:id>` (auth + admin role; 401 / 403; comment says "TODO: Test this"). Form-encoded `file_name`, `path`, `timestamp`, `data_type` (enum as [BEH-144](#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)")), `video_id`: each non-empty value replaces the stored one; `data`, `notes`, `created_by` and lineage cannot be changed. Response HTTP 200 `{"success": true, "status_code": 200, "data": <record>}`. An unknown id raises (HTTP 500). No UI calls it (the "Edit Metadata" page of [BEH-116](#beh-116-annotation-record-details-page "Annotation record details page") does not exist).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationAPI`
  - [labelbee/database/annotation/api.py](../../../labelbee/database/annotation/api.py): `edit_video_data`
- **Links:** [BEH-116](#beh-116-annotation-record-details-page "Annotation record details page")

## BEH-147: API delete annotation record

`DELETE /api/v1/annotation/<int:id>` (auth; any authenticated user can delete any record, no admin or owner check): deletes the row and commits. Response HTTP 200 `{"success": true, "status_code": 200, "data": {"id": id}}`. An unknown id raises (HTTP 500); a record that is the `created_from_id` parent of another record violates the foreign key (database dependent) and also fails. No UI calls it.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** debt
- **Code:**
  - [labelbee/blueprints/api/resources/annotations.py](../../../labelbee/blueprints/api/resources/annotations.py): `AnnotationAPI`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships"), [DEBT-105](view_debt.md#debt-105-authorization-gaps-in-the-api "Authorization gaps in the API")

## BEH-148: API raw data browser (`/api/v1/rawdata`)

`GET /api/v1/rawdata/` and `GET /api/v1/rawdata/<path>` (auth, else HTTP 401 `Unauthenticated user`), root directory `$DATA_DIR` (read once at import of `rawdata.py`), query/form argument `format` (default `html`). Existing file: with `html` or `htmlpage` the file is streamed with HTTP Range support ([BEH-149](#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)")), with `json` an error. Existing directory: `html` returns a bare `<ul>` of links (names, with `..` first, dot-files hidden), `htmlpage` returns a full page ("File Browsing") of links with `?format=htmlpage`, `json` returns `{"files": [{uri, download_uri, filename, path}], "dirs": [{uri, download_uri, filename (with trailing /), path}], "base_uri", "path", "uri"}` where `download_uri` points to `/data/...`, the entry `..` is added to `dirs` (as `../`) when `path` is not empty, and dot-files are listed. A missing path, an unknown format, a file in `json` format, or any other exception inside the handler (including an unset `DATA_DIR`) is returned with HTTP 200 `{"status": "error", "message": <text>, "code": 500}`, so none of these is an HTTP error. The annotator's file pickers (`FilePickerFromServerDialog`, manual load of tracks CSV and videos "From /data") use the `json` format.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/api/resources/rawdata.py](../../../labelbee/blueprints/api/resources/rawdata.py): `RawDataAPI`, `data_root_dir`
  - [labelbee/blueprints/download/flask_range_requests.py](../../../labelbee/blueprints/download/flask_range_requests.py): `serve_files`, `dir_listing`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `FilePickerFromServerDialog`
- **Links:** [BEH-149](#beh-149-static-data-download-with-byte-ranges-data "Static data download with byte ranges (`/data`)"), [DEBT-106](view_debt.md#debt-106-inconsistent-envelopes-and-failures-returned-with-http-200 "Inconsistent envelopes and failures returned with HTTP 200"), [DEBT-116](view_debt.md#debt-116-download-and-range-handling-defects "Download and range handling defects"), [SEAM-104](view_seams.md#seam-104-file-serving-contract-data-and-apiv1rawdata "File serving contract (`/data` and `/api/v1/rawdata`)"), [OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?")

## BEH-149: Static data download with byte ranges (`/data`)

`GET /data/<path>` (no authentication; route rule `/data/<path:path>`, so `/data/` with an empty path is not matched by it *(library, Werkzeug converter, not run)*). The served directory is `os.path.join(bp.root_path, "../static/data")` in `send_data`; the blueprint root path is the directory of the module that defines it *(library, Flask)*, so this resolves to `labelbee/blueprints/static/data`, not `labelbee/static/data`. In this checkout `labelbee/blueprints/static/` does not exist (static check), so `/data/...` finds no file unless that directory is created at deployment; which folder deployments populate is [OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?"). Because the app also serves `labelbee/static` from the site root (`static_url_path=""`), whether `/data/...` is answered by this blueprint or by the static rule depends on Werkzeug rule ordering *(library, needs a run)*. A directory gives the bare link list of [BEH-148](#beh-148-api-raw-data-browser-apiv1rawdata "API raw data browser (`/api/v1/rawdata`)") (`html`). A missing file gives 404. Without `Range` header the file is sent whole (`send_from_directory`). With a `Range` header the first match of the regex `(\d+)-(\d*)` is used: `bytes=a-b` or `bytes=a-` make the server read from byte `a` up to `b` (or the end) but at most 8 MiB, and reply HTTP 206 with `Content-Range: bytes a-end/size` and the mimetype guessed from the file name. The answer is 206 for any Range header that matches and no `Accept-Ranges` header is added by this function. The browser `<video>` element and the annotator's loader (`url_for('/data') + path`) rely on it for seeking. Failures (HTTP 500): unsafe paths (`safe_join` returns None; the debug `print` concatenates `None` before the `try`); a suffix range `bytes=-N` (no digits before the `-`, the regex gives no match and `.groups()` raises); a Range request for a file whose mimetype is unknown (the debug `print` concatenates `None`). A multi-range header such as `bytes=0-1,5-6` is answered with its first range only (206).

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/download/download.py](../../../labelbee/blueprints/download/download.py): `send_data`
  - [labelbee/blueprints/download/flask_range_requests.py](../../../labelbee/blueprints/download/flask_range_requests.py): `send_from_directory_partial`
- **Links:** [BEH-148](#beh-148-api-raw-data-browser-apiv1rawdata "API raw data browser (`/api/v1/rawdata`)"), [BEH-114](#beh-114-video-detail-page-videodata "Video detail page (`/videodata`)"), [DEBT-116](view_debt.md#debt-116-download-and-range-handling-defects "Download and range handling defects"), [SEAM-104](view_seams.md#seam-104-file-serving-contract-data-and-apiv1rawdata "File serving contract (`/data` and `/api/v1/rawdata`)"), [OQ-105](../../QUESTIONS.md#oq-105 "Which folder do `/data`, `$DATA_DIR` and `$ROOT_PATH` point to in deployments, and is `/data` meant to be public?")

## BEH-150: Field validation rules of the serializers

`FileName` (used for `file_name`) and `Path` (`path`) validate on serialization (dump), not on load (their `_deserialize` accepts anything). `FileName`: must be a string (bytes are decoded), a null value is returned as null; must not start or end with `/`; the empty string is accepted. `Path`: empty or null accepted; otherwise must start with `/` and must not end with `/`. A violation raises `ValidationError` during the dump, which turns the whole response into the error cases of [BEH-133](#beh-133-api-list-videos "API list videos") / [BEH-135](#beh-135-api-get-one-video "API get one video") or HTTP 500 for annotations. `VideoDataSchema.data_type` is validated on load only: `tag`, `event`, `flowers`. `UserSchema.email` is `Email`, `first_name` / `last_name` required; `RoleSchema` `name` / `label` required; `DataSetSchema.name` required (load only) *(unverified)*.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** intentional
- **Code:**
  - [labelbee/database/utils.py](../../../labelbee/database/utils.py): `Path`, `FileName`
  - [labelbee/database/annotation/schema.py](../../../labelbee/database/annotation/schema.py): `VideoDataSchema`
  - [labelbee/database/video/schema.py](../../../labelbee/database/video/schema.py): `VideoSchema`
- **Links:** [BEH-133](#beh-133-api-list-videos "API list videos"), [BEH-135](#beh-135-api-get-one-video "API get one video"), [BEH-144](#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)")

## BEH-151: Persistent records and constraints

Tables (MySQL via SQLAlchemy): `users`, `roles`, `users_roles` ([BEH-128](#beh-128-roles-and-permissions-model "Roles and permissions model")); `data_set` (`id`, `name` not null with server default "Dataset", `description`, `created_by` FK users); `videos` (`id`, `file_name` (200) and `path` (100) not null with server default empty, `timestamp` not null, `location` int not null, `colony` (50), `notes`, `dataset` FK data_set, `thumb` (200), `frames`/`height`/`width`/`filesize` not null, `fps`, `realfps` (doubles), `hash` (70), `corrupted`, `trimmed` and eight `hasframe*` flags; unique `(file_name, path)`); `video_data` (`id`, `file_name` (200 chars, nullable), `path` (100 chars, nullable), `timestamp` not null, `data_type` (25 chars), `data` (text), `notes`, `video_id` FK videos, `created_from_id` self FK, `created_by_id` FK users; unique `(file_name, path)`, which does not constrain rows with `NULL` names *(library, SQL semantics)*). Two objects named `VideoData` are defined (`labelbee/models.py` and `database/annotation/model.py`); only the first is imported *(second unverified)*. Delete behavior of the foreign keys is [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships").

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `Video`, `VideoData`, `DataSet`, `User`
  - [labelbee/database/annotation/model.py](../../../labelbee/database/annotation/model.py): `VideoData`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [ENT-005](view_entities.md#ent-005-dataset "Dataset"), [BEH-128](#beh-128-roles-and-permissions-model "Roles and permissions model"), [BEH-155](#beh-155-delete-behavior-of-foreign-keys-and-orm-relationships "Delete behavior of foreign keys and ORM relationships"), [DEBT-115](view_debt.md#debt-115-dead-duplicated-or-inconsistent-backend-code "Dead, duplicated or inconsistent backend code"), [OQ-107](../../QUESTIONS.md#oq-107 "Size limits and tag-record storage of annotation records")

## BEH-152: How the annotator uses the server for annotations

Summary of the browser-side contract of [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save") (details in [BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)") to [BEH-147](#beh-147-api-delete-annotation-record "API delete annotation record")): (1) to save, `eventsToServer` POSTs a whole snapshot ([BEH-144](#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)")); there is no autosave or update-in-place on the server; (2) to load, the user picks a `data_type` (`tag` / `event`), the dialog calls the list ([BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)")), then the chosen record is fetched by id ([BEH-145](#beh-145-api-load-one-annotation-record-server-load-step-2 "API load one annotation record (server load, step 2)")); the remembered `basedOn` id of the last loaded record is sent as `created_from_id` at the next save; (3) the gallery and `#video_data=<id>` deep links load a record by id without the dialog; (4) the Save/Load controls are enabled only when `whoami` reports an authenticated user (class `.require-server`). The server never validates or parses the `data` content.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`, `FromServerDialog`, `loadEventsFromServerByID`, `whoami`
- **Links:** [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [BEH-143](#beh-143-api-list-annotation-records-server-load-step-1 "API list annotation records (server load, step 1)"), [BEH-144](#beh-144-api-save-annotation-snapshot-server-save "API save annotation snapshot (server save)"), [BEH-145](#beh-145-api-load-one-annotation-record-server-load-step-2 "API load one annotation record (server load, step 2)"), [SEAM-101](view_seams.md#seam-101-browser-to-rest-api-contract "Browser to REST API contract")

## BEH-153: Extensions, CSRF mode and blueprint registration

After config is loaded, `create_app` does in this order: sets `WTF_CSRF_ENABLED=False` when `app.testing` (CSRF off in tests); creates a local `Marshmallow(app)`; `db.init_app`, `ma.init_app` (on that local object), `Migrate(app, db)`, `csrf.init_app`; registers the Jinja global `bootstrap_is_hidden_field` (true for WTForms `HiddenField`); registers blueprints in this order: `auth`, `admin`, `home`, `gallery`, `labelbee`, `download`, `api`; exempts the `api` blueprint from CSRF ([BEH-104](#beh-104-csrf-protection-policy "CSRF protection policy")); creates the Flask-User `UserManager(app, db, User)` (the default one: `CustomUserManager` and `MyRegisterForm` in `labelbee/models.py` are not used). The `Marshmallow` object that the schemas import (module-level `ma` in `labelbee/app.py`) is a different object that is never initialised with the app ([DEBT-122](view_debt.md#debt-122-two-marshmallow-objects-the-one-used-by-the-schemas-is-never-initialised "Two `Marshmallow` objects, the one used by the schemas is never initialised")). All blueprints except `api` (`/api/v1`) and `download` (`/data`) use `url_prefix` `''` or `'/'`, so their routes are at the site root.

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** essential
- **Code:**
  - [labelbee/app.py](../../../labelbee/app.py): `create_app`, `db`, `ma`, `csrf`
- **Links:** [BEH-101](#beh-101-application-factory-and-logging "Application factory and logging"), [BEH-104](#beh-104-csrf-protection-policy "CSRF protection policy"), [BEH-121](#beh-121-self-registration-page "Self-registration page"), [DEBT-107](view_debt.md#debt-107-security-hygiene-csrf-exemption-secrets-in-log-committed-credential "Security hygiene: CSRF exemption, secrets in log, committed credential"), [DEBT-122](view_debt.md#debt-122-two-marshmallow-objects-the-one-used-by-the-schemas-is-never-initialised "Two `Marshmallow` objects, the one used by the schemas is never initialised")

## BEH-154: Gallery POST handlers apply the profile form to the current user

Every gallery handler that accepts POST builds a `UserProfileForm(obj=current_user)` (required `first_name` and `last_name`; fields missing from the posted form keep the user's values, so the form validates only if the user already has both names *(library, WTForms)*). On a POST whose form validates, the handler copies the form onto the current user (`form.populate_obj(current_user)`) and commits, then performs its own action; on an invalid form it skips the action and renders the page again (HTTP 200, no message). Per route, the action and the redirect after a valid POST: `/add_dataset` creates the dataset, redirects to `/datasets` ([BEH-110](#beh-110-new-dataset-form "New dataset form")); `/delete_dataset` (admin) deletes the dataset, redirects to `/datasets`, an invalid POST ends in the template error of [BEH-111](#beh-111-delete-dataset-route "Delete dataset route"); `/videos` nothing, redirects to `/videos` without parameters ([BEH-112](#beh-112-videos-page-list-of-videos-optionally-of-one-dataset "Videos page (list of videos, optionally of one dataset)")); `/edit_video` (admin) edits the video, redirects to `/videodata?videoid=<video>` ([BEH-117](#beh-117-edit-video-page-admin "Edit video page (admin)")); `/videodata` nothing, redirects to `/videodata` without parameters ([BEH-114](#beh-114-video-detail-page-videodata "Video detail page (`/videodata`)")); `/video_data_details` nothing, redirects to `/video_data_details` without parameters ([BEH-116](#beh-116-annotation-record-details-page "Annotation record details page")); `/edit_dataset` (admin) edits the dataset, redirects to `/videos?dataset=<dataset>` ([BEH-118](#beh-118-edit-dataset-page-admin "Edit dataset page (admin)")). `/datasets` is the exception: any POST only redirects to `/datasets`, with no copy and no commit ([BEH-109](#beh-109-datasets-list-page "Datasets list page")). `/user/profile` is the only handler where the profile copy is the purpose ([BEH-122](#beh-122-user-profile-page "User profile page")).

- **Group:** [CAP-101](view_capabilities.md#cap-101-dataset-and-video-pages "Dataset and video pages")
- **Origin:** accident
- **Code:**
  - [labelbee/blueprints/gallery/gallery.py](../../../labelbee/blueprints/gallery/gallery.py): `add_dataset_page`, `delete_dataset`, `videos_page`, `edit_video_page`, `video_data_page`, `video_data_details_page`, `edit_dataset_page`, `datasets_page`
  - [labelbee/models.py](../../../labelbee/models.py): `UserProfileForm`
- **Links:** [BEH-109](#beh-109-datasets-list-page "Datasets list page"), [BEH-110](#beh-110-new-dataset-form "New dataset form"), [BEH-111](#beh-111-delete-dataset-route "Delete dataset route"), [BEH-112](#beh-112-videos-page-list-of-videos-optionally-of-one-dataset "Videos page (list of videos, optionally of one dataset)"), [BEH-114](#beh-114-video-detail-page-videodata "Video detail page (`/videodata`)"), [BEH-117](#beh-117-edit-video-page-admin "Edit video page (admin)"), [BEH-118](#beh-118-edit-dataset-page-admin "Edit dataset page (admin)"), [BEH-122](#beh-122-user-profile-page "User profile page"), [DEBT-112](view_debt.md#debt-112-edit-video-page-defects "Edit video page defects"), [DEBT-123](view_debt.md#debt-123-gallery-post-handlers-copy-the-profile-form-onto-the-current-user "Gallery POST handlers copy the profile form onto the current user"), [OQ-108](../../QUESTIONS.md#oq-108 "Do gallery form POSTs have to copy the profile names onto the current user?")

## BEH-155: Delete behavior of foreign keys and ORM relationships

Database level (declared in `labelbee/models.py`): `video_data.video_id` references `videos.id` with `ON DELETE CASCADE`; `video_data.created_by_id` and `data_set.created_by` reference `users.id` with `ON DELETE CASCADE`; `video_data.created_from_id` references `video_data.id` with no `ondelete`. `videos.dataset` references `data_set.id` with `ON DELETE CASCADE`; `users_roles.user_id` and `role_id` reference users and roles with `ON DELETE CASCADE`. ORM level: the relationships `DataSet.videos` (backref `Video.data_set`), `VideoData.video` (backref `Video.video_data`), `VideoData.created_by` (backref `User.video_data`) and `DataSet.creator` (backref `User.data_set`) declare no cascade option. Deleting a parent through the ORM session (`delete_dataset_by_id`, `delete_video`) therefore follows SQLAlchemy's default: loaded children get their foreign key set to NULL instead of being deleted *(library, not run)*, so the database-level cascade only acts on deletions made outside the ORM (for example raw SQL). The self reference `created_from_id` blocks deletion of a record that is the parent of another one (database dependent).

- **Group:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
- **Origin:** accident
- **Code:**
  - [labelbee/models.py](../../../labelbee/models.py): `Video`, `VideoData`, `DataSet`, `User`
  - [labelbee/database/dataset/api.py](../../../labelbee/database/dataset/api.py): `delete_dataset_by_id`
- **Links:** [BEH-137](#beh-137-api-delete-video "API delete video"), [BEH-142](#beh-142-api-delete-dataset "API delete dataset"), [BEH-147](#beh-147-api-delete-annotation-record "API delete annotation record"), [BEH-151](#beh-151-persistent-records-and-constraints "Persistent records and constraints"), [DEBT-115](view_debt.md#debt-115-dead-duplicated-or-inconsistent-backend-code "Dead, duplicated or inconsistent backend code")
