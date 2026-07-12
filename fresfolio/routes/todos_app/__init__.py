from flask import Blueprint, render_template, request, jsonify
from fresfolio.utils import tools
from fresfolio.routes.todos_app.appclass import AppClass

todosapp = Blueprint('todosapp', __name__)

@todosapp.route('/todos/api/get-todos', methods=['POST'])
def todos_get_todos():
    data = request.get_json()
    project_id = data['projectID']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        todos = appCLS.get_todos()
    except Exception:
        tools.log_traceback()
        return "", 400
    return jsonify(todos)

@todosapp.route('/todos/api/create-todo', methods=['POST'])
def todos_create_todo():
    data = request.get_json()
    project_id = data['projectID']
    todo = data['todo']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        appCLS.create_todo(todo)
    except Exception:
        tools.log_traceback()
        return "", 400
    return "", 200

@todosapp.route('/todos/api/set-todo-done', methods=['POST'])
def todos_create_set_todo_done():
    data = request.get_json()
    project_id = data['projectID']
    todoID = data['todoID']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        appCLS.set_todo_done(todoID)
    except Exception:
        tools.log_traceback()
        return "Cannot set todo done", 400
    return "", 200

@todosapp.route('/todos/api/set-todo-not-done', methods=['POST'])
def todos_create_set_todo_not_done():
    data = request.get_json()
    project_id = data['projectID']
    todoID = data['todoID']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        appCLS.set_todo_not_done(todoID)
    except Exception:
        tools.log_traceback()
        return "Cannot set todo not done", 400
    return "", 200

@todosapp.route('/todos/api/delete-todo', methods=['POST'])
def todos_delete_todo():
    data = request.get_json()
    project_id = data['projectID']
    todoID = data['todoID']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        appCLS.delete_todo(todoID)
    except Exception:
        tools.log_traceback()
        return "Cannot delete todo.", 400
    return "", 200

@todosapp.route('/todos/api/set-todo', methods=['POST'])
def todos_set_todo():
    data = request.get_json()
    project_id = data['projectID']
    todoID = data['todoID']
    newTodoText = data['newTodoText']
    try:
        project_dir, _ = tools.get_paths_for_project_dir_and_db(project_id)
        appCLS = AppClass(project_dir)
        appCLS.set_todo(todoID, newTodoText)
    except Exception:
        tools.log_traceback()
        return "Cannot rename todo.", 400
    return "", 200

