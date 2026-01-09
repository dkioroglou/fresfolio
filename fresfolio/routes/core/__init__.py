from flask import Blueprint, render_template
from fresfolio.utils.classes import ProjectsUtils
from fresfolio.utils import tools

coreroutes = Blueprint('coreroutes', __name__)
PUTL = ProjectsUtils()

@coreroutes.route('/', methods=['GET'])
def app_index():
    return render_template('projects.html', projectIDLoad="", projectNameLoad="")

@coreroutes.route('/fresfolio/load/<project>', methods=['GET'])
def app_load_project(project):
    if PUTL.project_exists(project):
        projectID = tools.get_project_ID_based_on_name(project)
        return render_template('projects.html', projectIDLoad=projectID, projectNameLoad=project)
    return render_template('projects.html', projectIDLoad="", projectNameLoad="")

