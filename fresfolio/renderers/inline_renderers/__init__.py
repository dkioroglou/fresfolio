import re
import traceback
import ast
from fresfolio.utils import tools

class InlineRenderers:

    def __init__(self):
        self.PATTERNS = {
                "bold": re.compile(r'\*\*(.*?)\*\*'),
                "italics": re.compile(r'__(.*?)__'),
                "code": re.compile(r'`(.*?)`'),
                "link": re.compile(r'\[(.*?)\]\((\S+?)\)(?=\s|,|\.|\)|$)'),
                "text-red": re.compile(r'\\text-red{(.*?)}'),
                "text-green": re.compile(r'\\text-green{(.*?)}'),
                "icon": re.compile(r'\\(todo|done|info|error)'),
                "math": re.compile(r'(?<!\w)\$(.+?)\$(?!\w)'),
                "button": re.compile(r'\\button{\s*(.*?)\s*,\s*(.*?)\s*}'),
                "view": re.compile(r'\\view\{([^}]*)\}'),
                "newline": re.compile(r'\\br\b'),
                "underscore": re.compile(r'\+\+(.*?)\+\+')
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
                        renderedText = f'<span class="app-badge">{extension.upper()}</span><a class="app-link" href="{url}">{label}</a>'
                    else:
                        renderedText = f'<a class="app-link" href="{url}">{label}</a>'
                except Exception:
                    traceback.print_exc()
                    renderedText = f'<a class="app-link" href="{url}">{label}</a>'
                    return renderedText
            else:
                renderedText = f'<a class="app-link" href="{url}">{label}</a>'
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

    def render_view_markups(self, text: str) -> str:
        """Convert view markups."""
        def render_markup(match):
            JSONstr = match.group(1)
            # Convert to Python dict syntax
            JSONstr = re.sub(r'(\w+)\s*:', r'"\1": ', JSONstr)
            # Wrap with braces
            JSONstr = '{' + JSONstr + '}'
            JSON = ast.literal_eval(JSONstr)

            if "project" not in JSON:
                renderedText = text
            elif 'chapter' not in JSON and 'sections' not in JSON:
                renderedText = text
            elif 'chapter' in JSON and 'notebook' not in JSON:
                renderedText = text
            else:
                projectName = JSON['project']
                projectInfo = tools.get_project_info(projectName)
                projectID = projectInfo['ID']
                if 'chapter' in JSON:
                    notebookName = JSON['notebook']
                    notebookID = tools.get_notebook_ID_based_on_name(projectID, notebookName)
                    chapterName = JSON['chapter']
                    chapterID = tools.get_chapter_ID_based_on_name(projectID, notebookID, chapterName) 
                    IDs = tools.get_sections_IDs_for_chapter(projectID, chapterID)
                else:
                    IDs = JSON['sections']

                if not IDs:
                    renderedText = text
                else:
                    IDs = ",".join(map(str, IDs))
                    if 'chapter' in JSON:
                        renderedText = f'<action-link data-args="{projectName},{IDs}" style="cursor: pointer;" class="app-link">view:{projectName}:{notebookName}:{chapterName}</action-link>'
                    else:
                        renderedText = f'<action-link data-args="{projectName},{IDs}" style="cursor: pointer;" class="app-link">view:{projectName}</action-link>'
            return renderedText
        return self.PATTERNS['view'].sub(render_markup, text)

    def render_newline_markups(self, text: str) -> str:
        """Converts br to html <br> tags."""
        def render_markup(match):
            return "<br>"
        return self.PATTERNS['newline'].sub(render_markup, text)

    def render_underscore_markups(self, text: str) -> str:
        """Converts underscore markups to html <u> tags."""
        def render_markup(match):
            underscoredText = match.group(1)
            renderedText = f"<u>{underscoredText}</u>"
            return renderedText
        return self.PATTERNS['underscore'].sub(render_markup, text)


class PDFInlineRenderers:

    def __init__(self):
        self.PATTERNS = {
                "bold": re.compile(r'\*\*(.*?)\*\*'),
                "italics": re.compile(r'__(.*?)__'),
                "code": re.compile(r'`(.*?)`'),
                "link": re.compile(r'\[(.*?)\]\((\S+?)\)(?=\s|,|\.|\)|$)'),
                "text-red": re.compile(r'\\text-red{(.*?)}'),
                "text-green": re.compile(r'\\text-green{(.*?)}'),
                "icon": re.compile(r'\\(todo|done|info|error)'),
                "math": re.compile(r'(?<!\w)\$(.+?)\$(?!\w)'),
                "button": re.compile(r'\\button{\s*(.*?)\s*,\s*(.*?)\s*}'),
                "view": re.compile(r'\\view\{([^}]*)\}'),
                "newline": re.compile(r'\\br\b'),
                "underscore": re.compile(r'\+\+(.*?)\+\+')
                }

    def render_markdown_bold_text_markups(self, text: str) -> str:
        """Converts markdown bold markups to typst strong markup."""
        def render_markup(match):
            boldText = match.group(1)
            renderedText = f"*{boldText}*"
            return renderedText
        return self.PATTERNS['bold'].sub(render_markup, text)

    def render_markdown_italics_text_markups(self, text: str) -> str:
        """Converts markdown italics markups to typst emphasis markup."""
        def render_markup(match):
            italicsText = match.group(1)
            renderedText = f"_{italicsText}_"
            return renderedText
        return self.PATTERNS['italics'].sub(render_markup, text)

    def render_markdown_code_text_markups(self, text: str) -> str:
        """Converts markdown inline code markups to typst raw markup."""
        def render_markup(match):
            codeText = match.group(1)
            renderedText = f'`{codeText}`'
            return renderedText
        return self.PATTERNS['code'].sub(render_markup, text)

    def render_markdown_headers_markups(self, text: str) -> str:
        """Converts markdown header markups to typst heading markups."""
        if text.startswith("# "):
            text = "= {}".format(text.split("# ", 1)[-1])
        elif text.startswith("## "):
            text = "== {}".format(text.split("## ", 1)[-1])
        elif text.startswith("### "):
            text = "=== {}".format(text.split("### ", 1)[-1])
        return text

    def render_markdown_ruler_markups(self, text: str) -> str:
        """Converts markdown ruler markups to typst ruler."""
        if text.startswith('---'):
            text = "#line(length: 100%)"
        return text

    def render_markup_link_markups(self, text:str) -> str:
        """Converts markdown link markups to typst link markups."""
        def render_markup(match):
            label, url = match.groups()
            label = label.strip()
            url = url.strip()
            renderedText = f'#link("{url}")[{label}]'
            return renderedText
        return self.PATTERNS['link'].sub(render_markup, text)

    def render_red_text_markups(self, text: str) -> str:
        """Converts latex style red text to typst red colored text."""
        def render_markup(match):
            redText = match.group(1)
            renderedText = f'#text(fill: rgb("#ff4646"))[{redText}]'
            return renderedText
        return self.PATTERNS['text-red'].sub(render_markup, text)

    def render_green_text_markups(self, text: str) -> str:
        """Converts latex style green text to typst green colored text."""
        def render_markup(match):
            greenText = match.group(1)
            renderedText = f'#text(fill: rgb("#178236"))[{greenText}]'
            return renderedText
        return self.PATTERNS['text-green'].sub(render_markup, text)

    def render_icon_markups(self, text: str) -> str:
        """Convert icons to typst emojis and unicodes."""
        icons = {
                'todo' : '#untickedIcon',
                'done' : '#tickedIcon',
                'info' : '#infoIcon',
                'error': '#errorIcon'
                }
        def render_markup(match):
            icon = match.group(1)
            renderedText = icons[icon]
            return renderedText
        return self.PATTERNS['icon'].sub(render_markup, text)

    def render_blockquote_markups(self, text: str) -> str:
        """Convert blockquotes to typst quotes."""
        if text.startswith(">"):
            text = "#quote(block: true)[{}]".format(text[2:])
        return text

    def render_math_inline_markups(self, text: str) -> str:
        """Convert inline math to typst inline math"""
        def render_markup(match):
            mathText = match.group(1)
            renderedText = f'#mi(`{mathText}`)'
            return renderedText
        return self.PATTERNS['math'].sub(render_markup, text)

    def render_newline_markups(self, text: str) -> str:
        """Converts br to html <br> tags."""
        def render_markup(match):
            return "#linebreak()"
        return self.PATTERNS['newline'].sub(render_markup, text)

    def render_underscore_markups(self, text: str) -> str:
        """Converts underscore markups to typst underlined text markup."""
        def render_markup(match):
            underscoredText = match.group(1)
            renderedText = f"#underline[{underscoredText}]"
            return renderedText
        return self.PATTERNS['underscore'].sub(render_markup, text)

