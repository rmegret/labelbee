# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>


from flask import redirect, Blueprint
from flask import render_template, render_template_string, Markup, jsonify
from flask import request, url_for
from flask_user import current_user, login_required, roles_accepted
from werkzeug.exceptions import BadRequest, NotFound, Forbidden

import os 
from datetime import datetime
import json
import pandas as pd
import numpy as np
import re

from labelbee.init_app import app, db
from labelbee.models import UserProfileForm, User

upload_dir = "labelbee/static/upload/"


# -------------------------------------------
# PAGES

# The Home page is accessible to anyone
@app.route('/')
def home_page():
    return render_template('pages/home_page.html')

# The User page is accessible to authenticated users (users that have logged in)
@app.route('/user')
@login_required  # Limits access to authenticated users
def user_page():
        
    return render_template('pages/user_page.html',userid= str(current_user.id))

@app.route('/user/profile', methods=['GET', 'POST'])
@login_required
def user_profile_page():
    # Initialize form
    form = UserProfileForm(obj=current_user)

    # Process valid POST
    if request.method == 'POST' and form.validate():
        # Copy form fields to user_profile fields
        form.populate_obj(current_user)

        # Save user_profile
        db.session.commit()

        # Redirect to home page
        return redirect(url_for('home_page'))

    # Process GET or invalid POST
    return render_template('pages/user_profile_page.html',
                           form=form)

@app.route('/labelbee/gui')
#@login_required  # Limits access to authenticated users
def labelbee_user_page():
    
    #print('SCRIPT_NAME=',request.environ.get('SCRIPT_NAME'))
    
    http_script_name = request.environ.get('SCRIPT_NAME')
    
    print('labelbee_user_page launched with http_script_name=',http_script_name)
    
    if (current_user.is_authenticated):
        try: 
            os.makedirs(upload_dir+str(current_user.id))
        except: 
            print('labelbee_user_page: could not create upload dir')
            pass
    
        return render_template('pages/labelbee_page.html',userid= str(current_user.id), http_script_name=http_script_name)
    else:
        return render_template('pages/labelbee_page.html',userid='anonymous', http_script_name=http_script_name)


# The Admin page is accessible to users with the 'admin' role
@app.route('/admin')
@roles_accepted('admin')  # Limits access to users with the 'admin' role
def admin_page():
    return render_template('pages/admin_page.html')

@app.route('/admin/version')
def version_page():
    import subprocess
    import shlex
    pwd = subprocess.check_output("pwd".split()).strip().decode()
    label = subprocess.check_output("git describe --always".split()).strip().decode()
    log = subprocess.check_output("git log -n 5".split()).strip().decode()
    hash = subprocess.check_output(shlex.split("git log --pretty=format:'%H' -n 1")).strip().decode()
    date = subprocess.check_output(shlex.split("git log --pretty=format:'%ci (%cr)' -n 1")).strip().decode()
    branch = subprocess.check_output("git rev-parse --abbrev-ref HEAD".split()).strip().decode()
    details = subprocess.check_output("git status".split()).strip().decode()

    text = '<h3>Labelbee WebApp version information:</h3>'
    text += ('\n<pre>pwd="'+pwd+'"</pre>')
    text += ('\n<h4>Current version</h4>\nBranch: <pre>'+branch+'</pre>'
              +'Commit date: <pre>'+date+'</pre>'
              +'Commit hash: <pre>'+hash+'</pre>')
    text += '\n<h4>Log (5 last commits)</h4>\n<pre>'+log+'</pre>'
    text += '\n<h4>Details status</h4>\n<pre>'+details+'</pre>'
    return render_template('pages/version_page.html',    
                           webapp_version=Markup(text))


# ---------------------------------------------------
# HEAVY STATIC CONTENT

# Note: special handling of partial request to access this static content
# is provided only for local debugging.
# These routes should be served directly by Apache in the production server

from labelbee.flask_range_requests import send_from_directory_partial, dir_listing

# Enable range requests 
# https://blog.asgaard.co.uk/2012/08/03/http-206-partial-content-for-flask-python
@app.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response

@app.route('/data/<path:path>')
def send_data(path):
    print('Handling file request PATH='+path)
    data_dir = os.path.join(app.root_path, 'static/data')
    return send_from_directory_partial(data_dir, path, '/data')

@app.route('/data/')
def send_data_():
    path=''
    print('Handling file request PATH='+path)
    data_dir = os.path.join(app.root_path, 'static/data')
    return dir_listing(data_dir, '', '/data')



# --------------------------------------
# REST API for authentification

@app.route('/rest/auth/login', methods=['POST'])
def ajaxlogin():
    user = request.args.get('user')
    #login_user(user)
    raise BadRequest("Ajax login not implemented")
    
@app.route('/rest/auth/whoami')
def whoami():
    if (current_user.is_authenticated):
      return jsonify({
                "is_authenticated": current_user.is_authenticated,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "email": current_user.email,
                "id": current_user.id
                      } )
    else:
      return jsonify({
                "is_authenticated": current_user.is_authenticated
                })

# --------------------------------------
# REST API for events: /rest/events/
# GET list, POST new item, GET item

def parse_trackfilename(filename):
  m = re.search( r'(?P<video>C\d\d_\d{12})-(?P<timestamp>\d{12})', filename)
  if (m is not None):
      return m.groupdict()
      
  m = re.search( r'(?P<video>C\d\d_\d{12})-Tracks-20(?P<timestamp1>\d{6})_(?P<timestamp2>\d{6}) - (?P<name>.*)\.json', filename)
  if (m is not None):
      d = m.groupdict()
      if (d.get('timestamp1') is not None and d.get('timestamp2') is not None):
          ts = d.get('timestamp1')+d.get('timestamp2')
      else:
          ts = None
      return {'video':d.get('video'),'timestamp':ts,
              'name':d.get('name')}
  
  return {'video':'unknown','timestamp':'unknown'}

# LIST
@app.route('/rest/events/', methods=['GET'])
def events_get_list(): 
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')

    format = request.args.get('format', 'html')
    video = request.args.get('video')

    user_ids = os.listdir('labelbee/static/upload/')
    #user_ids = [str(current_user.id))]
    
    uri_list = []
    for user_id in user_ids:
        if (not os.path.isdir('labelbee/static/upload/'+user_id)):
            continue
        tracks = os.listdir('labelbee/static/upload/'+ user_id)
        print('user_id=',user_id)
        user = User.query.filter_by(id=int(user_id)).first()
        print('user=',user)
        print('user.id=',user.id)
        print('user.first_name=',user.first_name)
        print('user.email=',user.email)
        for file in tracks:
            if file.split('.')[-1] != 'json': continue
            parsedfilename = parse_trackfilename(file)
            
            if (video is not None):
                if (parsedfilename.get('video') != video):
                    continue
            
            uri_list.append( {
                      'filename' : file,
                      'uri': url_for('loadtrack', 
                                user = user.id, trackfile = file),
                      'user_id': user.id,
                      'user_name': user.first_name+' '+user.last_name,
                      'user_email': user.email,
                      'timestamp': parsedfilename.get('timestamp'),
                      'video': parsedfilename.get('video')
                    } )
    uri_list = sorted(uri_list, key=lambda item: item['timestamp'])

    if (format=='html'):
        string= ""
        for item in uri_list:
            string += '<button onclick="jsonFromServer(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
        #print (string)
        result = {'data': string}
    elif (format=='json'):
        result = uri_list
    else:
        #abort('/rest/events GET: unrecognized format "{}"'.format(format))
        raise BadRequest('/rest/events GET: unrecognized format "{}"'.format(format))
    
    return jsonify( result )

# CREATE ITEM
@app.route('/rest/events/',methods=['POST'])
def events_post():
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')
        
    obj = request.get_json()
    #timestamp = str(datetime.utcnow()).replace(" ","")
    timestamp = datetime.now().strftime('%y%m%d%H%M%S')
    
    #print(obj)
    
    data = obj.get('data')
    video = obj.get('video', 'C00_000000000000')
    
    #path = str(current_user.id)+'/tracks'+timestamp+'.json'
    path = (str(current_user.id)+'/'
            +'{video}-{timestamp}.json'.format(video=video,timestamp=timestamp))
    
    jsonfile = upload_dir + path
    uri = "/rest/events/" + path
    
    print('json_to_server: Saving JSON to file "{}" (uri={}):\njson={}'.format(jsonfile,uri,data))

#         try: 
#             os.makedirs(upload_dir+str(current_user.id))
#         except: 
#             pass

    with open(jsonfile, 'w') as outfile:
        json.dump(data, outfile)
        
    return uri

# RETRIEVE ITEM    
@app.route ('/rest/events/<user>/<trackfile>', methods = ['GET'])
def loadtrack(user,trackfile):
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')
        
    filename='labelbee/static/upload/'+user+'/'+trackfile
    #print(os.path.isfile(filename))

    with open(filename, 'r') as f:
        data = f.read()
    
    #print('loadtrack: Sending JSON from file "{}":\njson={}'.format(filename,data))
    print('loadtrack: Sending JSON from file "{}"'.format(filename))
    return data
    
@app.route('/rest/events/self/<trackfile>', methods=['GET'])
def load_json(trackfile):
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')
        
    return loadtrack(str(current_user.id),trackfile)
