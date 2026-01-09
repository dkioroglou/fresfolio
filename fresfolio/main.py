from flask import Flask
from fresfolio.utils import tools

app = Flask(__name__)
app.config['SECRET_KEY'] = tools.get_app_setting("secret_key")
app.config['has_omilayers'] = tools.is_module_installed("omilayers")
app.config['has_bokeh'] = tools.is_module_installed("bokeh")
app.config['has_openpyxl'] = tools.is_module_installed("openpyxl")
app.config['has_xlrd'] = tools.is_module_installed("xlrd")

from fresfolio.routes.core import coreroutes
app.register_blueprint(coreroutes)

from fresfolio.routes.api import apiroutes
app.register_blueprint(apiroutes)

