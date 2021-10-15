from labelbee.models import User, Role, UsersRoles
from labelbee.init_app import db, app
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


def edit_user(
    user_id: int,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    role_id: int,
) -> Tuple[User, UsersRoles]:
    user = User.query.get(user_id)
    user.first_name = first_name if first_name else user.first_name
    user.last_name = last_name if last_name else user.last_name
    user.email = email if email else user.email
    user.password = (
        app.user_manager.hash_password(password) if password else user.password
    )

    user_role = UsersRoles.query.filter_by(user_id=user_id).first()
    user_role.role_id = role_id
    db.session.commit()
    return user, user_role
