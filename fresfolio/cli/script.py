import click
from pathlib import Path
from fresfolio.utils import tools
import json
import traceback

APPDIR = Path("~/fresfolio").expanduser()
APPDB = APPDIR.joinpath("fresfolio.db")

def is_app_initialized() -> bool:
    if not APPDIR.exists():
        print("Fresfolio has not been initialized yet.")
        print("Run: fresfolio init")
        return False
    return True

@click.group()
def frescli():
    pass

@frescli.command()
def init():
    """Initialize fresfolio app."""
    from fresfolio.utils.classes import AppINIT
    AppINIT()

@frescli.command()
def settings():
    """Get all fresfolio settings."""
    if not is_app_initialized():
        exit()

    projectsDir = Path(tools.get_app_setting("projectsDir")).expanduser()
    all_settings = tools.get_all_app_settings()

    # Collect every label so we can compute the max width for alignment
    labels = ["app directory", "app database", "projects directory"]
    if all_settings is not None:
        labels += [key for key, _ in all_settings]

    width = max(len(label) for label in labels)

    print("fresfolio information:")
    print("=====================")
    print(f"{'app directory':<{width}} : {APPDIR}")
    print(f"{'app database':<{width}} : {APPDB}")
    print()
    print("fresfolio settings:")
    print("=====================")
    print(f"{'projects directory':<{width}} : {projectsDir}")
    if all_settings is not None:
        for key, value in all_settings:
            print(f"{key:<{width}} : {value}")

@frescli.command()
def set_ai_api_key():
    """Add or update API key for AI."""
    if not is_app_initialized():
        exit()
    api_key = input("api-key: ")

    try:
        tools.set_app_setting(setting='ai_api_key', value=api_key)
    except Exception:
        traceback.print_exc()
        exit("Could not set API key.")
    print("AI API KEY has been set successfully.")

    file_path = APPDIR.joinpath("ai_models.json")
    if not file_path.exists():
        try:
            with open(file_path, 'w') as outf:
                print(json.dumps([]), file=outf)
        except Exception:
            traceback.print_exc()
            exit("Could not create ai_models.json.")
        print(f"Add AI models to file: {file_path}")

@frescli.command()
@click.option("--port", "-p", type=int, default=5000, help="Port to be used by fresfolio.")
@click.option("--broadcast", "-b", is_flag=True, help="Flag for broadcasting in the local network.")
def start(port, broadcast):
    """Start fresfolio."""
    if not is_app_initialized():
        exit()

    # Clear fresfolio log file.
    with open(APPDIR.joinpath("fresfolio.log"), 'w'):
        pass

    # Solving lack of UUIDs in previous versions.
    if tools.get_app_setting("has_set_uuids") is None:
        print("NOTE: this version of fresfolio needs to gerenate UUIDs for projects.")
        print("Make necessary backups of your projects before proceeding.")
        while True:
            answer = input("Proceed (y/n): ").lower().strip()
            
            if answer == 'y':
                break
            if answer == 'n':
                exit()
            
            print("Invalid input. Please enter 'y' or 'n'.")
        if not tools.table_has_column(APPDB, "projects", "uuid"):
            if not tools.uuid_column_added_to_table(APPDB, "projects"):
                exit(f"Could not add uuid to table 'projects' of {APPDIR}.")
        tools.set_app_setting("has_set_uuids", 1)

    from fresfolio.main import app
    if broadcast:
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        app.run(port=port, debug=True)


@frescli.command()
@click.argument("directory")
def set_projects_dir(directory):
    """Set directory where fresfolio will store projects. Use '.' to denote current directory."""
    if not is_app_initialized():
        exit()
    if directory == '.':
        projectsDir = Path.cwd()
    else:
        if not Path(directory).is_dir():
            exit(f"'{directory}' is not a directory.")
        projectsDir = Path(directory).resolve()
        if not projectsDir.exists():
            exit(f"Directory '{directory}' does not exist.")
    try:
        tools.set_app_setting("projectsDir", str(projectsDir))
    except Exception:
        traceback.print_exc()
        exit()
    print("Projects directory has been changed.")

@frescli.command()
@click.argument("path")
def set_project_path(path):
    "Set new path for a project that has been moved from the projects directory. Use '.' to denote current path."
    if not is_app_initialized():
        exit()
    from fresfolio.utils.classes import ProjectsUtils
    if path == '.':
        projectPath = Path.cwd()
    else:
        if not Path(path).is_dir():
            exit(f"'{path}' is not a directory.")
        projectPath = Path(path).resolve()
    projectName = projectPath.name
    PUTL = ProjectsUtils()
    if not PUTL.project_exists(projectName):
        exit(f"'{projectName}' is not a name of an existing project.")
    if not PUTL.project_path_is_set(projectName, projectPath):
        print("Cannot set project path.")
        exit()
    print("Project path has been changed.")

@frescli.command()
def ls_projects():
    "List projects along with their directory."
    if not is_app_initialized():
        exit()
    projectsDir = tools.get_app_setting("projectsDir")
    projects = tools.get_projects_names_and_paths()
    print()
    print(f"Fresfolio stores projects in: {projectsDir}")
    print()
    for result in projects:
        name, projectPath = result
        print(f"  project: {name}")
        print(f"directory: {projectPath}")
        print(f"   exists: {Path(projectPath).exists()}")
        print()

@frescli.command()
@click.argument("directory")
def import_project(directory):
    "Import directory as project to fresfolio."
    if not is_app_initialized():
        exit()
    from fresfolio.utils.classes import ProjectsUtils
    if directory == '.':
        projectPath = Path.cwd()
    else:
        if not Path(directory).is_dir():
            exit(f"'{directory}' is not a directory.")
        projectPath = Path(directory).resolve()
    projectName = projectPath.name
    if " " in projectName:
        print("Whitespaces are not allowed in project names.")
        print(f"Cannot import directory '{projectName}'.")
        exit()
    if not projectPath.joinpath("project.db").exists():
        print(f"Project database 'project.db' not found in directory '{projectName}'.")
        print(f"Cannot import directory '{projectName}'.")
        exit()
    PUTL = ProjectsUtils()
    if PUTL.project_exists(projectName):
        print(f"Project name '{projectName}' already exists.")
        print("Rename directory and try again.")
        exit()
    if not PUTL.project_is_imported(projectName, str(projectPath)):
        print(f"Cannot import project {projectName}.")
        exit()
    print("Project has been imported.")

if __name__ == '__main__':
    frescli()
