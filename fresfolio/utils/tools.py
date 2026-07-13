from pathlib import Path
import contextlib
import sqlite3
from typing import Union
import traceback
import importlib.util
import shutil
import uuid
import subprocess
import threading
import requests
from datetime import datetime
import json
import mimetypes

if importlib.util.find_spec("omilayers") is not None:
    from omilayers import Omilayers

APPDIR = Path("~/fresfolio").expanduser()
APPDB = APPDIR.joinpath("fresfolio.db")

def log_traceback():
    with open(APPDIR.joinpath("fresfolio.log"), 'w') as outf:
        traceback.print_exc(file=outf)

def is_module_installed(module_name):
    return importlib.util.find_spec(module_name) is not None

def generate_uuid() -> str:
    return uuid.uuid4().hex

def has_extras():
    extra_modules = [
            "pyarrow",
            "omilayers",
            "docx",
            "pymupdf4llm"
    ]
    modules_installed = [is_module_installed(name) for name in extra_modules]
    if sum(modules_installed) != len(extra_modules):
        return False
    return True

def table_has_column(db:str, table:str, colname:str) -> bool:
    with contextlib.closing(sqlite3.connect(db)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            c.execute(f'PRAGMA table_info({table})')
            columns = [row[1] for row in c.fetchall()]
    if colname not in columns:
        return False
    return True

def uuid_column_added_to_table(db:str, table:str) -> bool:
    try:
        with contextlib.closing(sqlite3.connect(db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                c.execute(f"ALTER TABLE {table} ADD COLUMN uuid TEXT")
                c.execute(f"SELECT id FROM {table} WHERE uuid IS NULL")
                rows = c.fetchall()
                for row in rows:
                    row_id = row[0]
                    c.execute(
                        f"UPDATE {table} SET uuid = ? WHERE id = ?", 
                        (uuid.uuid4().hex, row_id)
                    )
                conn.commit()
    except Exception:
        log_traceback()
        return False
    return True

def is_typst_installed() -> bool:
    """Check if typst is installed in the system."""
    if shutil.which("typst") is None:
        return False
    return True

def get_typst_path():
    """Returns typst path."""
    return shutil.which("typst")

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

def get_all_app_settings() -> Union[None, tuple]:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT key,value FROM settings"
            c.execute(query)
            rows = c.fetchall()
    if not rows:
        return None
    return rows

def get_app_setting(setting:str) -> Union[str, None]:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = """
            SELECT value FROM settings 
            WHERE key=(?)
            """
            c.execute(query, (setting,))
            row = c.fetchone()
    if not row:
        return None
    return row[0]

def get_paths_for_project_dir_and_db(projectID:str) -> tuple:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT path FROM projects WHERE uuid=(?)"
            c.execute(query, (projectID,))
            row = c.fetchone()
    if row:
        projectDirectory = row[0]
        projectDB = Path(projectDirectory).joinpath("project.db")
    else:
        projectDirectory = None
        projectDB = None
    return (projectDirectory, projectDB)

def get_project_name_based_on_id(projectID:str) -> str:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT name FROM projects WHERE uuid=(?)"
            c.execute(query, (projectID,))
            row = c.fetchone()
    if row:
        return row[0]
    return None

def get_project_ID_based_on_name(projectName:str) -> int:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT uuid FROM projects WHERE name=(?)"
            c.execute(query, (projectName,))
            row = c.fetchone()
    if row:
        return row[0]
    return None

def get_project_ID_based_on_uuid(projectUUID:str) -> int:
    with contextlib.closing(sqlite3.connect(APPDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT id FROM projects WHERE uuid=(?)"
            c.execute(query, (projectUUID,))
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

def get_project_info(projectAttribute:str, input_is_uuid:bool=False) -> dict:
    """
    If projectAttribute is string, it expects project name to be passed. 
    If projectAttribute is integer, it expectes project ID to be passed.
    """
    if input_is_uuid:
        projectID = projectAttribute
        projectName = get_project_name_based_on_id(projectID)
    else:
        projectName = projectAttribute
        projectID = get_project_ID_based_on_name(projectName) 
    projectDir, projectDB = get_paths_for_project_dir_and_db(projectID)
    return {"name":projectName, "ID":projectID, "dirFullPath":projectDir, "DB":projectDB}

def get_chapter_ID_based_on_name(projectID:str, notebookID:int, chapterName:str) -> int:
    projectDir, projectDB = get_paths_for_project_dir_and_db(projectID)
    with contextlib.closing(sqlite3.connect(projectDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT id FROM chapters WHERE notebookID=(?) AND chapter=(?)"
            c.execute(query, (notebookID, chapterName))
            result = c.fetchone()
    if result:
        return result[0]
    return None

def get_notebook_ID_based_on_name(projectID:str, notebookName:str) -> int:
    projectDir, projectDB = get_paths_for_project_dir_and_db(projectID)
    with contextlib.closing(sqlite3.connect(projectDB)) as conn:
        with contextlib.closing(conn.cursor()) as c:
            query = "SELECT id FROM notebooks WHERE notebook=(?)"
            c.execute(query, (notebookName, ))
            result = c.fetchone()
    if result:
        return result[0]
    return None

def filename_exists(projectName:str, filename:str) -> bool:
    projectsDir = get_app_setting("projectsDir")
    projectName = projectName
    filePath = Path(projectsDir).joinpath(f"{projectName}/{filename}")
    if filePath.exists():
        return True
    return False
    return (None, None)

def get_filepaths_from_wildcard_filename(projectInfo:dict, filename:str) -> list:
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
        log_traceback()
        return {}
    return JSON

def get_omilayers(projectID:str, DBpath:str) -> list:
    try:
        projectDirectory, projectDB = get_paths_for_project_dir_and_db(projectID)
        omi = Omilayers(str(Path(projectDirectory).joinpath(DBpath)))
        df = omi._dbutils._get_tables_info()
    except Exception:
        log_traceback()
        return []
    if df.shape[0] != 0:
        return df[['name', 'info', 'shape']].to_dict(orient='records')
    return []

def get_sections_IDs_for_chapter(projectID:str, chapterID:int) -> list:
    projectDirectory, projectDB = get_paths_for_project_dir_and_db(projectID)
    try:
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "SELECT sectionID FROM chapters_sections_links WHERE chapterID=(?)"
                c.execute(query, (chapterID,))
                sectionsIDs = c.fetchall()
        if sectionsIDs:
            return [s[0] for s in sectionsIDs]
        return []
    except Exception:
        log_traceback()
        return []

def run_and_log(
    script_cmd: str,
    conda_env: str,
    workdir: str,
    log_file: str,
    process_name: str
):
    if conda_env != "NA":
        full_cmd = f"conda run -n {conda_env} --no-capture-output {script_cmd}"
    else:
        full_cmd = script_cmd

    proc = subprocess.Popen(
        full_cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=workdir,
        text=True,
    )

    initial_payload = {
        "status":     "running",
        "pid":        proc.pid,
        "script":     script_cmd,
        "conda":      conda_env,
        "workdir":    workdir,
        "date_start": datetime.now().isoformat(),  # ← renamed
        "processName": process_name,
        "date_end":   "NA",                        # ← placeholder
        "stdout":     "NA",
        "stderr":     "NA",
        "returncode": "NA",
    }
    with open(log_file, "w") as f:
        json.dump(initial_payload, f, indent=2)

    def _collect_and_log():
        stdout, stderr = proc.communicate()
        final_payload = {
            **initial_payload,
            "status":     "finished",
            "date_end":   datetime.now().isoformat(),  # ← filled on completion
            "stdout":     stdout,
            "stderr":     stderr,
            "returncode": proc.returncode,
        }
        with open(log_file, "w") as f:
            json.dump(final_payload, f, indent=2)

    t = threading.Thread(target=_collect_and_log, daemon=True)
    t.start()
    return proc, t
    
def get_ai_response(ai_model:str, conversation_history:list) -> dict:
    api_key = get_app_setting('ai_api_key')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{ai_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    modelInstructions = r"""
    Instructions: 
    1. If you need to include tables in your responses, include them between the markers \begin{table} and \end{table}. 
    2. Use the following format when you include tables:
        2.a. separate all columns with a comma.
        2.b. do not include any commas inside the column values themselves.
    3. If you need to include programming code in your responses, use the standard markdown way but don't specify programming language.
    4. If you need to include math in your responses, use sinlge '$' for inline math. For equations, put them between double '$$' as following:
    $$
    [YOU EQUATION]
    $$
    """
    payload = {
        "systemInstruction": {
                "parts": [
                    {"text": modelInstructions}
                ]
            },
        "contents": conversation_history
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response_status_code = response.status_code
        data = response.json()
        if response_status_code  == 200:
            text_response = data['candidates'][0]['content']['parts'][0]['text']
        else:
            text_response = ""
    except requests.exceptions.RequestException as e:
        log_traceback()
        print(f"\nAn error occurred: {e}")
        return {'status_code': "400", 'text':""}
    return {'status_code': response_status_code, 'text':text_response}


def is_flat_file(file_full_path:Path) -> bool:
    mime_type, _ = mimetypes.guess_type(str(file_full_path))
    if mime_type:
        return mime_type.startswith("text/") or mime_type in {
            "application/json", "application/xml", "application/javascript",
        }
    return False


