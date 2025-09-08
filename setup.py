from setuptools import setup, find_packages
import codecs
import os

def read_file(path):
    with open(path) as contents:
        return contents.read()

here = os.path.abspath(os.path.dirname(__file__))

with codecs.open(os.path.join(here, "README.md"), encoding="utf-8") as fh:
    long_description = "\n" + fh.read()

VERSION = '0.2.2'
DESCRIPTION = 'Flask and Vue3 based notebook for personal and research projects.'
LONG_DESCRIPTION = 'A Flask and Vue3 based notebook for managing and sharing personal and research projects.'

# Setting up
setup(
    name="fresfolio",
    version=VERSION,
    author="Dimitrios Kioroglou",
    author_email="<d.kioroglou@hotmail.com>",
    url="https://github.com/dkioroglou/fresfolio/tree/main",
    license="GPL-3.0",
    description=DESCRIPTION,
    long_description_content_type="text/markdown",
    long_description=long_description,
    keywords=["flask", "notebook", "research", "reporting"],
    install_requires=read_file("requirements.txt"),
    packages=find_packages(),
    classifiers=[
        "Development Status :: 1 - Planning",
        "Intended Audience :: Science/Research",
        "Programming Language :: Python :: 3",
        "Operating System :: Unix",
        "Operating System :: MacOS :: MacOS X",
        "Operating System :: Microsoft :: Windows",
    ],
    package_data={
        "fresfolio": [
            "static/css/*",
            "static/js/*",
            "static/icons/*",
            "templates/*"
        ]
    },
    entry_points={
        "console_scripts": [
            "fresfolio = fresfolio.cli.script:frescli"
        ]
    },
    zip_safe=False,
)
