# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>


from flask import redirect, render_template, render_template_string, Blueprint,jsonify
from flask import request, url_for
from flask_user import current_user, login_required, roles_accepted
from app.init_app import app, db
import os 
from datetime import datetime
from app.models import UserProfileForm
import json
import pandas as pd
import numpy as np


upload_dir = "app/static/upload/"


### Enable range requests 
### https://blog.asgaard.co.uk/2012/08/03/http-206-partial-content-for-flask-python

import mimetypes
import re

from flask import request, send_file, Response, safe_join, send_from_directory
from werkzeug.exceptions import BadRequest, NotFound

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

@app.route('/data')
def send_data_():
    path=''
    print('Handling file request PATH='+path)
    return send_from_directory_partial('static/data/',path)


# The Home page is accessible to anyone
@app.route('/home')
def home_page():
    return render_template('pages/home_page.html')

@app.route('/')
def home():
    return render_template('pages/home.html')


# The User page is accessible to authenticated users (users that have logged in)
@app.route('/user')
@login_required  # Limits access to authenticated users
def user_page():
    
    try: 
        os.makedirs(upload_dir+str(current_user.id))
    except: 
        pass
    #tracks = os.listdir('app/upload/'+ str(current_user.id))
    #string = "<HTML>"

    #for i in tracks:
        #print(url_for('loadtrack', user = str(current_user.id),filename = i))
        #string += "<a href =  " + str(url_for('loadtrack', user = str(current_user.id),filename = i)) + ">"+ i + "</a> <br>" 
        #print (string)
    #print (string)
    #string += "</HTML>"

    
    return render_template('pages/user_page.html',userid= str(current_user.id))

@app.route('/login')
def login():
    return render_template('pages/login.html')


# The Admin page is accessible to users with the 'admin' role
@app.route('/admin')
@roles_accepted('admin')  # Limits access to users with the 'admin' role
def admin_page():
    return render_template('pages/admin_page.html')

@app.route('/savetojson',methods=['POST', 'GET'])
@login_required
def json_to_server():
    if request.method=='POST':
        data = request.get_json()
        timestamp = str(datetime.utcnow()).replace(" ","")
        jsonfile = upload_dir + str(current_user.id)+'/tracks'+timestamp+'.json'
        print('json_to_server: Saving JSON to file "{}":\njson={}'.format(jsonfile,data))

#         try: 
#             os.makedirs(upload_dir+str(current_user.id))
#         except: 
#             pass

        with open(jsonfile, 'w') as outfile:
            json.dump(data, outfile)
        return ("ok")
    else:
        return ("error")
#This function loads the json stored in app/static/upload/
@app.route('/load_json/<item>', methods=['POST','GET'])
@login_required
def load_json(item):
    filename='app/static/upload/'+str(current_user.id)+'/'+item
    print(os.path.isfile(filename))
    #file = pd.read_json()
    with open(filename, 'r') as f:
        data = f.read()
    
    print('load_json: data={}'.format(data))
    return data 

@app.route ('/tracks', methods =['GET'])
@login_required
def Track_list():
    tracks = os.listdir('app/upload/'+ str(current_user.id))
    string = "<HTML>"

    for i in tracks:
        print(url_for('loadtrack', user = str(current_user.id),filename = i))
        string += "<a href =  " + str(url_for('loadtrack', user = str(current_user.id),filename = i)) + ">"+ i + "</a> <br>" 
        #print (string)
    print (string)
    string += "</HTML>"

    return string

@app.route ('/loadtrack/<user>/<filename>', methods = ['GET'])
@login_required
def loadtrack(user,filename):
    data=load_json(filename)
    print('loadtrack: Sending JSON from file "{}":\njson={}'.format(filename,data))
    return data

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


#work done wednesday 
@app.route('/loadlist', methods=['GET','POST'])
@login_required
def modal_view(): 
    tracks = os.listdir('app/static/upload/'+ str(current_user.id))
    string = ""

    for i in tracks:
        print(url_for('loadtrack', user = str(current_user.id),filename = i))
        #string += "<button onclick ='" str(url_for('loadtrack', user = str(current_user.id),filename = i)) + "'>"+ i + "</button>" 
        print(i.replace(" ","%"))
        string += "<button onclick =" +"jsonFromServer('loadtrack/"+str(current_user.id) + "/"+str(i).replace(" ","") + "')>" + str(i)+" </button> <br>"

    print (string)
    
    return jsonify( {'data': string})

#@app.route('/loadlisttest', methods=['GET','POST'])
#@login_required
#def loadlist():

    #tracks =  os.listdir('app/static/upload/'+ str(current_user.id))

    #return jsonify(tracks)