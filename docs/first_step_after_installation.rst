First step after installation
=============================

fresfolio cli
-------------

*fresfolio* comes with a command-line interface. To see the commands *fresfolio* can execute:

.. code-block:: bash

   fresfolio --help

To get help on a specific command:

.. code-block:: bash

   fresfolio [COMMAND] --help

.. _Initialize fresfolio:

Initialize fresfolio
--------------------

After installation, *fresfolio* needs to be initialized:

.. code-block:: bash

   fresfolio init

This is done only once and does the following:

* It creates the **fresfolio directory**: ``$HOME/fresfolio``
* It creates the **fresfolio SQLite database**: ``$HOME/fresfolio/fresfolio.db``
* It creates the **projects directory**: ``$HOME/fresfolio/projects``

The path ``$HOME/fresfolio/projects`` is the default path where *fresfolio* stores the created projects. To change this path you can do one of the following:

.. code-block:: bash

   # Method 1
   cd $HOME/dir1/dir2
   mkdir dir3
   fresfolio set-projects-dir dir3

   # Method 2
   cd $HOME/dir1/dir2/dir3
   fresfolio set-projects-dir .

Based on the example above, *fresfolio* will store created projects in the path ``$HOME/dir1/dir2/dir3``.
To view the paths *fresfolio* uses run:

.. code-block:: bash

   fresfolio info


