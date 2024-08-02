# Introduction


This directory contains the Labelbee Flask application code. Labelbee is a web application for annotation of videos. It is comprised of a server side rendering portion that containes the users, admin, home page and data gallery views. The video annotation view is a single page app that communicates with the server via a REST Api. This readme contains an explanation of how to run the application, the code structure and todos. 


## How to run   

1. Create an .env file using the .example.env file as an example
2. In the root directory, `run docker-compose up -d`. This will create the mysql database instance in the docker 
3. `cd labelbee/`
4. Run `python -m venv venv` to create a virtual environment
5. Run `pip install -r requirements.txt` to download all the dependencies
6. Run `flask db init` to initialize the db
7. Run `flask db upgrade` to migrate the database
8. Run `flask run`

## Code organization
The code has been organized into the following directories:

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


## Rest API

Since Labelbee 


# TODOS:


## Infrastructure

1. Dockerize app. Blocker: There are packages that depend on different parts of 

## Backend



## Frontend

1. Organize the frontend. There are different folder that can be consolidated into a single folder.

    - There are three different css files in the /static folder. One is related to the 
    - There are 2 different extern js folders inside the /static folder.
    - There are 2 different fonts folders
    - There are 2 different images folders inside the /static folder

2. Organize Labelbee single app code. This is contained inside /static/labelbee/js. There are various files with about ~1000 lines of js. These need to be modularized, organized, documented and pruned to remove unused code. The files are the following with a brief description.

    - AnnotationIO.js-
    - ChronoAxes.js - 
    - ChronoControl.js - 
    - labelBee.js -
    - Model.js -
    - OverlayControl.js -
    - SelectionControl.js -
    - VideoControl.js -
    - VideoList.js -
    - Zoomview.js -

3. 