.. |br| raw:: html

   <br />

Create RAG
==========

.. note::

    This section belongs to the extended functionality of *fresfolio*. Check :ref:`installation-process` process.

Everytime a section is being created or edited, its title, tags and content are converted into an embedding and stored in a `duckdb` instance at ``~/fresfolio/fresfolio_vector.duckdb``. This allows to search for sections using a similarity score (default 0.7) between the search query and the stored embeddings. Search using RAG can be disabled in the search bar.

