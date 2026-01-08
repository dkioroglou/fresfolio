import re
import traceback
from fresfolio.utils import tools
from fresfolio.renderers.multiline_renderers import (HtmlParagraphTag, 
                                                    HtmlListTag, 
                                                    HtmlNoteTag, 
                                                    HtmlMathTag, 
                                                    HtmlCodeTag, 
                                                    HtmlTableTag,
                                                    HtmlFiguresTag,
                                                    HtmlFilesTag,
                                                    HtmlOmilayersTableTag,
                                                    HtmlOmilayersPlotTag,
                                                    PDFParagraphTag,
                                                    PDFCodeTag,
                                                    PDFlListTag,
                                                    PDFNoteTag,
                                                    PDFMathTag,
                                                    PDFTableTag,
                                                    PDFFiguresTag,
                                                    PDFFilesTag,
                                                    PDFOmilayersTableTag,
                                                    PDFOmilayersPlotTag
                                                    )

class HtmlRenderer:

    def __init__(self, projectID:int, projectName:str, section_content:str):
        self.projectID = projectID
        self.projectName = projectName
        self.lines = section_content.strip().split('\n')
        self.containers = []
        self.buffer = []
        self.bufferRaw = []
        self.tag_args = None
        self.begin_tag = None
        self.end_tag = None
        self.list_buffer = []
        self.currentTableIDX = 1 # used for enumerating tables
        self.currentFigureIDX = 1 # used for enumerating figures
        self.toggle_tags = {
                            '$$': 'math',
                            '```': 'code'
                            }
        self.html_tags = {
                "paragraph": HtmlParagraphTag,
                "code": HtmlCodeTag,
                "list": HtmlListTag,
                "math": HtmlMathTag,
                "note": HtmlNoteTag,
                "table": HtmlTableTag,
                "figures": HtmlFiguresTag,
                "files": HtmlFilesTag,
                "omitable": HtmlOmilayersTableTag,
                "omiplot": HtmlOmilayersPlotTag
                }

        self.syntax_error_message = """
<div>
    <img class="app-icon" src="/static/icons/info_red.svg" alt="drawing" width="20"/>
    <span style="color:#ca4b4b">Syntax error</span>
</div>
"""

    @property
    def previous_multilined_block_closed_properly(self) -> bool:
        if not self.begin_tag or not self.end_tag:
            return False
        return self.begin_tag == self.end_tag

    def _addNewContainer(self, containerType:str, title:str) -> None:
        """
        There are two types of containers:
        1. normal = content will be rendered normally.
        2. fold = content will be rendered inside a fold.
        """
        self.containers.append({"container":containerType, "title":title, "content":[]})

    @property
    def _lastContainerContent(self) -> list:
        return self.containers[-1]['content']

    def _addNewContentToLastContainer(self, contentType:str, containerTitle="") -> None:
        self._lastContainerContent.append({"type":contentType, "containerTitle":containerTitle, "html":[]})

    def _addHTMLToLastInsertedContent(self, html:str) -> None:
        self._lastContainerContent[-1]['html'].append(html)


    @property
    def _flush_buffer(self):
        if self.buffer or self.tag_args:
            customRenderedTags = ['figures', 'table', 'files', 'omitable', 'omiplot']
            try:
                rendererCLS = self.html_tags[self.begin_tag]
            except Exception:
                traceback.print_exc()
                self._report_syntax_error
            try:
                if self.begin_tag == "table":
                    if not self.tag_args:
                        self.tag_args = ""
                    renderer = rendererCLS(self.projectName, self.currentTableIDX, self.buffer, self.tag_args)
                    tablesJSON, self.currentTableIDX = renderer.render_lines()
                    for JSON in tablesJSON:
                        self._addNewContentToLastContainer(self.begin_tag)
                        self._addHTMLToLastInsertedContent(JSON)
                elif self.begin_tag == "figures":
                    renderer = rendererCLS(self.projectName, self.currentFigureIDX, self.buffer, self.tag_args)
                    figsJSON, self.currentFigureIDX, figsTitle = renderer.render_lines()
                    self._addNewContentToLastContainer(self.begin_tag, containerTitle=figsTitle)
                    for JSON in figsJSON:
                        self._addHTMLToLastInsertedContent(JSON)
                elif self.begin_tag == "files":
                    renderer = rendererCLS(self.projectName, self.buffer, self.tag_args)
                    filesJSON, filesTitle = renderer.render_lines()
                    self._addNewContentToLastContainer(self.begin_tag, containerTitle=filesTitle)
                    for JSON in filesJSON:
                        self._addHTMLToLastInsertedContent(JSON)
                elif self.begin_tag == "omitable":
                    self._addNewContentToLastContainer(self.begin_tag)
                    self._lastContainerContent[-1]['has_omilayers'] = int(tools.is_module_installed('omilayers'))
                    if tools.is_module_installed('omilayers'):
                        renderer = rendererCLS(self.projectName, self.buffer)
                        filesJSON = renderer.render_lines()
                        for JSON in filesJSON:
                            self._addHTMLToLastInsertedContent(JSON)
                elif self.begin_tag == "omiplot":
                    self._addNewContentToLastContainer(self.begin_tag)
                    self._lastContainerContent[-1]['has_omilayers'] = int(tools.is_module_installed('omilayers'))
                    self._lastContainerContent[-1]['has_bokeh'] = int(tools.is_module_installed('bokeh'))
                    if tools.is_module_installed('omilayers') and tools.is_module_installed('bokeh'):
                        renderer = rendererCLS(self.projectName, self.buffer)
                        filesJSON = renderer.render_lines()
                        for JSON in filesJSON:
                            self._addHTMLToLastInsertedContent(JSON)
                elif self.tag_args:
                    self._addNewContentToLastContainer(self.begin_tag)
                    renderer = rendererCLS(self.buffer, self.tag_args)
                else:
                    self._addNewContentToLastContainer(self.begin_tag)
                    renderer = rendererCLS(self.buffer)
                if self.begin_tag not in customRenderedTags:
                    self._addHTMLToLastInsertedContent(renderer.render_lines())
                self.bufferRaw = []
                self.buffer = []
                self.begin_tag = None
                self.end_tag = None
                self.tag_args = None
            except Exception:
                traceback.print_exc()
                self._report_syntax_error

    @property
    def _report_syntax_error(self):
        self._addNewContentToLastContainer("paragraph")
        self._addHTMLToLastInsertedContent(self.syntax_error_message+"<p>"+"<br>".join(self.bufferRaw)+"</p>")
        self.bufferRaw = []
        self.buffer = []
        self.begin_tag = None
        self.end_tag = None
        self.tag_args = None

    @property
    def _check_for_improper_closing_of_multiline_block(self):
        """
        Captures the following cases:
        1. case where the line above is not emtpy to trigger paragraph or list closure.
        2. case where begin_tag and end_tag did not close properly.
        """
        if self.begin_tag == 'paragraph' or self.begin_tag == 'list':
            self.end_tag = self.begin_tag
            self._flush_buffer
        else:
            if self.begin_tag != self.end_tag:
                self._report_syntax_error

    def render_section_content(self) -> list:
        self._addNewContainer("normal", "normal")
        for line in self.lines:
            rawLine = line
            self.bufferRaw.append(rawLine)
            line = line.strip()

            # Manage tags with similar open and close tags
            if line in self.toggle_tags:
                lineTag = self.toggle_tags[line]
                if not self.begin_tag:
                    self.begin_tag = lineTag
                    continue
                if self.begin_tag == lineTag:
                    self.end_tag = lineTag
                    self._flush_buffer
                else:
                    self._check_for_improper_closing_of_multiline_block
                    self.begin_tag = lineTag
                continue

            begin_match = re.match(r'\\begin{(\w+)}(?:\[(.+)\])?', line)
            if begin_match:
                # Some math equations have "\begin" and "\end"
                if self.begin_tag == "math":
                    self.buffer.append(line)
                    continue
                tagName = begin_match.group(1)
                tagArgs = begin_match.group(2)

                self._check_for_improper_closing_of_multiline_block
                if tagName == 'fold':
                    if tagArgs:
                        foldTitle = tagArgs.strip(" ")
                    else:
                        foldTitle = "Fold"
                    self._addNewContainer("fold", foldTitle)
                    self.tag_args = None
                    continue

                self.begin_tag = tagName
                self.tag_args = tagArgs
                continue

            end_match = re.match(r'\\end{(\w+)}', line)
            if end_match:
                # Some math equations have "\begin" and "\end"
                if self.begin_tag == "math":
                    self.buffer.append(line)
                    continue
                tagName = end_match.group(1)

                if tagName == 'fold':
                    self._check_for_improper_closing_of_multiline_block
                    self._addNewContainer("normal", "normal")
                    continue

                if self.begin_tag == tagName:
                    self.end_tag = tagName
                    self._flush_buffer
                else:
                    self._report_syntax_error
                continue

            if self.begin_tag == 'code':
                self.buffer.append(rawLine)
                continue

            if line.startswith("* ") or line.startswith("- ") or line.startswith("+ ") or line.startswith("-- "):
                if not self.begin_tag:
                    self.begin_tag = "list"
                    self.buffer.append(line)
                    continue

                if self.begin_tag != "list":
                    self._check_for_improper_closing_of_multiline_block
                    self.begin_tag = "list"
                self.buffer.append(line)
                continue
            
            # Line that did not match any of the above conditions
            if line:
                if not self.begin_tag:
                    self.begin_tag = "paragraph"
                self.buffer.append(line)
                continue

            # Empty line closes list and paragraph
            if not line and self.begin_tag == 'list':
                self.end_tag = 'list'
                self._flush_buffer
                continue

            if not line and self.begin_tag == "paragraph":
                self.end_tag = 'paragraph'
                self._flush_buffer
                continue

        if self.buffer: # Captures cases where last line is not empty line
            self._check_for_improper_closing_of_multiline_block

        # Remove containers without content
        self.containers = [container for container in self.containers if container['content']]
        return self.containers


class PDFRenderer:

    def __init__(self, projectID:int, projectName:str, section_content:str):
        self.projectID = projectID
        self.projectName = projectName
        self.lines = section_content.strip().split('\n')
        self.containers = []
        self.buffer = []
        self.bufferRaw = []
        self.tag_args = None
        self.begin_tag = None
        self.end_tag = None
        self.list_buffer = []
        self.currentTableIDX = 1 # used for enumerating tables
        self.currentFigureIDX = 1 # used for enumerating figures
        self.toggle_tags = {
                            '$$': 'math',
                            '```': 'code'
                            }
        self.pdf_tags = {
                "paragraph": PDFParagraphTag,
                "code": PDFCodeTag,
                "list": PDFlListTag,
                "note": PDFNoteTag,
                "math": PDFMathTag,
                "table": PDFTableTag,
                "figures": PDFFiguresTag,
                "files": PDFFilesTag,
                "omitable": PDFOmilayersTableTag,
                "omiplot": PDFOmilayersPlotTag
                }

        self.syntax_error_message = '#text(fill: rgb("#ff4646"))[Syntax error]'

    @property
    def previous_multilined_block_closed_properly(self) -> bool:
        if not self.begin_tag or not self.end_tag:
            return False
        return self.begin_tag == self.end_tag

    def _addNewContainer(self, containerType:str, title:str) -> None:
        """
        There are two types of containers:
        1. normal = content will be rendered normally.
        2. fold = content will be rendered inside a fold.
        """
        self.containers.append({"container":containerType, "title":title, "content":[]})

    @property
    def _lastContainerContent(self) -> list:
        return self.containers[-1]['content']

    def _addNewContentToLastContainer(self, contentType:str, containerTitle="") -> None:
        self._lastContainerContent.append({"type":contentType, "containerTitle":containerTitle, "text":[]})

    def _addTEXTToLastInsertedContent(self, text:str) -> None:
        self._lastContainerContent[-1]['text'].append(text)


    @property
    def _flush_buffer(self):
        if self.buffer or self.tag_args:
            customRenderedTags = ['figures', 'table', 'files', 'omitable', 'omiplot']
            try:
                rendererCLS = self.pdf_tags[self.begin_tag]
            except Exception:
                traceback.print_exc()
                self._report_syntax_error
            try:
                if self.begin_tag == "table":
                    if not self.tag_args:
                        self.tag_args = ""
                    renderer = rendererCLS(self.projectName, self.currentTableIDX, self.buffer, self.tag_args)
                    tablesJSON, self.currentTableIDX = renderer.render_lines()
                    for JSON in tablesJSON:
                        self._addNewContentToLastContainer(self.begin_tag)
                        self._addTEXTToLastInsertedContent(JSON)
                elif self.begin_tag == "figures":
                    renderer = rendererCLS(self.projectName, self.currentFigureIDX, self.buffer, self.tag_args)
                    figsJSON, self.currentFigureIDX, figsTitle = renderer.render_lines()
                    self._addNewContentToLastContainer(self.begin_tag, containerTitle=figsTitle)
                    for JSON in figsJSON:
                        self._addTEXTToLastInsertedContent(JSON)
                elif self.begin_tag == "files":
                    renderer = rendererCLS(self.projectName, self.buffer, self.tag_args)
                    filesJSON, filesTitle = renderer.render_lines()
                    self._addNewContentToLastContainer(self.begin_tag, containerTitle=filesTitle)
                    for JSON in filesJSON:
                        self._addTEXTToLastInsertedContent(JSON)
                elif self.begin_tag == "omitable":
                    self._addNewContentToLastContainer(self.begin_tag)
                    self._lastContainerContent[-1]['has_omilayers'] = int(tools.is_module_installed('omilayers'))
                    if tools.is_module_installed('omilayers'):
                        renderer = rendererCLS(self.projectName, self.buffer)
                        filesJSON = renderer.render_lines()
                        for JSON in filesJSON:
                            self._addTEXTToLastInsertedContent(JSON)
                elif self.begin_tag == "omiplot":
                    self._addNewContentToLastContainer(self.begin_tag)
                    self._lastContainerContent[-1]['has_omilayers'] = int(tools.is_module_installed('omilayers'))
                    self._lastContainerContent[-1]['has_bokeh'] = int(tools.is_module_installed('bokeh'))
                    if tools.is_module_installed('omilayers') and tools.is_module_installed('bokeh'):
                        renderer = rendererCLS(self.projectName, self.buffer)
                        filesJSON = renderer.render_lines()
                        for JSON in filesJSON:
                            self._addTEXTToLastInsertedContent(JSON)
                elif self.tag_args:
                    self._addNewContentToLastContainer(self.begin_tag)
                    renderer = rendererCLS(self.buffer, self.tag_args)
                else:
                    self._addNewContentToLastContainer(self.begin_tag)
                    renderer = rendererCLS(self.buffer)
                if self.begin_tag not in customRenderedTags:
                    self._addTEXTToLastInsertedContent(renderer.render_lines())
                self.bufferRaw = []
                self.buffer = []
                self.begin_tag = None
                self.end_tag = None
                self.tag_args = None
            except Exception:
                traceback.print_exc()
                self._report_syntax_error

    @property
    def _report_syntax_error(self):
        self._addNewContentToLastContainer("paragraph")
        self._addTEXTToLastInsertedContent(self.syntax_error_message+'\n'.join(self.bufferRaw))
        self.bufferRaw = []
        self.buffer = []
        self.begin_tag = None
        self.end_tag = None
        self.tag_args = None

    @property
    def _check_for_improper_closing_of_multiline_block(self):
        """
        Captures the following cases:
        1. case where the line above is not emtpy to trigger paragraph or list closure.
        2. case where begin_tag and end_tag did not close properly.
        """
        if self.begin_tag == 'paragraph' or self.begin_tag == 'list':
            self.end_tag = self.begin_tag
            self._flush_buffer
        else:
            if self.begin_tag != self.end_tag:
                self._report_syntax_error

    def render_section_content(self) -> list:
        self._addNewContainer("normal", "normal")
        for line in self.lines:
            rawLine = line
            self.bufferRaw.append(rawLine)
            if line.endswith("\xa0\xa0"):
                line = line.strip() + " #linebreak()"
            else:
                line = line.strip()

            # Manage tags with similar open and close tags
            if line in self.toggle_tags:
                lineTag = self.toggle_tags[line]
                if not self.begin_tag:
                    self.begin_tag = lineTag
                    continue
                if self.begin_tag == lineTag:
                    self.end_tag = lineTag
                    self._flush_buffer
                else:
                    self._check_for_improper_closing_of_multiline_block
                    self.begin_tag = lineTag
                continue

            begin_match = re.match(r'\\begin{(\w+)}(?:\[(.+)\])?', line)
            if begin_match:
                # Some math equations have "\begin" and "\end"
                if self.begin_tag == "math":
                    self.buffer.append(line)
                    continue
                tagName = begin_match.group(1)
                tagArgs = begin_match.group(2)

                self._check_for_improper_closing_of_multiline_block
                if tagName == 'fold':
                    if tagArgs:
                        foldTitle = tagArgs.strip(" ")
                    else:
                        foldTitle = "Fold"
                    self._addNewContainer("fold", foldTitle)
                    self.tag_args = None
                    continue

                self.begin_tag = tagName
                self.tag_args = tagArgs
                continue

            end_match = re.match(r'\\end{(\w+)}', line)
            if end_match:
                # Some math equations have "\begin" and "\end"
                if self.begin_tag == "math":
                    self.buffer.append(line)
                    continue
                tagName = end_match.group(1)

                if tagName == 'fold':
                    self._check_for_improper_closing_of_multiline_block
                    self._addNewContainer("normal", "normal")
                    continue

                if self.begin_tag == tagName:
                    self.end_tag = tagName
                    self._flush_buffer
                else:
                    self._report_syntax_error
                continue

            if self.begin_tag == 'code':
                self.buffer.append(rawLine)
                continue

            if line.startswith("* ") or line.startswith("- ") or line.startswith("+ ") or line.startswith("-- "):
                if not self.begin_tag:
                    self.begin_tag = "list"
                    self.buffer.append(line)
                    continue

                if self.begin_tag != "list":
                    self._check_for_improper_closing_of_multiline_block
                    self.begin_tag = "list"
                self.buffer.append(line)
                continue
            
            # Line that did not match any of the above conditions
            if line:
                if not self.begin_tag:
                    self.begin_tag = "paragraph"
                self.buffer.append(line)
                continue

            # Empty line closes list and paragraph
            if not line and self.begin_tag == 'list':
                self.end_tag = 'list'
                self._flush_buffer
                continue

            if not line and self.begin_tag == "paragraph":
                self.end_tag = 'paragraph'
                self._flush_buffer
                continue

        if self.buffer: # Captures cases where last line is not empty line
            self._check_for_improper_closing_of_multiline_block

        # Remove containers without content
        self.containers = [container for container in self.containers if container['content']]
        return self.containers


