from pathlib import Path
import json
from flask import Blueprint, jsonify, render_template, request, redirect, url_for, current_app, session, make_response
from flask_login import LoginManager, login_user, logout_user, login_required
from flask_bcrypt import Bcrypt
from fresfolio.utils.classes import AppUtils, User, ProjectsUtils
from fresfolio.utils import tools
import datetime
from fresfolio.main import app

coreroutes = Blueprint('coreroutes', __name__)
AU = AppUtils()
PUTL = ProjectsUtils()
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    row = AU.get_user_by_id(user_id)
    if row:
        return User(id=row[0], username=row[1])
    return None

@coreroutes.route('/', methods=['GET'])
@tools.conditional_login_required()
def app_index():
    return render_template('projects.html', projectIDLoad="", projectNameLoad="", userBroadcasts=current_app.config['user_broadcasts'])

@coreroutes.route('/fresfolio/load/<project>', methods=['GET'])
@tools.conditional_login_required()
def app_load_project(project):
    if PUTL.project_exists(project):
        projectID = tools.get_project_ID_based_on_name(project)
        return render_template('projects.html', projectIDLoad=projectID, projectNameLoad=project, userBroadcasts=current_app.config['user_broadcasts'])
    return render_template('projects.html', projectIDLoad="", projectNameLoad="", userBroadcasts=current_app.config['user_broadcasts'])

@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data['username']
        password = data['password']

        try:
            username = username.lower()
            user = AU.get_user_by_username(username)
        except Exception as error:
            print(error)
            return "", 400

        if user:
            userID, username, userPassword = user
        else:
            return "", 400
        session['username'] = username

        if bcrypt.check_password_hash(userPassword, password):
            user = User(id=userID, username=username)
            login_user(user, remember=True)
            session.permanent = True 
            app.config['SESSION_PERMANENT'] = True
            app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=30)
            app.config['REMEMBER_COOKIE_DURATION'] = datetime.timedelta(days=30)
            return "", 200
        else:
            return "", 401
    else:
        return render_template('login.html'), 200

@app.route('/logout')
def logout():
    logout_user()
    session.clear()
    response = make_response(redirect(url_for('login')))
    response.delete_cookie("remember_token")
    return response

