import click
from pathlib import Path
from fresfolio.utils import tools
import traceback

APPDIR = Path("~/fresfolio").expanduser()
APPDB = APPDIR.joinpath("fresfolio.db")

def is_app_initialized() -> bool:
    if not APPDIR.exists():
        print("Fresnote has not been initialized yet.")
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
    initializer = AppINIT()

@frescli.command()
@click.option("--port", "-p", type=int, default=5000, help="Port to be used by fresfolio.")
def start(port):
    """Start fresfolio."""
    if not is_app_initialized():
        exit()
    from fresfolio.main import app
    app.run(port=port, debug=True)

@frescli.command()
@click.option("--port", "-p", type=int, default=5000, help="Port to be used by fresfolio.")
def broadcast(port):
    """Start fresfolio in broadcasting mode."""
    if not is_app_initialized():
        exit()
    from fresfolio.main import app
    app.run(host="0.0.0.0", port=port)

@frescli.command()
def info():
    """Get information related to fresfolio."""
    if not is_app_initialized():
        exit()
    print("Fresnote information:")
    print("=====================")
    print(f"     app directory: {APPDIR}")
    print(f"      app database: {APPDB}")
    projectsDir = Path(tools.get_app_setting("projectsDir")).expanduser()
    print(f"projects directory: {projectsDir}")

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
    print(f"Fresnote stores projects in: {projectsDir}")
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
