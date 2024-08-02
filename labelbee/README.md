# app directory

This directory contains the Flask application code.

The code has been organized into the following directories:

    # Code directories
    blueprints - contains the routes of the application
        1. admin - manages the views and python methods related to the admin panel
        2. api - rest api built using flask restful that serves the labelbee single page app
        3. auth - uses and builds on the flask user library. Manages user signin, login and logout methods
        4. download - Manages video serving route 
        5. gallery - Manages data gallery page in 
        6. home - Manages labelbee 
        7. labelbee - Manages labelbee single page app routes
    
    database - contains api code that abstracts database usage
        1. annotation
        2. dataset
        3. user
        4. video

    legacy - contains legacy views just in case. This is no longer used

    middlewares - contains reverse proxy middleware

    schemas - containes marshmallow schemas used by the blueprints

    settings - contains settings files used by the application

    static - contains css, static content and the js code that runs the labelbee single page app

    templates - contains common templates used accross the application

    app.py - code that runs the application server

    models.py - contains the database models along with forms and the user manager

