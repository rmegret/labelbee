# MEMO routing for labelbee webapp

Overview of 
------------

Client <---> httpd <---> gunicorn <--> flask app

Apache `httpd` Web Server serves on `http://labelbee.hpcf.upr.edu:80`. It serves the heavy static files directly, and routes the dynamic content to flask through a reverse proxy.

`gunicorn` provides the WSGI HTTP server that serves the flask app at `127.0.0.1:5000`. It launches the app through `manage.py`.

WebApp routing
----------------

| Route     | Description    |
| --------- | --- |
| **>> Pages** | **Flask page**
| /               | Home page |
| /user           | Page for logged in users |
| /admin          | Page for administration | |
| /labelbee/gui   | single page WebApp |
| **>> REST API** | **Flask GET/POST**
| /rest/*         | REST API for the WebApp |
| **>> Static**   | **Static content**
| /labelbee/* (js,css,fonts,images)    | Flask: /static/labelbee/* |
| /* (bootstrap, upload, css, data)    | Flask: /static/*
| /data     | Apache: external data folder for video and tags |
| /upload   | Apache: /static/upload  |

REST API:

| Method    | URL    | Arguments | Description |
| --------- | --- | ------ | ----- |
| GET   | `/rest/auth/whoami` | | Information about current flask user |
| GET   | `/rest/events/`     | `video`, `format` | LIST event files for `video` |
| POST   | `/rest/events/`     | `video` | CREATE new event file for `video`, return URI to retrieve event file |
| GET   | `/rest/events/<user>/<trackfile>`     | | RETRIEVE event file |
| GET   | `/rest/events/self/<trackfile>`     | | RETRIEVE event file for current flask user |