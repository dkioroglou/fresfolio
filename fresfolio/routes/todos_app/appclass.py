import contextlib
import sqlite3
from pathlib import Path

class AppClass:

    def __init__(self, project_path):
        self.db = Path(project_path).joinpath("todos.db")
        if not Path(self.db).exists():
            self.create_db()

    def create_db(self):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                CREATE TABLE todos(
                id INTEGER PRIMARY KEY,
                todo TEXT,
                done INTEGER
                )
                """
                c.execute(query)
                conn.commit()

    def create_todo(self, todo):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = "INSERT INTO todos (todo,done) VALUES (?,?)"
                c.execute(query, (todo, 0))
                conn.commit()

    def set_todo_done(self, todoID):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                UPDATE todos 
                SET done=(?)
                WHERE id=(?)
                """
                c.execute(query, (1, todoID))
                conn.commit()

    def set_todo_not_done(self, todoID):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                UPDATE todos 
                SET done=(?)
                WHERE id=(?)
                """
                c.execute(query, (0, todoID))
                conn.commit()

    def get_todos(self):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                SELECT id,todo,done FROM todos
                """
                c.execute(query)
                results = c.fetchall()
        todos = []
        if results:
            todos = [{"id":res[0], "todo":res[1], "done":res[2]} for res in results]
        return todos

    def set_todo(self, todoID, newTodoText):
        todoID = int(todoID)
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                UPDATE todos 
                SET todo=(?) 
                WHERE id=(?)
                """
                c.execute(query, (newTodoText, todoID))
                conn.commit()

    def delete_todo(self, todoID):
        with contextlib.closing(sqlite3.connect(self.db)) as conn:
            with contextlib.closing(conn.cursor()) as c:
                query = """
                DELETE FROM todos 
                WHERE id=(?)
                """
                c.execute(query, (todoID,))
                conn.commit()

