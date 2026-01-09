from pathlib import Path
import contextlib
import sqlite3
from datetime import datetime
import json
import shutil
from collections import defaultdict
import re
import traceback
import secrets
from fresfolio.utils import tools

APPDIR = Path("~/fresfolio").expanduser()
APPDB = APPDIR.joinpath("fresfolio.db")

if APPDIR.exists():
    from fresfolio.renderers.html_renderer import HtmlRenderer, PDFRenderer

if tools.is_module_installed("omilayers"):
    from omilayers import Omilayers
    import duckdb
    import pandas as pd


class AppINIT:

    def __init__(self) -> None:
        if not APPDIR.exists():
            print(">>> Initializing Fresnote app...")
            if not self.__app_directory_initialized:
                print("[ERROR] Cannot initialize Fresnote app directory.")
                print(">>> Fresnote was not initialized successfully.")
                exit()

            print("[OK] Fresnote app directory created.")

            if not self.__app_db_initialized:
                if APPDIR.exists():
                    shutil.rmtree(APPDIR)
                print("[ERROR] Cannot initialize Fresnote app database.")
                print(">>> Fresnote was not initialized successfully.")
                exit()
            print("[OK] Fresnote app database created.")

            self.projectsDir = tools.get_app_setting("projectsDir")
            if self.projectsDir is None:
                if APPDIR.exists():
                    shutil.rmtree(APPDIR)
                print("[ERROR] Fresnote projects directory was not registered in app database.")
                print(">>> Fresnote was not initialized successfully.")
                exit()

            try:
                self.projectsDir = Path(self.projectsDir).expanduser()
                self.projectsDir.mkdir(exist_ok=False)
            except Exception:
                if APPDIR.exists():
                    shutil.rmtree(APPDIR)
                traceback.print_exc()
                print("[ERROR] Cannot create Fresnote projects directory.")
                print(">>> Fresnote was not initialized successfully.")
                exit()
            print("[OK] Fresnote app projects directory created.")
            print(">>> Fresnote initialized successfully.")
        else:
            print(">>> Evaluating Fresnote initialization...")
            print("[OK] Fresnote app directory exists.")
            if not APPDB.exists():
                print("[ERROR] Fresnote app database does not exist.")
                print(">>> Fresnote was not initialized successfully.")
                exit()
            else:
                print("[OK] Fresnote app database exists.")

            self.projectsDir = tools.get_app_setting("projectsDir")
            if self.projectsDir is None:
                print("[ERROR] Fresnote projects directory was not registered in app database.")
                print(">>> Fresnote was not initialized successfully.")
                exit()
            print("[OK] Fresnote projects directory was registered in app database.")

            self.projectsDir = Path(self.projectsDir).expanduser()
            if not self.projectsDir.exists():
                print("[ERROR] Fresnote projects directory does not exist.")
                print(">>> Fresnote was not initialized successfully.")
                exit()
            print("[OK] Fresnote projects directory exists.")
            print(">>> Fresnote was initialized successfully.")


    @property
    def __app_directory_initialized(self) -> bool:
        try:
            APPDIR.mkdir(exist_ok=True)
        except Exception:
            traceback.print_exc()
            return False
        return True

    @property
    def __app_db_initialized(self) -> bool:
        try:
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    CREATE TABLE users(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL
                    )
                    """
                    c.execute(query)

                    query = """
                    CREATE TABLE settings(
                    key TEXT,
                    value TEXT
                    )
                    """
                    c.execute(query)

                    query = """
                    CREATE TABLE projects(
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    path TEXT,
                    description TEXT,
                    started TEXT,
                    finished TEXT
                    )
                    """
                    c.execute(query)
                    conn.commit()

                    query = """
                    INSERT INTO settings 
                    (key,value) 
                    VALUES (?,?)
                    """
                    c.execute(query, ("projectsDir", str(APPDIR.joinpath("projects"))))
                    c.execute(query, ("secret_key", secrets.token_urlsafe(32)))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True


class ProjectsUtils:

    def __init__(self):
        self.projectsDir = tools.get_app_setting("projectsDir")

    def get_projects(self) -> list:
        with contextlib.closing(sqlite3.connect(APPDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "SELECT id,name,description,started FROM projects"
                c.execute(query)
                rows = c.fetchall()
        if rows:
            return [{"id":row[0], "name": row[1], "description":row[2], "started":row[3]} for row in rows]
        return []

    def project_exists(self, projectName:str) -> bool:
        projectName = projectName
        with contextlib.closing(sqlite3.connect(APPDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "SELECT 1 FROM projects WHERE name=(?) LIMIT 1"
                c.execute(query, (projectName,))
                row = c.fetchone()
        if row:
            return True
        return False

    def project_is_created(self, projectName:str, projectDescription:str) -> bool:
        today = datetime.today().strftime('%Y-%m-%d')
        projectDirectory = Path(self.projectsDir).joinpath(projectName)
        try:
            projectDirectory.mkdir(exist_ok=False)
            projectDirectory.joinpath("sections").mkdir(exist_ok=False)
        except Exception:
            traceback.print_exc()
            return False

        projectDB = str(projectDirectory.joinpath("project.db"))
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    CREATE TABLE notebooks(
                    id INTEGER PRIMARY KEY,
                    notebook TEXT,
                    date TEXT
                    )
                    """
                    c.execute(query)

                    query = """
                    CREATE TABLE chapters(
                    id INTEGER PRIMARY KEY,
                    chapter TEXT,
                    notebookID INTEGER,
                    date TEXT
                    )
                    """
                    c.execute(query)

                    query = """
                    CREATE TABLE sections(
                    id INTEGER PRIMARY KEY,
                    section TEXT,
                    tags TEXT,
                    content TEXT,
                    date TEXT
                    )
                    """
                    c.execute(query)

                    query = """
                    CREATE TABLE chapters_sections_links(
                    id INTEGER PRIMARY KEY,
                    chapterID INTEGER,
                    sectionID INTEGER
                    )
                    """
                    c.execute(query)
                    conn.commit()
        except Exception:
            traceback.print_exc()
            if projectDirectory.exists():
                shutil.rmtree(projectDirectory)
            return False

        try:
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    INSERT INTO projects (name,path,description,started) 
                    VALUES (?,?,?,?)
                    """
                    c.execute(query, (projectName, str(projectDirectory), projectDescription, today))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            if projectDirectory.exists():
                shutil.rmtree(projectDirectory)
            return False
        return True

    def project_is_imported(self, projectName:str, projectPath:str) -> bool:
        today = datetime.today().strftime('%Y-%m-%d')
        projectDescription = "Imported project. No available description."
        try:
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    INSERT INTO projects (name,path,description,started) 
                    VALUES (?,?,?,?)
                    """
                    c.execute(query, (projectName, projectPath, projectDescription, today))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def project_path_is_set(self, projectName:str, projectPath:str) -> bool:
        try:
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "UPDATE projects SET path=(?) WHERE name=(?)"
                    c.execute(query, (str(projectPath), projectName))
                    conn.commit()
        except Exception: 
            traceback.print_exc()
            return False
        return True

    def get_notebooks_for_project(self, projectID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "SELECT id, notebook, date from notebooks"
                c.execute(query)
                notebooks =  c.fetchall()
        return notebooks

    @staticmethod
    def get_chapters_for_notebook_of_project(projectID:str, notebookID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "SELECT id,chapter,date FROM chapters WHERE notebookID=(?)"
                c.execute(query, (notebookID,))
                chapters = c.fetchall()
        return chapters

    def get_notebooks_and_chapters_for_project(self, projectID:int) -> dict: 
        notebooks = self.get_notebooks_for_project(projectID)
        sidebarDataList = []
        if notebooks:
            # sort notebooks by name
            notebooks = sorted(notebooks, key=lambda field: field[1])
            for notebook in notebooks:
                notebookID, notebookName, notebookDate = notebook
                JSON = {"notebookID":notebookID, "notebookName":notebookName, "notebookDate":notebookDate, "chapters":[]}
                chapters = self.get_chapters_for_notebook_of_project(projectID, notebookID)
                if chapters:
                    # sort chapters by name
                    chapters = sorted(chapters, key=lambda field: field[1])
                    for chapter in chapters:
                        chapterID, chapterName, chapterDate = chapter 
                        JSON['chapters'].append({
                            "chapterID": chapterID,
                            "chapterName": chapterName,
                            "chapterDate": chapterDate
                            })
                sidebarDataList.append(JSON)
        return sidebarDataList

    def notebook_exists(self, projectID:int, notebookName:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = 'SELECT EXISTS(SELECT 1 FROM notebooks WHERE notebook=(?))'
                c.execute(query, (notebookName, ))
                result = c.fetchone()[0]
        if result == 1:
            return True
        return False

    def notebook_is_created(self, projectID:str, notebookName:str) -> bool:
        today = datetime.today().strftime('%Y-%m-%d')
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    INSERT INTO notebooks (notebook,date) 
                    VALUES (?,?)
                    """
                    c.execute(query, (notebookName,today))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def notebook_name_is_set(self, projectID:int, notebookID:int, newNotebookName:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    UPDATE notebooks 
                    SET notebook=(?) 
                    WHERE id=(?)
                    """
                    c.execute(query, (newNotebookName,notebookID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def project_description_is_set(self, projectID:int, newProjectDescription:str) -> bool:
        try:
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    UPDATE projects 
                    SET description=(?) 
                    WHERE id=(?)
                    """
                    c.execute(query, (newProjectDescription, projectID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def project_name_is_set(self, projectID:int, newProjectName:str) -> bool:
        try:
            oldProjectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            if not Path(oldProjectDirectory).exists():
                return False
            newProjectName = newProjectName
            newProjectDirectory = Path(oldProjectDirectory).parent.joinpath(newProjectName)
            Path(oldProjectDirectory).rename(newProjectDirectory)

            if not newProjectDirectory.exists():
                return False
        
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    UPDATE projects 
                    SET name=(?), path=(?)
                    WHERE id=(?)
                    """
                    c.execute(query, (newProjectName, str(newProjectDirectory), projectID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def new_section_directory_created(self, projectID:int, sectionID:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            Path(projectDirectory).joinpath(f"sections/{sectionID}").mkdir(exist_ok=False)
        except Exception:
            traceback.print_exc()
            return False
        return True

    def section_in_db_exists(self, projectID:int, sectionID:int) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = 'SELECT EXISTS(SELECT 1 FROM sections WHERE id=(?))'
                c.execute(query, (sectionID,))
                result = c.fetchone()[0]
        if result == 1:
            return True
        return False

    def section_directory_exists(self, projectID:int, sectionID:int) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        sectionDirPath = Path(projectDirectory).joinpath(f"sections/{sectionID}")
        if sectionDirPath.exists():
            return True
        return False

    def section_directory_is_deleted(self, projectID:int, sectionID:int) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            sectionDirPath = Path(projectDirectory).joinpath(f"sections/{sectionID}")
            shutil.rmtree(str(sectionDirPath))
        except Exception:
            traceback.print_exc()
            return False
        return True

    def section_in_db_is_deleted(self, projectID:int, sectionID:int) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "DELETE FROM sections WHERE id=(?)"
                    c.execute(query, (sectionID,))

                    query = "DELETE FROM chapters_sections_links WHERE sectionID=(?)"
                    c.execute(query, (sectionID,))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def chapter_exists(self, projectID:int, notebookID:int, chapterName:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = 'SELECT EXISTS(SELECT 1 FROM chapters WHERE notebookID=(?) AND chapter=(?))'
                c.execute(query, (notebookID, chapterName))
                result = c.fetchone()[0]
        if result == 1:
            return True
        return False

    def chapter_is_created(self, projectID:int, notebookID:int, chapterName:str) -> bool: 
        today = datetime.today().strftime('%Y-%m-%d')
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    INSERT INTO chapters (chapter,notebookID,date) 
                    VALUES (?,?,?)
                    """
                    c.execute(query, (chapterName, notebookID,today))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def chapter_name_is_set(self, projectID:int, chapterID:int, newChapterName:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = """
                    UPDATE chapters
                    SET chapter=(?) 
                    WHERE id=(?)
                    """
                    c.execute(query, (newChapterName, chapterID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def get_sections_IDs_for_chapter(self, projectID:int, chapterID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
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
            traceback.print_exc()
            return []

    def get_chapter_sections(self, projectID:int, chapterID:int) -> list:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            sectionsIDs = self.get_sections_IDs_for_chapter(projectID, chapterID)
            sectionsResults = [] 
            if sectionsIDs:
                cols = ['id', 'section', 'tags', 'content', 'date']
                with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                    with contextlib.closing(conn.cursor()) as c:
                        query = """
                        SELECT {0} FROM sections 
                        WHERE id IN ({1})
                        """.format(','.join(cols), ', '.join('?' for _ in sectionsIDs))
                        c.execute(query, sectionsIDs)
                        sectionsResults = c.fetchall()
            sections = []
            if sectionsResults:
                colsMapper = {
                            "id":"ID",
                            "section":"title",
                            "tags":"tags",
                            "content":"content",
                            "date":"sectionDate"
                                }
                sectionsJSON = {} # A way to retain the order of sections in sectionsIDs.
                for result in sectionsResults:
                    kwargs = {colsMapper[col]:value for col,value in zip(cols,result)}
                    if not kwargs['content'].strip("\n"):
                        kwargs['content'] = "Section content is emtpy."
                    kwargs['projectID'] = projectID
                    kwargs['projectName'] = tools.get_project_name_based_on_id(projectID)
                    kwargs['section_dir_exists'] = int(Path(projectDirectory).joinpath(f"sections/{kwargs['ID']}").exists())
                    section = SectionUtils(**kwargs)
                    sectionsJSON[kwargs['ID']] = section.render_content_to_html()
                sections = [sectionsJSON[ID] for ID in sectionsIDs]
            return sections
        except Exception:
            traceback.print_exc()
            return []

    def get_section_content_rendered(self, projectID:int, sectionID:int, render_type:str='html') -> list:
        """Render section content to HTML"""
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        cols = ['id', 'section', 'tags', 'content', 'date']
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = f"""
                SELECT {','.join(cols)} FROM sections 
                WHERE id=(?)
                """
                c.execute(query, (sectionID,))
                result = c.fetchone()
        if result:
            colsMapper = {
                        "id":"ID",
                        "section":"title",
                        "tags":"tags",
                        "content":"content",
                        "date":"sectionDate"
                            }
            kwargs = {colsMapper[col]:value for col,value in zip(cols,result)}
            if not kwargs['content'].strip("\n"):
                kwargs['content'] = "Section content is emtpy."
            kwargs['projectID'] = projectID
            kwargs['projectName'] = tools.get_project_name_based_on_id(projectID)
            kwargs['section_dir_exists'] = int(Path(projectDirectory).joinpath(f"sections/{kwargs['ID']}").exists())
            section = SectionUtils(**kwargs)
            if render_type == "html":
                return section.render_content_to_html()
            elif render_type == "pdf":
                return section.render_content_to_pdf()
        return {}

    def get_section_raw_content(self, projectID:str, sectionID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                SELECT content FROM sections 
                WHERE id=(?)
                """
                c.execute(query, (sectionID,))
                result = c.fetchone()
        if result:
            return result[0]
        return ""

    def create_section_in_db(self, projectID:int, chapterID:int) -> int:
        today = datetime.today().strftime('%Y-%m-%d')
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        sectionID = None
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                INSERT INTO sections 
                (section, tags, content, date)
                VALUES (?,?,?,?)
                """
                c.execute(query, ('New section', json.dumps([]), '', today))
                sectionID = c.lastrowid
                conn.commit()

                query = """
                INSERT INTO chapters_sections_links 
                (chapterID,sectionID) 
                VALUES (?,?)
                """
                c.execute(query, (chapterID, sectionID))
                conn.commit()
        return sectionID

    def section_title_is_set(self, projectID:int, sectionID:int, newSectionTitle:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "UPDATE sections SET section=(?) WHERE id=(?)"
                    c.execute(query, (newSectionTitle, sectionID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def section_content_is_set(self, projectID:int, sectionID:int, newSectionContent:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "UPDATE sections SET content=(?) WHERE id=(?)"
                    c.execute(query, (newSectionContent, sectionID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def section_tags_is_set(self, projectID:int, sectionID:int, sectionTags:list) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "UPDATE sections SET tags=(?) WHERE id=(?)"
                    c.execute(query, (json.dumps(sectionTags), sectionID))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def get_section_tags(self, projectID:int, sectionID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "SELECT tags FROM sections WHERE id=(?)"
                    c.execute(query, (sectionID, ))
                    result = c.fetchone()
            tags = []
            if result:
                tags = json.loads(result[0])
            return tags
        except Exception:
            traceback.print_exc()
            return []

    def check_which_section_IDs_exist_in_db(self, projectID:int, sectionsIDs:list) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        placeholders = ','.join('?' for _ in sectionsIDs)
        with contextlib.closing(sqlite3.connect(projectDB)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = f"SELECT id FROM sections WHERE id IN ({placeholders})"
                c.execute(query, sectionsIDs)
                results = c.fetchall()
        if results:
            return [res[0] for res in results]
        return []

    def section_directory_is_created(self, projectID:int, sectionID:int) -> tuple:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        sectionDirectoryPath = Path(projectDirectory).joinpath(f"sections/{sectionID}")
        if sectionDirectoryPath.exists():
            return ("Section directory exists", False) 
        try:
            sectionDirectoryPath.mkdir(exist_ok=False)
        except Exception:
            traceback.print_exc()
            return ("Cannot create section directory", False)
        return ("", True)

    def get_sections_IDs_based_on_search_bar_query(self, projectID:int, queryTerms:str) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        projects = {}
        query = "SELECT id FROM sections WHERE"
        if queryTerms.startswith("id:"):
            try:
                IDs = queryTerms.split(":")[-1]
                if "," in IDs:
                    IDs = [int(x.strip(" ")) for x in IDs.split(",") if x]
                else:
                    IDs = [int(IDs.strip(" "))]
            except Exception:
                traceback.print_exc()
                IDs = []
            projects[projectID] = IDs
        else:
            if "," in queryTerms:
                connector = "OR"
                queryTerms = queryTerms.replace(",", "")
            else:
                connector = "AND"

            if queryTerms.strip(" ")[1] != ":":
                queryTerms = "a:" + queryTerms

            pattern = r'([a-z]):\s*(.*?)(?=(?: [a-z]:|$))'
            queryTags = defaultdict(list)
            for key, value_str in re.findall(pattern, queryTerms):
                # Extract words or quoted phrases
                words = re.findall(r'"[^"]+"|\S+', value_str)
                # Clean quotes and trailing punctuation like commas
                cleaned_words = [w.strip('"').strip(',') for w in words]
                queryTags[key].extend(cleaned_words)

            allTerms  = list()
            sectionTerms =  list()
            tagsTerms = list()
            contentTerms = list()
            _projects = list()

            if queryTags['p']:
                if "all" in queryTags['p']:
                    allProjects = tools.get_projects_names_and_paths()
                    for item in allProjects:
                        projectName, projectPath = item
                        _projectID = tools.get_project_ID_based_on_name(projectName)
                        _projectDirectory, _projectDB = tools.get_paths_for_project_dir_and_db(_projectID)
                        _projects.append((_projectID, _projectDB))
                else:
                    try:
                        for projectName in queryTags['p']:
                            _projectID = tools.get_project_ID_based_on_name(projectName)
                            if _projectID is None:
                                raise ValueError(f"Project '{projectName}' does not exist.")
                                return []
                            _projectDirectory, _projectDB = tools.get_paths_for_project_dir_and_db(_projectID)
                            _projects.append((_projectID, _projectDB))
                    except Exception:
                        traceback.print_exc()
                        return []
            else:
                _projects.append((projectID, projectDB))

            if queryTags['a']:
                for term in queryTags['a']:
                    allTerms.append('(tags LIKE "%{0}%" OR section LIKE "%{0}%" OR content LIKE "%{0}%")'.format(term))

            if queryTags['s']:
                for term in queryTags['s']:
                    sectionTerms.append('section LIKE "%{0}%"'.format(term))

            if queryTags['t']:
                for term in queryTags['t']:
                    tagsTerms.append('tags LIKE "%{0}%"'.format(term))

            if queryTags['c']:
                for term in queryTags['c']:
                    contentTerms.append('content LIKE "%{0}%"'.format(term))

            if allTerms:
                if query.endswith("WHERE"):
                    query += " "
                else:
                    query += f" {connector} "
                query += f" {connector} ".join(allTerms)
            if sectionTerms:
                if query.endswith("WHERE"):
                    query += " "
                else:
                    query += f" {connector} "
                query += f" {connector} ".join(sectionTerms)
            if tagsTerms:
                if query.endswith("WHERE"):
                    query += " "
                else:
                    query += f" {connector} "
                query += f" {connector} ".join(tagsTerms)
            if contentTerms:
                if query.endswith("WHERE"):
                    query += " "
                else:
                    query += f" {connector} "
                query += f" {connector} ".join(contentTerms)

            for item in _projects:
                _projectID, _projectDB = item
                with contextlib.closing(sqlite3.connect(_projectDB)) as conn:
                    with contextlib.closing(conn.cursor()) as c:
                        c.execute(query)
                        IDs = c.fetchall()
                if IDs:
                    IDs = [res[0] for res in IDs]
                projects[_projectID] = IDs
        return projects

    def notebook_is_deleted(self, projectID:int, notebookID:int, keep_sections:bool) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            sectionsIDs = []
            if not keep_sections:
                chapters = ProjectsUtils.get_chapters_for_notebook_of_project(projectID, notebookID)
                if chapters:
                    chaptersIDs = [chapter[0] for chapter in chapters]
                    sectionsIDs = []
                    for chapterID in chaptersIDs:
                        sectionsIDs.extend(self.get_sections_IDs_for_chapter(projectID, chapterID))
                    if sectionsIDs:
                        sectionsIDs = list(set(sectionsIDs))

            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    if sectionsIDs:
                        placeholders = ','.join('?' for _ in sectionsIDs)
                        query = f"DELETE FROM sections WHERE id IN ({placeholders})"
                        c.execute(query, sectionsIDs)

                        query = f"DELETE FROM chapters_sections_links WHERE sectionID IN ({placeholders})"
                        c.execute(query, sectionsIDs)

                    query = "DELETE FROM chapters WHERE notebookID=(?)"
                    c.execute(query, (notebookID,))

                    query = "DELETE FROM notebooks WHERE id=(?)"
                    c.execute(query, (notebookID,))
                    conn.commit()
            return True
        except Exception:
            traceback.print_exc()
            return False

    def chapter_is_deleted(self, projectID:int, chapterID:int, keep_sections:bool) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            sectionsIDs = []
            if not keep_sections:
                sectionsIDs = self.get_sections_IDs_for_chapter(projectID, chapterID)
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    if sectionsIDs:
                        placeholders = ','.join('?' for _ in sectionsIDs)
                        query = f"DELETE FROM sections WHERE id IN ({placeholders})"
                        c.execute(query, sectionsIDs)

                        query = f"DELETE FROM chapters_sections_links WHERE sectionID IN ({placeholders})"
                        c.execute(query, sectionsIDs)

                    query = "DELETE FROM chapters WHERE id=(?)"
                    c.execute(query, (chapterID,))
                    conn.commit()
            return True
        except Exception:
            traceback.print_exc()
            return False

    def chapter_links_are_deleted(self, projectID:int, chapterID:int) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        try:
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "DELETE FROM chapters_sections_links WHERE chapterID=(?)"
                    c.execute(query, (chapterID,))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def project_is_deleted(self, projectID:int) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            if not Path(projectDirectory).exists():
                raise FileNotFoundError(f'Path {projectDirectory} does not exist.')
            shutil.rmtree(projectDirectory)
            with contextlib.closing(sqlite3.connect(APPDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "DELETE FROM projects where id=(?)"
                    c.execute(query, (projectID, ))
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def chapter_sections_links_are_created(self, projectID:int, chapterID:int, sectionsIDs:list) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            entries = [(chapterID, sID) for sID in sectionsIDs]
            with contextlib.closing(sqlite3.connect(projectDB)) as conn:
                with contextlib.closing(conn.cursor()) as c:
                    query = "INSERT INTO chapters_sections_links (chapterID,sectionID) VALUES (?,?)"
                    c.executemany(query, entries)
                    conn.commit()
        except Exception:
            traceback.print_exc()
            return False
        return True

    def get_data_for_omilayer(self, projectID:int, DBpath:str, layerName:str, nrows:str) -> tuple:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            omi = Omilayers(str(Path(projectDirectory).joinpath(DBpath)))
            if nrows == "all":
                df = omi.run(f"SELECT * FROM {layerName}", fetchdf=True)
            else:
                df = omi.run(f"SELECT * FROM {layerName} LIMIT {int(nrows)}", fetchdf=True)
            tablesInfo = omi.run(f"SELECT * FROM tables_info WHERE name='{layerName}'", fetchdf=True)

            layerInfo = tablesInfo['info'].values[0]

            jsonCols = []
            for idx,col in enumerate(df.columns, start=1):
                jsonCols.append({"name":f"col{idx}", "field":f"col{idx}", "align":"left", "label":col, "sortable": True})
            jsonRows = []
            for row in df.values.tolist():
                jsonRows.append({f"col{idx}":val for idx,val in enumerate(row, start=1)})
            return (jsonCols, jsonRows, layerInfo)
        except Exception:
            traceback.print_exc()
            return ([], [], "Cannot load layer data.")

    def get_section_directory_tree(self, projectID:int, sectionID:int) -> list:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        def build_tree(_path):
            tree = []
            for entry in sorted(_path.iterdir()):
                node = {'label': entry.name}
                if entry.is_dir():
                    node['children'] = build_tree(entry)
                tree.append(node)
            return tree
        try:
            sectionPath = Path(projectDirectory).joinpath(f"sections/{sectionID}")
            if sectionPath.exists():
                sectionPathTree = build_tree(sectionPath)
            else:
                sectionPathTree = []
        except Exception:
            traceback.print_exc()
            return []
        return sectionPathTree

    def omilayer_exists(self, projectID:int, dbPath:str, layerName:str) -> bool:
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        dbFullPath = Path(projectDirectory).joinpath(dbPath)
        omi = Omilayers(str(dbFullPath))
        if omi._dbutils._table_exists(layerName):
            return True
        return False

    def new_omilayer_is_created(self, projectID:int, dbPath:str, layerName:str, layerDescription:str, columns:list) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbPath)

            dtypesMapper = {"TEXT":"VARCHAR", "FLOAT":"DOUBLE", "INTEGER":"BIGINT"}
            queryCols = [f"{col['name']} {dtypesMapper[col['datatype']]}" for col in columns]
            with duckdb.connect(str(dbFullPath)) as con:
                query = f"CREATE TABLE {layerName} ({','.join(queryCols)})"
                con.execute(query)

                query = "INSERT INTO tables_info (name) VALUES (?)"
                con.execute(query, [layerName])

                query = "UPDATE tables_info SET info = (?) WHERE name = (?)"
                if layerDescription:
                    con.execute(query, [layerDescription, layerName])
                else:
                    con.execute(query, ["No available description.", layerName])
        except Exception:
            traceback.print_exc()
            return False
        return True

    def get_column_names_and_dtypes_for_omilayer(self, projectID:int, dbRelativePath:str, layerName:str) -> dict:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbRelativePath)
            dtypesMapper = {"VARCHAR":"TEXT", "DOUBLE":"FLOAT", "BIGINT":"INTEGER"}
            with duckdb.connect(str(dbFullPath), read_only=True) as con:
                query = f"DESCRIBE {layerName}"
                cols = con.execute(query).fetchdf()
        except Exception:
            traceback.print_exc()
            return {}
        return [{"name":record['column_name'], "dtype":dtypesMapper[record['column_type']], "value":""} for record in cols.to_dict(orient='records')]

    def data_are_inserted_to_omilayer(self, projectID:int, dbRelativePath:str, layerName:str, layerData:list) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbRelativePath)
            data = {}
            for item in layerData:
                if item['dtype'] == 'TEXT':
                    data[item['name']] = [item["value"]]
                else:
                    data[item['name']] = [float(item["value"])]
            df = pd.DataFrame(data)
            omi = Omilayers(str(dbFullPath))
            omi.layers[layerName].insert(df)
        except Exception:
            traceback.print_exc()
            return False
        return True

    def file_is_inserted_to_omilayer(self, projectID:str, dbRelativePath:str, layerName:str, uploaded_file, file_extension:str) -> bool:
        try:
            if file_extension == '.xls':
                df = pd.read_excel(uploaded_file, engine='xlrd')
            elif file_extension == '.xlsx':
                df = pd.read_excel(uploaded_file, engine='openpyxl')
            else:
                # sep=None makes pandas to infer the delimiter
                df = pd.read_csv(uploaded_file, sep=None, engine='python')
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbRelativePath)
            omi = Omilayers(str(dbFullPath))
            omi.layers[layerName].insert(df)
        except Exception:
            traceback.print_exc()
            return False
        return True

    def omilayer_description_is_set(self, projectID:int, dbRelativePath:str, layerName:str, layerInfo:str) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbRelativePath)
            omi = Omilayers(str(dbFullPath))
            omi.layers[layerName].set_info(layerInfo)
        except Exception:
            traceback.print_exc()
            return False
        return True

    def omilayer_is_deleted(self, projectID:int, dbRelativePath:str, layerName:str) -> bool:
        try:
            projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
            dbFullPath = Path(projectDirectory).joinpath(dbRelativePath)
            omi = Omilayers(str(dbFullPath))
            omi.layers.drop(layerName)
        except Exception:
            traceback.print_exc()
            return False
        return True


class SectionUtils:

    def __init__(self, ID:int, title:str, tags:str, content:str, sectionDate:str, projectID:int, projectName:str, section_dir_exists:int):
        self.ID = ID
        self.title = title
        self.tags = json.loads(tags)
        self.content = content
        self.sectionDate = sectionDate
        self.projectID = projectID
        self.projectName = projectName
        self.section_dir_exists = section_dir_exists
        tags = tags.strip()

    def render_content_to_html(self):
        renderer = HtmlRenderer(self.projectID, self.projectName, self.content)
        renderedContent = renderer.render_section_content()
        return {
                "projectID"         : self.projectID,
                "projectName"       : tools.get_project_name_based_on_id(self.projectID),
                "ID"                : self.ID,
                "title"             : self.title,
                "tags"              : self.tags,
                "content"           : renderedContent,
                "date"              : self.sectionDate,
                "section_dir_exists": self.section_dir_exists
                }

    def render_content_to_pdf(self):
        renderer = PDFRenderer(self.projectID, self.projectName, self.content)
        renderedContent = renderer.render_section_content()
        return {
                "projectID"         : self.projectID,
                "projectName"       : tools.get_project_name_based_on_id(self.projectID),
                "ID"                : self.ID,
                "title"             : self.title,
                "tags"              : self.tags,
                "content"           : renderedContent,
                "date"              : self.sectionDate,
                "section_dir_exists": self.section_dir_exists
                }



