from pathlib import Path
import contextlib
import sqlite3
from typing import Union
import traceback
from functools import wraps
from flask_login import current_user
from flask import redirect, url_for, request, current_app
import importlib
if importlib.util.find_spec("omilayers") is not None:
    from omilayers import Omilayers

APPDIR = Path("~/fresfolio").expanduser()
APPDB = APPDIR.joinpath("fresfolio.db")

def is_module_installed(module_name):
    return importlib.util.find_spec(module_name) is not None

def conditional_login_required():
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(*args, **kwargs):
            if current_app.config['user_broadcasts'] == 1:
                if not current_user.is_authenticated:
                    return redirect(url_for('login', next=request.url))
            return view_func(*args, **kwargs)
        return wrapped_view
    return decorator

def set_app_setting(setting:str, value:str) -> None:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT 1 FROM settings WHERE key=(?)"
            c.execute(query, (setting, ))
            settingExists = c.fetchone()

            if settingExists:
                query = "UPDATE settings SET value=(?) WHERE key=(?)"
                c.execute(query, (value, setting))
                conn.commit()
            else:
                query = "INSERT INTO settings (key,value) VALUES (?,?)"
                c.execute(query, (setting, value))
                conn.commit()

def get_app_setting(setting:str) -> Union[str, None]:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = f"""
            SELECT value FROM settings 
            WHERE key=(?)
            """
            c.execute(query, (setting,))
            row = c.fetchone()
    if len(row) == 0:
        return None
    return row[0]

def empty_users_table() -> None:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "DELETE FROM users"
            c.execute(query)
            conn.commit()

def is_broadcasting_enabled():
    broadcastingValue = get_app_setting("broadcasting")
    if broadcastingValue == "1":
        return True 
    return False

def get_paths_for_project_dir_and_db(projectID:int) -> tuple:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT path FROM projects WHERE id=(?)"
            c.execute(query, (projectID,))
            row = c.fetchone()
    if row:
        projectDirectory = row[0]
        projectDB = Path(projectDirectory).joinpath("project.db")
    else:
        projectDirectory = None
        projectDB = None
    return (projectDirectory, projectDB)

def get_project_name_based_on_id(projectID:int) -> str:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT name FROM projects WHERE id=(?)"
            c.execute(query, (projectID,))
            row = c.fetchone()
    if row:
        return row[0]
    return None

def get_project_ID_based_on_name(projectName:str) -> int:
    projectName = projectName
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT id FROM projects WHERE name=(?)"
            c.execute(query, (projectName,))
            row = c.fetchone()
    if row:
        return row[0]
    return None

def get_projects_names_and_paths() -> list:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT name,path FROM projects"
            c.execute(query)
            results = c.fetchall()
    return results

def get_project_info(projectAttribute:Union[str, int]) -> dict:
    """
    If projectAttribute is string, it expects project name to be passed. 
    If projectAttribute is integer, it expectes project ID to be passed.
    """
    if isinstance(projectAttribute, str):
        projectName = projectAttribute
        projectID = get_project_ID_based_on_name(projectName) 
    else:
        projectID = projectAttribute
        projectName = get_project_name_based_on_id(projectID)
    projectDir, projectDB = get_paths_for_project_dir_and_db(projectID)
    return {"name":projectName, "ID":projectID, "dirFullPath":projectDir, "DB":projectDB}

def filename_exists(projectName:str, filename:str) -> bool:
    projectsDir = get_app_setting("projectsDir")
    projectName = projectName
    filePath = Path(projectsDir).joinpath(f"{projectName}/{filename}")
    if filePath.exists():
        return True
    return False
    return (None, None)

def get_filepaths_from_wildcard_filename(projectInfo:dict, filename:str) -> list:
    projectDir, projectDB =  get_paths_for_project_dir_and_db(projectID)
    projectName = get_project_name_based_on_id(projectID)
    wildcardPath = Path(projectInfo['dirFullPath']).joinpath(filename)
    files = list(wildcardPath.parent.glob(wildcardPath.name))
    filesJSON = []
    for fullFilePath in files:
        fullFilePathParts = fullFilePath.parts
        projectIDXinPath = fullFilePathParts.index(projectInfo['name'])
        filename = Path(*fullFilePathParts[projectIDXinPath+1:])
        fileURL = f"/api/files/{projectInfo['ID']}/{filename}"
        filePath = Path(projectInfo['dirFullPath']).joinpath(filename)
        filesJSON.append({"fileURL":fileURL, "filePath":filePath})
    return filesJSON

def convert_section_tags_to_list(tags:str) -> list:
    if "," in tags:
        return [tag.strip() for tag in tags.split(",") if tag]
    return [tags.strip()]

def convert_tag_args_to_json(tag_args:str) -> dict:
    if not tag_args:
        return {}
    try:
        args = [arg.strip() for arg in tag_args.split(",")]
        JSON = {}
        for arg in args:
            key,value = arg.split(":")
            JSON[key.strip()] = value.strip()
    except Exception:
        traceback.print_exc()
        return {}
    return JSON

def get_omilayers(projectID:str, DBpath:str) -> list:
        try:
            projectDirectory, projectDB = get_paths_for_project_dir_and_db(projectID)
            omi = Omilayers(str(Path(projectDirectory).joinpath(DBpath)))
            df = omi._dbutils._get_tables_info()
        except Exception:
            traceback.print_exc()
            return []
        if df.shape[0] != 0:
            return df[['name', 'info', 'shape']].to_dict(orient='records')
        return []
