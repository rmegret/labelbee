# MEMO deployment of labelbee webapp

Overview
------------

### Server config

```
Client <---> https <---> gunicorn (flask app)

httpd serves at:    https://bigdbee.hpcf.upr.edu:80/webapp/
gunicorn serves at: http://127.0.0.1:8080/
```

Apache `httpd` Web Server serves on `http://labelbee.hpcf.upr.edu:80/webapp/` (the final slash is required). It serves the heavy static files directly, and routes the dynamic content to gunicorn/flask through a reverse proxy. 

`gunicorn` provides the WSGI HTTP server that serves the flask app at `127.0.0.1:8080`. It launches the app through `manage.py`.

The static files are are served directly by `httpd` from `/var/www/flask/labelbee/labelbee/static/data`. This directory contains some symbolic links:

```
/var/www/flask/labelbee/labelbee/static/data -> /var/www/html/demo/data
/var/www/html/demo/data/videos -> /videos
```

### Start/Stop services

`httpd` is started automatically by Sys-V `init.d` service:

```
sudo apachectl start
sudo apachectl stop
sudo apachectl restart
sudo apachectl configtest
```

`gunicorn` runs as user `flaskuser`. It can be started and stopped with custom scripts (still alpha quality):

```
sudo -u flaskuser /var/www/flask/gunicorn_start.sh
sudo -u flaskuser /var/www/flask/gunicorn_stop.sh
```

`postfix` mail server installed to let flask send email for user registration and password recovery. 
[How To Install Postfix](https://www.digitalocean.com/community/tutorials/how-to-install-postfix-on-centos-6)


WebApp routing
----------------

### Note 

All routes are relative to the webapp subdomain prefix. For instance, if the app is served in subdomain `/webapp/`, route `/user` actually corresponds to client visible URL `https://labelbee.hpcf.upr.edu:80/webapp/user` proxied to local `http://127.0.0.1:8080/user`.

If we want to serve the flask app on a subdomain, the whole webapp need to rewrite all URL and links with the prefix. This is done in:

- Flask by using `ReverseProxied` addon that reads the change from HTTP headers
- JS by calling `url_for(local_path)` that uses global variable `http_script_name` set by Flask. If run outside of flask, `http_script_name` defaults to `/`.

### Route overview

| Route     | Description    |
| --------- | --- |
| **Pages** | **Flask page**
| /               | Home page |
| /user           | Page for logged in users |
| /admin          | Page for administration | |
| /labelbee/gui   | single page WebApp |
| |
| **REST API** | **Flask GET/POST**
| /rest/*         | REST API for the WebApp |
| |
| **Static**   | **Static content**
| /labelbee/* (js,css,fonts,images)    | Flask: /static/labelbee/* |
| /* (bootstrap, upload, css, data)    | Flask: /static/*
| /data     | Apache: external data folder for video and tags |
| /upload   | Apache: /static/upload  |

### REST API

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
