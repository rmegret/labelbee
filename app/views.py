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
        os.makedirs("app/static/upload/"+str(current_user.id))
    except: 
            pass
    tracks = os.listdir('app/static/upload/'+ str(current_user.id))
    string = "<HTML>"

    for i in tracks:
        print(url_for('loadtrack', user = str(current_user.id),filename = i))
        string += "<a href =  " + str(url_for('loadtrack', user = str(current_user.id),filename = i)) + ">"+ i + "</a> <br>" 
        #print (string)
    print (string)
    string += "</HTML>"

    
    return render_template('pages/user_page.html', tracks= tracks,userid= str(current_user.id))

@app.route('/login')
def login():
    return render_template('pages/login.html')


# The Admin page is accessible to users with the 'admin' role
@app.route('/admin')
@roles_accepted('admin')  # Limits access to users with the 'admin' role
def admin_page():
    return render_template('pages/admin_page.html')

@app.route('/ajaxcalc',methods=['POST', 'GET'])
@login_required
def json_to_server():
    if request.method=='POST':
        data=request.get_json()
        print(data)
        with open('app/static/upload/'+ str(current_user.id)+'/tracks'+str(datetime.utcnow())+'.json', 'w') as outfile:
            json.dump(data, outfile)
        return ("ok")
    else:
        return ("error")
#This function loads the json stored in app/static/upload/
@app.route('/load_json/<item>', methods=['POST','GET'])
@login_required
def load_json(item):
    print(os.path.isfile('app/static/upload/'+str(current_user.id)+'/'+item))
    file = pd.read_json('app/static/upload/'+str(current_user.id)+'/'+item)
    return file.to_json() 

@app.route ('/tracks', methods =['GET'])
@login_required
def Track_list():
    tracks = os.listdir('app/static/upload/'+ str(current_user.id))
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
    return load_json(filename)






@app.route('/pages/profile', methods=['GET', 'POST'])
@login_required
def user_profile_page():
    # Initialize form
    form = UserProfileForm(request.form, current_user)

    

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
