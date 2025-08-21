Broadcasting
============

By default, *fresfolio* is not accessible by other machines. To make *fresfolio* accessible by other machines connected to the same local network run:

.. code-block:: bash

   fresfolio enable-broadcasting

after doing so, next time *fresfolio* starts 

.. code-block:: bash

   fresfolio start

it will be served on ``http://[LOCALIP]:5000``. The first time the user visits this URL, he will be prompted to setup login credentials by specifying username and password. After completing this step, a login page will be presented in the subsequent connections. To reset the login credentials run:

.. code-block:: bash

   fresfolio reset-user

during the next connection, the user will be prompted to setup new login credentials.

To disable broadcasting:

.. code-block:: bash

   fresfolio disable-broadcasting

.. danger::

    In the current implementation, broadcasting trasmits data over HTTP instead of HTTPS, which means your data is transmitted without encryption. Anyone on the same network may be able to intercept or manipulate your traffic. Thus, use broadcasting **ONLY** on trusted networks and ensure that only trusted machines are connected to the network.


