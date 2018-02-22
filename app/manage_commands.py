# This file defines command line commands for manage.py
#
# Copyright 2014 SolidBuilds.com. All rights reserved
#
# Authors: Ling Thio <ling.thio@gmail.com>

import datetime

from app.init_app import app, db, manager
from app.models import User, Role
import xlrd
import pandas as pd

@manager.command
def init_db():
    """ Initialize the database."""
    # Create all tables
    db.create_all()
    # Add all Users
    add_users()
    add_students()

def add_students():
    archivo = 'private/usuarios.xlsx'
    libro = xlrd.open_workbook(archivo)
    xlsx = pd.read_excel(libro, engine='xlrd')
    student_role = find_or_create_role('student', u'student')
    for i in range(len(xlsx)):
        student=  User.query.filter(User.email == xlsx["email"][i]).first()
        print(xlsx["email"][i])
        if not student:
             student = User(email=xlsx["email"][i],
                        first_name=xlsx["first_name"][i],
                        last_name=xlsx["last_name"][i],
                        password=app.user_manager.hash_password(str(xlsx["password"][i])),
                        active=True,
                        confirmed_at=datetime.datetime.utcnow(),
                        studentnum=xlsx["studentnum"][i],
                        clase=xlsx["clase"][i])
             student.roles.append(student_role)
             db.session.add(student)
    db.session.commit()
    return student

    

def add_users():
    """ Create users when app starts """


    # Adding roles
    admin_role = find_or_create_role('admin', u'Admin')

    # Add users
    user = find_or_create_user(u'Admin', u'Example', u'admin@example.com', 'Password1', admin_role)
    user = find_or_create_user(u'User', u'Example', u'user@example.com', 'Password1')

    # Save to DB
    db.session.commit()


def find_or_create_role(name, label):
    """ Find existing role or create new role """
    role = Role.query.filter(Role.name == name).first()
    if not role:
        role = Role(name=name, label=label)
        db.session.add(role)
    return role


def find_or_create_user(first_name, last_name, email, password, role=None):
    """ Find existing user or create new user """
    user = User.query.filter(User.email == email).first()
    if not user:
        user = User(email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=app.user_manager.hash_password(password),
                    active=True,
                    confirmed_at=datetime.datetime.utcnow())
        if role:
            user.roles.append(role)
        db.session.add(user)
    return user
