.. raw:: html

   <style> .red {color:red;} </style>
   <style> .green {color:green;} </style>

.. |br| raw:: html

   <br />

.. role:: red

.. role:: green

.. |doneicon| image:: images/check-circle-regular.png
   :width: 20px
   :height: 20px
   :alt: icon
   :align: middle

.. |todoicon| image:: images/todo-circle-regular.png
   :width: 20px
   :height: 20px
   :alt: icon
   :align: middle

.. |infoicon| image:: images/info_blue.png
   :width: 20px
   :height: 20px
   :alt: icon
   :align: middle

.. |erroricon| image:: images/info_red.png
   :width: 20px
   :height: 20px
   :alt: icon
   :align: middle


Section content
===============

The section content is stored in the ``project.db`` as plain text and is converted to html for rendering. For typesetting, Markdown and Latex-like syntax can be used.

Inline markup syntax
--------------------

Markdown syntax
~~~~~~~~~~~~~~~

Markdown syntax can be used for following inline typesetting:

===================   ==============
syntax                rendering
===================   ==============
``# Title 1``         Title 1
``## Title 2``        Title 2
``### Title 3``       Title 3
``**bold text**``     **bold text**
``__italic text__``   *italic text*
```inline code```     ``inline code``
``[LINKNAME](url)``   URL link with name ``LINKNAME``
``$MATH$``            Inline math symbols and equations.
===================   ==============

Latex like syntax
~~~~~~~~~~~~~~~~~

Latex like syntax can be used for the following inline typesetting:

===================================   ==============
syntax                                rendering
===================================   ==============
``\text-green{This is green text}``   :green:`This is green text`
``\text-red{This is red text}``       :red:`This is red text`
``\button{LABEL, URL}``               A button with label "LABEL" that directs to "URL"
===================================   ==============

Icons
~~~~~

The following icons are available for inline use:

===================   ==============
syntax                rendering
===================   ==============
``\todo``             |todoicon|
``\done``             |doneicon|
``\info``             |infoicon|
``\error``            |erroricon|
===================   ==============

Multiline markup syntax
-----------------------

Markdown syntax
~~~~~~~~~~~~~~~

The following markdown syntax can be used for multi-line typesetting:

Lists
^^^^^

using asterisks:

.. code-block::

   * item1
   * item2
   * item3

or using dashes:

.. code-block::

   - item1
   - item2
   - item3

**Rendering**

.. image:: images/list_rendering.png
   :width: 160
   :height: 112
   :alt: List-rendering
   :align: center


Code blocks
^^^^^^^^^^^

.. code-block::

   ```
   def foo(x):
       return x + 1

   print(foo(10))
   ```

**Rendering**

.. image:: images/code_block_rendering.png
   :width: 223
   :height: 113
   :alt: Code-block-rendering
   :align: center

Multi-line math
^^^^^^^^^^^^^^^

.. code-block::

   $$
   x + y = z \\
   y + z = 4 
   $$

**Rendering**

.. image:: images/multiline-math-rendering.png
   :width: 140
   :height: 83
   :alt: Multiline-math-rendering
   :align: center

Latex like syntax
~~~~~~~~~~~~~~~~~

The Latex like syntax for multi-line typesetting has the following general syntax:

.. code-block:: latex

   \begin{markup}[options]
   entry
   \end{markup}

Colored notes
^^^^^^^^^^^^^

.. code-block:: latex

   \begin{note}[blue]
   **Lorem ipsum**
   Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean auctor malesuada nibh 
   in rhoncus.
   \end{note}

Colored notes are available with blue, red and green background and the color is passed in the options:

- ``\begin{note}[blue]``
- ``\begin{note}[red]``
- ``\begin{note}[green]``

**Rendering**

.. image:: images/colored_note_rendering.png
   :width: 854
   :height: 218
   :alt: colored_note_rendering
   :align: center

|br|

Tables
^^^^^^

.. code-block:: latex

    \begin{table}[title: My title]
    col1, col2, col3, col4
    10, 20, 30, 40
    100,200,300,400
    100.21, 200.34, 300.55, 400.59
    \end{table}

.. code-block:: latex

    \begin{table}[project:PROJECT, file:FILE, title: My title]
    \end{table}

Tables have the following options:

* ``title``: if omitted, the table header defaults to the title "**Table [NUMBER]**". If included, for instance ``title: My title``, it gives the possibility to add a custom title to the table "**Table [NUMBER]: My title**". The table number gets incremented based on the number of tables that exist in a given section.
* ``project``: it refers to the name of an existing project and is optional. If omitted, the current project is considered.
* ``file``: this option gives the possibility to load a table from a file. It referes to the path of an existing file relative to the root directory of the project. For instance, ``file: dir1/dir2/foo.csv``. Wildcards can also be used, example ``file: dir1/dir2/*.csv``. In this case, a table will be created for each file. The delimiter can be comma or tab and is identified from the first line of each file that should contain the names of the table columns.

**Rendering**

.. image:: images/table_rendering.png
   :width: 855
   :height: 146
   :alt: table_rendering
   :align: center

|br|

Figures
^^^^^^^

.. code-block:: latex

    \begin{figures}[title:My title]
    project: PROJECT
    figure: figure_1.png
    caption: This is the caption of the Figure 1

    project: PROJECT
    figure: figure_2.png
    caption: This is the caption of the Figure 2
    \end{figures}

.. code-block:: latex

    \begin{figures}[project:PROJECT, file:FILE, title:My title]
    \end{figures}


Figures can have one or more entries. Each entry is consisted of the following fields:

* ``project``: refers to the name of an existing project and is optional. If omitted, the current project is considered.
* ``figure``: should be the path to an existing figure relative to the root directory of the project.
* ``caption``: refers to the caption of the figure and is optional. If omitted, the caption "**Caption not available**" is rendered. 

Figures can have the following options:

* ``title``: if omitted, the figures header defaults to the title "**Figures**". If included, for instance ``title: My title``, it gives the possibility to add a custom title to the figures header "**Figures: My title**".
* ``project``: refers to the name of an existing project and is optional. If omitted, the current project is considered.
* ``file``: it refers to the path relative to the root directory of the project, and it gives the possibility to load figures using wildcards, example ``file: dir1/dir2/*.jpg``. Using this options it is not possible to add caption to each figure.


Figures are rendered as clickable thumbnails.

**Rendering**

.. image:: images/figures_rendering_1.png
   :width: 356
   :height: 119
   :alt: figures_rendering_1
   :align: center



