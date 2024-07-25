from flask_restful import Resource
from labelbee.models import User
from flask import request
from flask_login import logout_user, login_user, logout_user
from flask import current_app
from flask_wtf.csrf import generate_csrf
from labelbee.app import csrf
from flask_user import current_user

class Login(Resource):
    def post(self):
        email = request.form.get("email")
        password = request.form.get("password")

        user = User.query.filter_by(email=email).first()

        def check_password(user, password):
            return current_app.user_manager.verify_password(password, user.password)

        # Login fail
        if user is None or not check_password(user, password):
            return {
                    "request": "login",
                    "email": email,
                    "status": "FAIL",
                    "message":"Incorrect credentials. Please try again."
                }
            

        # login and return token
        login_user(user)
        return {
            "request": "login",
            "email": email,
            "status": "SUCCESS",
            "csrf_token": generate_csrf(),
        }
    
    def get(self):
        if not current_user.is_authenticated:
            return {
                    "request": "logout",
                    "status": "FAIL",
                }
            
  
        logout_user()
        return {
                "request": "logout",
                "status": "SUCCESS",
            }
    

class Logout(Resource):
    def post(self):
        if not current_user.is_authenticated:
            return {
                    "request": "logout",
                    "status": "FAIL",
                }
            
  
        logout_user()
        return {
                "request": "logout",
                "status": "SUCCESS",
            }
    
class Whoami(Resource):
    def get(self):
        if current_user.is_authenticated:
            return {
                    "is_authenticated": current_user.is_authenticated,
                    "first_name": current_user.first_name,
                    "last_name": current_user.last_name,
                    "email": current_user.email,
                    "id": current_user.id,
                }
            
        else:
            return {"is_authenticated": current_user.is_authenticated}