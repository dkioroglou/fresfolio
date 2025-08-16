from pathlib import Path
import re
import traceback
from typing import List, Tuple, Dict
import os

class InlineRenderers:

    def __init__(self):
        self.PATTERNS = {
                "bold": re.compile(r'\*\*(.*?)\*\*'),
                "italics": re.compile(r'__(.*?)__'),
                "code": re.compile(r'`(.*?)`'),
                "link": re.compile(r'\[(.*?)\]\((.*?)\)'),
                "text-red": re.compile(r'\\text-red{(.*?)}'),
                "text-green": re.compile(r'\\text-green{(.*?)}'),
                "icon": re.compile(r'\\(todo|done|info|error)'),
                "math": re.compile(r'(?<!\w)\$(.+?)\$(?!\w)'),
                "button": re.compile(r'\\button{\s*(.*?)\s*,\s*(.*?)\s*}')
                }

    def render_markdown_bold_text_markups(self, text: str) -> str:
        """Converts markdown bold markups to html <b> tags."""
        def render_markup(match):
            boldText = match.group(1)
            renderedText = f"<b>{boldText}</b>"
            return renderedText
        return self.PATTERNS['bold'].sub(render_markup, text)

    def render_markdown_italics_text_markups(self, text: str) -> str:
        """Converts markdown italics markups to html <i> tags."""
        def render_markup(match):
            italicsText = match.group(1)
            renderedText = f"<i>{italicsText}</i>"
            return renderedText
        return self.PATTERNS['italics'].sub(render_markup, text)

    def render_markdown_code_text_markups(self, text: str) -> str:
        """Converts markdown code markups to html <code> tags."""
        def render_markup(match):
            codeText = match.group(1)
            renderedText = f'<code id="app-code-inline">{codeText}</code>'
            return renderedText
        return self.PATTERNS['code'].sub(render_markup, text)

    def render_markdown_headers_markups(self, text: str) -> str:
        """Converts markdown header markups to html <h1> <h2> or <h3> tags."""
        if text.startswith("# "):
            text = "<h1>{}</h1>".format(text.split("# ", 1)[-1])
        elif text.startswith("## "):
            text = "<h2>{}</h2>".format(text.split("## ", 1)[-1])
        elif text.startswith("### "):
            text = "<h3>{}</h3>".format(text.split("### ", 1)[-1])
        return text

    def render_markdown_ruler_markups(self, text: str) -> str:
        """Converts markdown ruler markups to html <hr> tag."""
        if text.startswith('---'):
            text = "<hr>"
        return text

    def render_markup_link_markups(self, text:str) -> str:
        """Converts markdown link markups to html <a> tag."""
        def render_markup(match):
            label, url = match.groups()
            label = label.strip()
            url = url.strip()
            if "." in url:
                try:
                    extension = url.split(".")[-1].lower()
                    docExtensions = {
                                     'pdf': True,
                                     'docx': True, 
                                     'doc': True, 
                                     'xls': True, 
                                     'xlsx': True,
                                     'csv': True,
                                     'tsv': True,
                                     'txt': True,
                                     'md': True,
                                     'ppt': True,
                                     'pptx': True,
                                     'py': True,
                                     'R': True,
                                     'Rscript': True
                                     }
                    if docExtensions.get(extension, False):
                        renderedText = f'<span class="app-badge">{extension.upper()}</span><a href="{url}">{label}</a>'
                    else:
                        renderedText = f'<a href="{url}">{label}</a>'
                except Exception:
                    traceback.print_exc()
                    renderedText = f'<a href="{url}">{label}</a>'
                    return renderedText
            else:
                renderedText = f'<a href="{url}">{label}</a>'
            return renderedText
        return self.PATTERNS['link'].sub(render_markup, text)

    def render_red_text_markups(self, text: str) -> str:
        """Converts latex style red text to html text style tag."""
        def render_markup(match):
            redText = match.group(1)
            renderedText = f'<span class="app-text-red">{redText}</span>'
            return renderedText
        return self.PATTERNS['text-red'].sub(render_markup, text)

    def render_green_text_markups(self, text: str) -> str:
        """Converts latex style green text to html text style tag."""
        def render_markup(match):
            greenText = match.group(1)
            renderedText = f'<span class="app-text-green">{greenText}</span>'
            return renderedText
        return self.PATTERNS['text-green'].sub(render_markup, text)

    def render_icon_markups(self, text: str) -> str:
        icons = {
                'todo' : '<img class="app-inline-icon" src="/static/icons/todo-circle-regular.svg" alt="drawing" width="20"/>',
                'done' : '<img class="app-inline-icon" src="/static/icons/check-circle-regular.svg" alt="drawing" width="20"/>',
                'info' : '<img class="app-inline-icon" src="/static/icons/info_blue.svg" alt="drawing" width="20"/>',
                'error': '<img class="app-inline-icon" src="/static/icons/info_red.svg" alt="drawing" width="20"/>'
                }
        def render_markup(match):
            icon = match.group(1)
            renderedText = icons[icon]
            return renderedText
        return self.PATTERNS['icon'].sub(render_markup, text)

    def render_blockquote_markups(self, text: str) -> str:
        if text.startswith(">"):
            text = "<blockquote>{}</blockquote>".format(text[2:])
        return text

    def render_math_inline_markups(self, text: str) -> str:
        def render_markup(match):
            mathText = match.group(1)
            renderedText = f"<span class='katex-math-inline'>{mathText}</span>"
            return renderedText
        return self.PATTERNS['math'].sub(render_markup, text)

    def render_button_markups(self, text: str) -> str:
        def render_markup(match):
            label, link  = match.groups()
            label = label.strip()
            link = link.strip()
            if label and link:
                text = f'<a target="_blank" class="app-html-button q-btn q-mt-md" style="cursor: pointer;" href="{link}"><span class="q-btn__content" style="padding-top: 2px;">{label}</span></a>'
            return text
        return self.PATTERNS['button'].sub(render_markup, text)

    def render_link_markups(self, text: str) -> str:
        """Convert latex style link to html style <a> tag."""
        if "\\link{" in text:
            probe = r'\\\\link{(.*?)}'
            links = re.findall(probe, text)
            for link in links:
                try:
                    if ',' in link:
                        referenceText, url = link.split(',', 1)
                        referenceText = referenceText.strip()
                        url = url.strip()
                        if url.startswith('/'):
                            filename = Path(url).name
                            extension = Path(url).suffix
                            if extension in svgIcons:
                                renderedText = '<a href="{}"><img id="todoIcon" src="/static/fresfolio/icons/{}" alt="drawing" width="20"/> {}</a>'.format(url, svgIcons[extension], referenceText)
                            else:
                                renderedText = '<a href="{}">{}</a>'.format(url, referenceText)
                        else:
                            if isUrlImage(url):
                                renderedText = """
                                <div class="row q-mb-md"><frn-tag>figures</frn-tag></div><div class="row q-gutter-md q-ml-xl items-start">
                                    <div class="col-2">
                                        <a href="{}" target="_blank">
                                            <img src="{}" class="frn-image cursor-pointer q-hoverable"></img>
                                        </a>
                                        <div class="frn-image-caption">{}</div>
                                    </div>
                                </div>
                                    """.format(url, url, referenceText)
                            elif isUrlVideo(url, referenceText):
                                renderedText = """
                                <div class="row q-mb-md"><frn-tag>videos</frn-tag></div><div class="row q-gutter-md q-ml-xl items-start">
                                    <div class="col-2">
                                        <iframe src="{}" width="640" height="360" frameborder="0" scrolling="no" allowfullscreen title="{}"></iframe>
                                    </div>
                                </div>
                                    """.format(url, referenceText)
                            else:
                                renderedText = '<a href="{}">{}</a>'.format(url, referenceText)
                    else:
                        if link.startswith('/'):
                            filename = Path(link).name
                            extension = Path(link).suffix
                            if extension in svgIcons:
                                renderedText = '<a href="{}"><img id="todoIcon" src="/static/fresfolio/icons/{}" alt="drawing" width="20"/> {}</a>'.format(link, svgIcons[extension], filename)
                            else:
                                renderedText = '<a href="{}">{}</a>'.format(link, filename)
                        else:
                            if isUrlImage(link):
                                renderedText = """
                                <div class="row q-mb-md"><frn-tag>figures</frn-tag></div><div class="row q-gutter-md q-ml-xl items-start">
                                    <div class="col-2">
                                        <a href="{}" target="_blank">
                                            <img src="{}" class="frn-image cursor-pointer q-hoverable"></img>
                                        </a>
                                        <div class="frn-image-caption">{}</div>
                                    </div>
                                </div>
                                    """.format(link, link, 'External image')
                            else:
                                renderedText = '<a href="{}">{}</a>'.format(link, link)
                except Exception:
                    text = markupError("link", "Error parsing markup.", text)
                text = text.replace(f'\\link{{{link}}}', renderedText)
        return text
