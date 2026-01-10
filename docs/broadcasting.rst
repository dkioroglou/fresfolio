Broadcasting
============

By default, *fresfolio* is not accessible by other machines. To make *fresfolio* accessible by other machines connected to the same local network run:

.. code-block:: bash

   fresfolio broadcast

it will be served on ``http://[LOCALIP]:5000``. 


.. danger::

    Broadcasting trasmits data over HTTP instead of HTTPS, which means your data is transmitted without encryption. Anyone on the same network may be able to intercept or manipulate your traffic. Thus, use broadcasting **ONLY** on trusted networks and ensure that only trusted machines are connected to the network.


