# MEMO routing for labelbee webapp

Overview of 
------------

Client <---> httpd <---> gunicorn <--> flask app

Apache `httpd` Web Server serves on `http://labelbee.hpcf.upr.edu:80/webapp`. It serves the heavy static files directly, and routes the dynamic content to flask through a reverse proxy.

`gunicorn` provides the WSGI HTTP server that serves the flask app at `127.0.0.1:5000`. It launches the app through `manage.py`.

Some difficulties arise as we want to serve the flask app on a subdomain, need to rewrite all URL and links with the prefix `webapp`. This is done in:

- Flask by using `ReverseProxied` addon that reads the change from HTTP headers
- JS by calling `url_for(local_path)` that uses global variable `http_script_name` set by Flask

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


Apache Config
-------------

Main config `httpd.conf`

```
LoadModule proxy_module lib/apache2/modules/mod_proxy.so
LoadModule proxy_http_module lib/apache2/modules/mod_proxy_http.so
LoadModule unixd_module lib/apache2/modules/mod_unixd.so
LoadModule alias_module lib/apache2/modules/mod_alias.so

<IfModule unixd_module>
User flaskuser
Group _www
</IfModule>

ServerName replaceByActualName.hpcf.upr.edu:80

# Virtual hosts
Include etc/apache2/extra/httpd-vhosts.conf
```

Virtual host config `extra/httpd-vhosts.conf`

```
Listen 8000
<VirtualHost *:8000>
    ProxyPreserveHost On

    <Proxy *>
        Order deny,allow
        Allow from all
        Authtype Basic
        Authname "Password Required"
        AuthUserFile ~flaskadmin/.htpasswd
        Require valid-user
    </Proxy>

    ProxyPass /data !
    ProxyPass /labelbee http://localhost:5000/ retry=0 timeout=5
    ProxyPassReverse /labelbee http://localhost:5000/
    ProxyBadHeader Ignore

Alias /data /var/www/html/demo/data

<Directory "/var/www/html/demo/data"> 

Options +Indexes +FollowSymLinks
AllowOverride None
Require all granted
</Directory>

    TimeOut 2400
    ProxyTimeout 2400

    SetEnv proxy-initial-not-pooled 1
</VirtualHost>
