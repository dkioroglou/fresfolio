.. |br| raw:: html

   <br />

.. _Section anatomy:

Section anatomy
===============

.. image:: images/section.png
   :width: 1000
   :height: 100
   :alt: section
   :align: center

|br|

Each section is consisted of the following parts:

Section title
-------------

When a section is created the title "*New section*" is given. Clicking on the section title folds and unfolds the section's body.

Section toolbar
---------------

The section's body starts with the toolbar. To the left, the following are visible:

* ``project``: this is name of the project the section belongs to.
* ``id``: this is a unique number *fresfolio* assigns to each section.
* ``date``: the section's creating date. 
* ``+Tags`` button: pressing this button the user can assign tags (separated with comma) to the section. Tags are useful for grouping sections.

To the right the following are visible:

* **1st button** can be used to change section's title.
* **2nd button** is used to pin the section to the "Pin drawer" for fast access.
* **3rd button** creates a directory named after the section's ``id`` in the following path:

    .. code-block:: text

        Project-name
        ├── project.db
        └── sections
            └── [id]

* **4th button** is a ``Menu`` button with the following options:

  * **Copy to clipboard**: copies the raw markdown content of the section to the clipboard.
  * **Export section to PDF**: exports the content of the current section to a PDF file using ``typst``. Note that ``typst`` should already be installed on the system and in the ``PATH``. The PDF files is stored in ``sections/[id]``.
  * **Export section to .typ**: converts the content of the current section to ``typst`` text and stores it in a ``.typ`` file in  ``sections/[id]``. This allows the user to edit the file and later compile it with ``typst`` to PDF.
  * **Delete section**: deletes the section in ``project.db`` and its directory if it exists.

    Additional options that become available if the section directory is created:

  * **View section directory tree**: when pressed, a dialog pops-up showing the file structure of the section's directory.
  * **Upload files**: when pressed, a dialog pops-up to upload files to the section's directory. Note that this will copy the uploaded file from its location to the section's directory. This option is especially useful for broadcasting.

* **5th button** when pressed an editor appears, allowing the user to modify the section’s content.

