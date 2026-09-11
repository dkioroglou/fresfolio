.. |br| raw:: html

   <br />

Chat with AI
============

.. note::

    This section belongs to the extended functionality of *fresfolio*. Check :ref:`installation-process` process. Additionally, it requires an API key from ``Requesty``.


Store your API key
------------------

To allow *fresfolio* to use your API key, run in the command line:

.. code-block:: bash

    fresfolio set-ai-api-key

and then paste your API key in the prompt. The API key will be stored in fresfolio settings of ``~/fresfolio/fresfolio.db``.

Register AI models
------------------

To use AI models you need to edit the json file ``~/fresfolio/ai_models.json``. 
Example of how ``ai_models.json`` should look like:

.. code-block:: json

    [
        {
            "vendor": "google",
            "models": [
                {
                    "model": "vertex/gemini-3.8-flash",
                    "default": "yes",
                    "input": "$0.750/M",
                    "output": "$3.75/M"

                }
            ]
        },
        {
            "vendor": "anthropic",
            "models": [
                {
                    "model": "anthropic/claude-sonnet-5",
                    "default": "no",
                    "input": "$2.00/M",
                    "output": "$10.00/M"
                }
            ]
        },
        {
            "vendor": "openai",
            "models": [
                {
                    "model": "openai/gpt-5.6-luna",
                    "default": "no",
                    "input": "$0.200/M",
                    "output": "$1.20/M"
                }
            ]
        },
        {
            "vendor": "qwen",
            "models": [
                {
                    "model": "alibaba/qwen3.8-flash",
                    "default": "no",
                    "input": "$0.160/M",
                    "output": "$0.470/M"
                }
            ]
        },
        {
            "vendor": "deepseek",
            "models": [
                {
                    "model": "deepseek/deepseek-v4.1-flash",
                    "default": "no",
                    "input": "$0.300/M",
                    "output": "$1.20/M"
                }
            ]
        }
    ]

The keys ``input`` and ``output`` refer to the cost per million input and output tokens. These keys can be empty strings.


AI Chat
-------

If *fresfolio* detects that an API key is stored, the AI chat drawer becomes available. Apart from typical prompts, the user can reference the contents of sections and files, as well as whole chapters and notebooks. To do that use the `@` symbol at the beginning of the prompt's line as following:


.. code-block:: bash

    @section: [ID]
    @file: [PATH]
    @chapter: [ID]
    @notebook: [ID]

The AI responses are returned in the chat as normal sections that can be edited. 

.. note::

    When editing sections in the chat, do not remove the title "Response". It is used to specify the section's part that belongs to the user prompt and the part that represents the model's response.

The user can specify parts of the sections content that will not be send to the AI model using the markers ``\ais`` and ``\aie`` as following:

.. code-block:: raw

    \ais
    Content between these two markers will not be sent to the AI model.
    \aie

**Note**: the section markups ``file``, ``table`` and ``figure`` are not parsed.
