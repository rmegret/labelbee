# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>


from flask import redirect, render_template, render_template_string, Blueprint,jsonify
from flask import request, url_for
from flask_user import current_user, login_required, roles_accepted
from app.init_app import app, db
import os 
from datetime import datetime
from app.models import UserProfileForm, User
import json
import pandas as pd
import numpy as np
import re


upload_dir = "app/static/upload/"


### Enable range requests 
### https://blog.asgaard.co.uk/2012/08/03/http-206-partial-content-for-flask-python

import mimetypes
import re

from flask import request, send_file, Response, safe_join, send_from_directory
from werkzeug.exceptions import BadRequest, NotFound, Forbidden

@app.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response

def dir_listing(path):
    BASE_DIR = ''

    # Joining the base and the requested path
    abs_path = os.path.join(BASE_DIR, path)

    # Return 404 if path doesn't exist
    if not os.path.exists(abs_path):
        return abort(404)

    # Check if path is a file and serve
    if os.path.isfile(abs_path):
        return abort(406)
        #return send_file(abs_path)

    # Show directory contents
    files = os.listdir(abs_path)
    return render_template('pages/files.html', files=files)

def send_from_directory_partial(directory, filename):
    """ 
        Simple wrapper around send_file which handles HTTP 206 Partial Content
        (byte ranges)
        TODO: handle all send_file args, mirror send_file's error handling
        (if it has any)
    """
    
    path = safe_join(directory, filename)
    if not os.path.isabs(path):
        path = os.path.join(app.root_path, path)
        
    print('send_from_directory_partial: looking for path="'+path+'"...')

    try:
        if os.path.isdir(path):
            print('Found directory '+path)
            return dir_listing(path)
        elif not os.path.isfile(path):
            print('NotFound: '+path)
            raise NotFound()
    except (TypeError, ValueError):
        raise BadRequest()
    
    range_header = request.headers.get('Range', None)
    if not range_header: 
        print('send_from_directory_partial: REQUEST "'+filename+'" norange')
        print('  send_from_directory: '+directory+','+filename+'"')
        return send_from_directory(directory, filename)
    else:
        print('send_from_directory_partial: REQUEST "'+filename+'" range='+range_header)
    
    
    print('send_from_directory_partial: MIME='+mimetypes.guess_type(path)[0])
    
    size = os.path.getsize(path)    
    byte1, byte2 = 0, None
    
    m = re.search('(\d+)-(\d*)', range_header)
    g = m.groups()
    
    if g[0]: byte1 = int(g[0])
    if g[1]: byte2 = int(g[1])

    length = size - byte1
    if byte2 is not None:
        length = byte2 - byte1 + 1
        
    maxlength = 8*1024*1024 # (8MB chunks)
    if (length>maxlength):
        length=maxlength
    byte2 = byte1 + length - 1
    
    data = None
    with open(path, 'rb') as f:
        f.seek(byte1)
        data = f.read(length)

    rv = Response(data, 
        206,
        mimetype=mimetypes.guess_type(path)[0], 
        direct_passthrough=True)
    rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(byte1, byte2, size))

    print('send_from_directory_partial: SENT range={0}-{1}/{2}'.format(byte1,byte2,size))

    return rv


@app.route('/data/<path:path>')
def send_data(path):
    print('Handling file request PATH='+path)
    return send_from_directory_partial('static/data/',path)

@app.route('/data/')
def send_data_():
    path=''
    print('Handling file request PATH='+path)
    return send_from_directory_partial('static/data/',path)


# The Home page is accessible to anyone
@app.route('/')
def home_page():
    return render_template('pages/home_page.html')

#@app.route('/')
#def about():
#    return render_template('pages/about.html')


# The User page is accessible to authenticated users (users that have logged in)
@app.route('/user')
@login_required  # Limits access to authenticated users
def user_page():
        
    return render_template('pages/user_page.html',userid= str(current_user.id))

# The User page is accessible to authenticated users (users that have logged in)
@app.route('/labelbee/gui')
#@login_required  # Limits access to authenticated users
def labelbee_user_page():
    
    if (current_user.is_authenticated):
        try: 
            os.makedirs(upload_dir+str(current_user.id))
        except: 
            pass
    
        return render_template('pages/labelbee_page.html',userid= str(current_user.id))
    else:
        return render_template('pages/labelbee_page.html',userid='anonymous')


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
    

#@app.route('/login')
#def login():
#    return render_template('pages/login.html')

@app.route('/ajaxlogin', methods=['POST'])
def ajaxlogin():
    user = request.args.get('user')
    #login_user(user)
    raise BadRequest("Ajax login not implemented")


# The Admin page is accessible to users with the 'admin' role
@app.route('/admin')
@roles_accepted('admin')  # Limits access to users with the 'admin' role
def admin_page():
    return render_template('pages/admin_page.html')


# REST API for events: /rest/events/
# GET list, POST new item, GET item

def parse_trackfilename(filename):
  m = re.search( r'(?P<video>C\d\d_\d{12})-(?P<timestamp>\d{12})', filename)
  if (m is None):
      return {'video':'unknown','timestamp':'unknown'}
  print('parse-trackfilename',m.groupdict())
  return m.groupdict()

# LIST
@app.route('/rest/events/', methods=['GET'])
def events_get_list(): 
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')

    format = request.args.get('format', 'html')
    video = request.args.get('video')

    user_ids = os.listdir('app/static/upload/')
    #user_ids = [str(current_user.id))]
    
    uri_list = []
    for user_id in user_ids:
        if (not os.path.isdir('app/static/upload/'+user_id)):
            continue
        tracks = os.listdir('app/static/upload/'+ user_id)
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
        print (string)
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
        
    filename='app/static/upload/'+user+'/'+trackfile
    print(os.path.isfile(filename))

    with open(filename, 'r') as f:
        data = f.read()
    
    print('loadtrack: Sending JSON from file "{}":\njson={}'.format(filename,data))
    return data
    
@app.route('/rest/events/self/<trackfile>', methods=['GET'])
def load_json(trackfile):
    if (not current_user.is_authenticated):
        raise Forbidden('/rest/events GET: login required !')
        
    return loadtrack(str(current_user.id),trackfile)





@app.route('/pages/profile', methods=['GET', 'POST'])
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
