from fresfolio.main import app
from flask import Blueprint, jsonify, request, send_from_directory, current_app, session
from pathlib import Path
import json
from time import sleep
import contextlib
import sqlite3
from flask_login import login_required
import re
import traceback
from platform import system
import subprocess
from fresfolio.utils import tools
from fresfolio.utils.classes import AppUtils, UserUtils, ProjectsUtils

with app.app_context():
    if current_app.config['has_omilayers']:
        from omilayers import Omilayers
        import pandas as pd

    if current_app.config['has_omilayers'] and current_app.config['has_bokeh']:
        from fresfolio.plotting import omiplot

apiroutes = Blueprint('apiroutes', __name__)
AUTL = AppUtils()
USER = UserUtils()
PUTL = ProjectsUtils()
OSname = system().lower()

# USERS RELATED ROUTES
#========================
@apiroutes.route('/api/create-user', methods=['POST'])
def app_api_register_user():
    data = request.get_json()
    kwargs = {
            "username":data['username'],
            "password": AUTL.hash_password(data['password'])
            }
    if not AUTL.new_user_is_created(**kwargs):
        return '', 400
    return '', 200

@apiroutes.route('/api/get-users-exist', methods=['POST'])
def app_api_users_exist():
    if not AUTL.users_table_is_empty:
        return jsonify({"users_exist": 1}), 200
    return jsonify({"users_exist": 0}), 200


# PROJECTS RELATED ROUTES
#========================
@apiroutes.route('/api/create-project', methods=['POST'])
@tools.conditional_login_required()
def app_api_create_project():
    try:
        data = request.get_json()
        projectName = data['projectName']
        projectDescription = data['projectDescription']
        if PUTL.project_exists(projectName):
            return "Project exists.", 400
        if not PUTL.project_is_created(projectName, projectDescription):
            return "Error creating project.", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-projects', methods=['POST'])
@tools.conditional_login_required()
def app_api_fetch_projects():
    projects = PUTL.get_projects()
    return jsonify(projects)

@apiroutes.route('/api/get-notebooks', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_notebooks():
    data = request.get_json()
    projectID = data['projectID']
    try:
        projectNotebooks = PUTL.get_notebooks_and_chapters_for_project(projectID)
    except Exception:
        traceback.print_exc()
        return "", 400
    return jsonify(projectNotebooks)

@apiroutes.route('/api/create-notebook', methods=['POST'])
@tools.conditional_login_required()
def app_api_create_notebook():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookName = data['notebook']
        if PUTL.notebook_exists(projectID, notebookName):
            return "Notebook exists", 400
        if not PUTL.notebook_is_created(projectID, notebookName):
            return "Cannot create notebook", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-chapter', methods=['POST'])
@tools.conditional_login_required()
def app_api_create_chapter():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        chapterName = data['chapterName']
        if PUTL.chapter_exists(projectID, notebookID, chapterName):
            return "Chapter exists in notebook.", 400
        if not PUTL.chapter_is_created(projectID, notebookID, chapterName):
            return "Cannot create chapter", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-notebook-name', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_notebook_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        newNotebookName = data['newNotebookName']
        if PUTL.notebook_exists(projectID, newNotebookName):
            return "Notebook name exists", 400
        if PUTL.notebook_name_is_set(projectID, notebookID, newNotebookName):
            return "", 200
        return "Cannot change notebook name", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-chapter-name', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_chapter_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        chapterID = data['chapterID']
        newChapterName = data['newChapterName']
        if PUTL.chapter_exists(projectID, notebookID, newChapterName):
            return "Chapter name exists.", 400
        if PUTL.chapter_name_is_set(projectID, chapterID, newChapterName):
            return "", 200
        return "Cannot change chapter name", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-chapter-sections', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_chapter_sections():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sections = PUTL.get_chapter_sections(projectID, chapterID)
        return jsonify(sections)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-section', methods=['POST'])
@tools.conditional_login_required()
def app_api_create_section():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        try:
            newSectionID = PUTL.create_section_in_db(projectID, chapterID)
        except Exception:
            traceback.print_exc()
            return 'Cannot create section', 400
        data = PUTL.get_section_content_rendered(projectID, newSectionID) 
        return jsonify({"sectionData": data}), 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-section-title', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_section_title():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        newSectionTitle = data['newSectionTitle']
        if PUTL.section_title_is_set(projectID, sectionID, newSectionTitle):
            return "", 200
        return "Cannot change section title", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-section-raw-content', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_section_raw_content():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionRawContent = PUTL.get_section_raw_content(projectID, sectionID)
        return jsonify({"sectionRawContent":sectionRawContent.replace("\n", "<br>")}), 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-section-content', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_section_content():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        newSectionContent = data['newSectionContent']
        # This is a fix for the extra newline Quasar editor sometimes adds.
        newSectionContent = re.sub(r'\n{3,}', '\n\n', newSectionContent)
        if PUTL.section_content_is_set(projectID, sectionID, newSectionContent):
            data = PUTL.get_section_content_rendered(projectID, sectionID) 
            return jsonify({"sectionData": data}), 200
        return "Error setting section content"
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-section-directory', methods=['POST'])
@tools.conditional_login_required()
def app_api_create_section_directory():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        message, section_directory_created = PUTL.section_directory_is_created(projectID, sectionID)
        if section_directory_created:
            return "", 200
        return message, 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-sections-for-search', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_sections_for_search():
    try:
        data = request.get_json()
        projectID = data['projectID']
        query = data['query']
        sectionsIDs = PUTL.get_sections_IDs_based_on_search_bar_query(projectID, query)
        sectionsRendered = []
        for sectionID in sectionsIDs:
            sectionsRendered.append(PUTL.get_section_content_rendered(projectID, sectionID))
        if sectionsRendered:
            return jsonify(sectionsRendered), 200
        return "Search query matched no sections.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-section', methods=['POST'])
@tools.conditional_login_required()
def app_api_delete_section():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        if PUTL.section_directory_exists(projectID, sectionID):
            sectionDirDeleted = False
        else:
            sectionDirDeleted = True
        if not sectionDirDeleted:
            sectionDirDeleted = PUTL.section_directory_is_deleted(projectID, sectionID)

        if PUTL.section_in_db_exists(projectID, sectionID):
            sectionInDBDeleted = False
        else:
            sectionInDBDeleted = True
        if not sectionInDBDeleted:
            sectionInDBDeleted = PUTL.section_in_db_is_deleted(projectID, sectionID)
        
        if sectionDirDeleted and sectionInDBDeleted:
            return "", 200
        return "Cannot delete section.", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-notebook', methods=['POST'])
@tools.conditional_login_required()
def app_api_delete_notebook():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        sectionsFate = data['sections-fate']
        if PUTL.notebook_is_deleted(projectID, notebookID, keep_sections=(sectionsFate=="keep-sections")):
            return "", 200
        return "Cannot delete notebook.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-chapter', methods=['POST'])
@tools.conditional_login_required()
def app_api_delete_chapter():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sectionsFate = data['sections-fate']
        if PUTL.chapter_is_deleted(projectID, chapterID, keep_sections=(sectionsFate=="keep-sections")):
            return "", 200
        return "Cannot delete notebook.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-project-description', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_project_description():
    try:
        data = request.get_json()
        projectID = data['projectID']
        newProjectDescription = data['newProjectDescription']
        if PUTL.project_description_is_set(projectID, newProjectDescription):
            return "", 200
        return "Cannot change project description.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-project-name', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_project_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        newProjectName = data['newProjectName']
        if PUTL.project_exists(newProjectName):
            return "Project name exists.", 400
        if PUTL.project_name_is_set(projectID, newProjectName):
            return "", 200
        return "Cannot change project name.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-project', methods=['POST'])
@tools.conditional_login_required()
def app_api_delete_project():
    try:
        data = request.get_json()
        projectID = data['projectID']
        if PUTL.project_is_deleted(projectID):
            return "", 200
        return "Cannot delete project.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-sections-tags', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_section_tags():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionTags = data['sectionTags']
        if PUTL.section_tags_is_set(projectID, sectionID, sectionTags):
            return "", 200
        return "Cannot change section tags.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-chapter-sections-order', methods=['POST'])
@tools.conditional_login_required()
def app_api_set_chapter_sections_order():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sectionsOrder = data['sectionsOrder']
        sectionsOrder = sectionsOrder.splitlines()
        sectionsIDs = []
        for section in sectionsOrder:
            try:
                if section:
                    if "-" in section:
                        sectionsIDs.append(int(section.split("-")[0].strip()))
                    else:
                        sectionsIDs.append(int(section.strip()))
            except Exception:
                continue
        sectionsIDs = list(dict.fromkeys(sectionsIDs)) # Remove duplicates and keep order
        sectionsIDsExistInDB = PUTL.check_which_section_IDs_exist_in_db(projectID, sectionsIDs)
        sectionsIDs = [sID for sID in sectionsIDs if sID in sectionsIDsExistInDB]
        if PUTL.chapter_links_are_deleted(projectID, chapterID):
            if sectionsIDs:
                if PUTL.chapter_sections_links_are_created(projectID, chapterID, sectionsIDs):
                    return "", 200
                else:
                    return "Cannot rearrange sections", 400
            else:
                return "", 200
        else:
            return "Cannot rearrange sections", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-omilayers', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_omilayers():
    try:
        data = request.get_json()
        projectID = data['projectID']
        DBpath = data['DBpath']
        layers = tools.get_omilayers(projectID, DBpath)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(layers)

@apiroutes.route('/api/get-data-for-omilayer', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_data_for_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        DBpath = data['DBpath']
        layerName = data['layer']
        nrows = data['nrows']
        columns, rows, layerInfo = PUTL.get_data_for_omilayer(projectID, DBpath, layerName, nrows)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify({"columns":columns, "rows":rows, "layerInfo":layerInfo})

@apiroutes.route('/api/get-section-directory-tree', methods=['POST'])
@tools.conditional_login_required()
def app_api_get_section_directory_tree():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionDirectoryTree = PUTL.get_section_directory_tree(projectID, sectionID)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(sectionDirectoryTree)



# FILES RELATED ROUTES
# ====================
@apiroutes.route('/api/files/<project>/<path:filename>', methods=['GET'])
@tools.conditional_login_required()
def get_filepath(project, filename):
    if project.isnumeric():
        projectID = int(project)
    else:
        projectID = tools.get_project_ID_based_on_name(project)
    projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
    filePath = Path(projectDir).joinpath(filename)

    if not filePath.exists():
        return f"File {filePath} does not exist.", 400

    fileExtention = Path(filePath).suffix
    docExtensions = ['.docx', 
                     '.doc', 
                     '.xls', 
                     '.xlsx',
                     '.csv',
                     '.tsv',
                     '.txt',
                     '.md',
                     '.ppt',
                     '.pptx',
                     '.py',
                     '.R',
                     '.Rscript'
                     ]

    if fileExtention in docExtensions:
        fileViewer = {
                "linux"  : "xdg-open",
                "windows": "start",
                "osx"    : "open",
                "darwin" : "open"
                }
        proc = subprocess.run([fileViewer[OSname], filePath], capture_output=True, check=False, text=True)
        return '', 204 

    dirPath = filePath.parent
    filename = filePath.name
    return send_from_directory(dirPath, filename)

@apiroutes.route('/api/upload-files-to-section', methods=['POST'])
@tools.conditional_login_required()
def upload_files_to_section():
    projectID = request.form.get('projectID')
    sectionID = request.form.get('sectionID')
    projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
    sectionDir = Path(projectDir).joinpath(f"sections/{sectionID}")
    try:
        if not sectionDir.exists():
            sectionDir.mkdir(exist_ok=False)
        for k in request.files.keys():
            f = request.files[k]
            f.save(sectionDir.joinpath(f.filename))
    except Exception:
        traceback.print_exc()
        return '', 400
    return "", 200

@apiroutes.route('/api/render-plot', methods=['POST'])
@tools.conditional_login_required()
def api_render_plot():
    try:
        data = request.get_json()
        oplt = getattr(omiplot, data['plot-type'])
        oplt(plot_data=data)
    except Exception:
        traceback.print_exc()
        return "Cannot render plot", 400
    return "", 200

@apiroutes.route('/api/create-new-omilayer', methods=['POST'])
@tools.conditional_login_required()
def api_create_new_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerDescription = data['layerDescription']
        columns = data['columns']

        if PUTL.omilayer_exists(projectID, dbPath, layerName):
            return "Omilayer already exists", 400

        if not PUTL.new_omilayer_is_created(projectID, dbPath, layerName, layerDescription, columns):
            return "Cannot create omilayer.", 400
    except Exception:
        traceback.print_exc()
        return "Cannot create omilayer.", 400
    return "", 200

@apiroutes.route('/api/get-column-names-and-dtypes-for-omilayer', methods=['POST'])
@tools.conditional_login_required()
def api_get_omilayer_column_names_and_dtypes():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerColumns = PUTL.get_column_names_and_dtypes_for_omilayer(projectID, dbPath, layerName)
        if len(layerColumns) > 10:
            return "Layer has more than 10 columns", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(layerColumns)

@apiroutes.route('/api/insert-data-to-omilayer', methods=['POST'])
@tools.conditional_login_required()
def api_insert_data_to_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerData = data['layerData']
        if not PUTL.data_are_inserted_to_omilayer(projectID, dbPath, layerName, layerData):
            return "Cannot insert data to omilayer", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return "", 200

@apiroutes.route('/api/upload-file-to-omilayer', methods=['POST'])
@tools.conditional_login_required()
def upload_file_to_omilayer():
    try:
        projectID = request.form.get('projectID')
        dbPath = request.form.get('dbPath')
        layerName = request.form.get('layerName')
        projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        uploaded_file = request.files['omilayerData']
        file_extension = Path(uploaded_file.filename).suffix

        if file_extension == '.xls' and not current_app.config['has_xlrd']:
            return "Python package 'xlrd' is not installed"

        if file_extension == '.xlsx' and not current_app.config['has_openpyxl']:
            return "Python package 'openpyxl' is not installed", 400

        if not PUTL.file_is_inserted_to_omilayer(projectID, dbPath, layerName, uploaded_file, file_extension):
            return "Cannot insert file to omilayer", 400
    except Exception:
        traceback.print_exc()
        return 'Cannot insert file to omilayer.', 400
    return "", 200

@apiroutes.route('/api/set-omilayer-description', methods=['POST'])
@tools.conditional_login_required()
def api_set_omilayer_description():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerInfo = data['layerInfo']
        if not PUTL.omilayer_description_is_set(projectID, dbPath, layerName, layerInfo):
            return "Cannot set omilayer description.", 400
    except Exception:
        traceback.print_exc()
        return 'Cannot set omilayer description.', 400
    return "", 200

@apiroutes.route('/api/delete-omilayer', methods=['POST'])
@tools.conditional_login_required()
def api_delete_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        if not PUTL.omilayer_is_deleted(projectID, dbPath, layerName):
            return 'Cannot delete layer', 400
    except Exception:
        traceback.print_exc()
        return 'Cannot delete layer', 400
    return "", 200

