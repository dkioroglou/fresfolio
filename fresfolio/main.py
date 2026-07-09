from flask import Flask
from fresfolio.utils import tools

app = Flask(__name__)
app.config['SECRET_KEY'] = tools.get_app_setting("secret_key")

from fresfolio.routes.core import coreroutes
app.register_blueprint(coreroutes)

from fresfolio.routes.api import apiroutes
app.register_blueprint(apiroutes)

from fresfolio.routes.todos_app import todosapp
app.register_blueprint(todosapp)

