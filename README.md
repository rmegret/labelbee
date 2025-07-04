#Labelbee docs


## Running the application

1. Create an .env file using the .example.env file as an example
2. In the root directory, `run docker-compose up -d`. This will create the mysql database instance in the docker 
3. `cd labelbee/`
4. Run `python -m venv venv` to create a virtual environment
5. Run `pip install -r requirements.txt` to download all the dependencies
6. Run `flask db init` to initialize the db
7. Run `flask db upgrade` to migrate the database
8. Run `flask run`

This should have the application up and running.


## Application Structure:

1. Home Page
2. Authentication
3. Datasets Page
4. Admin Page
5. Labelbee
6. Rest API


## Configuring the app

Before we can use this application, we will have to configure the database URL and SMTP account
that will be used to access the database and to send emails.

Settings common to all environments are found in `app/settings.py`. DO NOT store any security
settings in this file as it's going to be checked into the code repository.

Environment specific settings are stored in `app/local_settings.py` that is NOT stored in the code repository.
The example `app/local_settings_example.py` can be used as a starting point::

    cd ~/dev/my_app
    cp app/local_settings_example.py app/local_settings.py

Configure `app/local_settings.py`.

## Configuring the SMTP server

Edit ~/dev/my_app/app/env_settings.py.

Make sure to configure all the MAIL_... settings correctly.

Note: For smtp.gmail.com to work, you MUST set "Allow less secure apps" to ON in Google Accounts.
Change it in https://myaccount.google.com/security#connectedapps (near the bottom).

## Initializing the Database

    # Create DB tables and populate the roles and users tables
    python manage.py init_db


## Running the app

    # Start the Flask development web server
    python manage.py runserver

Point your web browser to http://localhost:5000/

You can make use of the following users:
- email `user@example.com` with password `Password1`.
- email `admin@example.com` with password `Password1`.


## Testing the app

    # Run all the automated tests in the tests/ directory
    ./runtests.sh         # will run "py.test -s tests/"


## Generating a test coverage report

    # Run tests and show a test coverage report
    ./runcoverage.sh      # will run py.test with coverage options


## Experimental features:

### gurabo4 tracks_tagged 

To load both video and tagged tracks:

In JS console:
```
videoname='7_02_R_190809100000.cfr.mp4'; 
videoManager.loadVideoManual(`/webapp-test/data/datasets/gurabo4/mp4/col10/${videoname}`);
loadTrackTaggedCSVFromServer(`/webapp-test/data/datasets/gurabo4/tracks/col10/${videoname}.tracks_tagged.csv`);
```