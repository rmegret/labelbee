from labelbee.models import User, Role, UsersRoles
from labelbee.init_app import db, app, logger
from typing import Tuple
from datetime import datetime


def import_users(csv_file: str) -> None:
    with app.app_context():
        with open(csv_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                (
                    id,
                    email,
                    confirmed_at,
                    password,
                    is_active,
                    first_name,
                    last_name,
                    studentnum,
                    clase,
                ) = line.split(",")
                create_user(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password=password,
                )


def change_user_role(user_id: int, role_id: int) -> None:
    user = User.query.get(user_id)
    role = Role.query.get(role_id)
    user.role = role
    db.session.commit()


def create_user(
    first_name: str, last_name: str, email: str, password: str, role_id: int = 2
) -> User:
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=app.user_manager.hash_password(password),
        active=True,
        email_confirmed_at=datetime.utcnow(),
    )
    db.session.add(user)
    role = Role.query.get(role_id)
    user_role = UsersRoles(user_id=user.id, role_id=role.id)
    db.session.add(user_role)
    db.session.commit()
    return user


def edit_user(user_info) -> None:
    '''
    user_info should be a dictionary
    field types:
        id: int
        email: string
        first_name: string
        last_name: string
        password: string
        studentnum: string
        clase: string
        active: boolean
        roles: [int]  (list of role ids)
    '''
    user = User.query.get(user_info['id'])
    # Change user's information
    # If empty field, reuse old information
    user.email = user_info['email'] if user_info['email'] else user.email
    user.first_name = user_info['first_name'] if user_info['first_name'] else user.first_name
    user.last_name = user_info['last_name']if user_info['last_name'] else user.last_name
    user.password = (
        app.user_manager.hash_password(user_info['password']) if user_info['password'] else user.password
    )
    user.studentnum = user_info['studentnum'] if user_info['studentnum'] else user.studentnum
    user.clase = user_info['clase'] if user_info['clase'] else user.clase
    user.active = user_info['active'] if isinstance(user_info['active'], bool)  else user.active
    
    # Replace user's roles
    for role in UsersRoles.query.filter(UsersRoles.user_id==user_info['id']):
        db.session.delete(role)
    for role_id in user_info['roles']:
        role = UsersRoles(user_id=user_info['id'], role_id=role_id)
        db.session.add(role)
    success = True
    try:
        db.session.commit()
    except:
        success = False
    return success
