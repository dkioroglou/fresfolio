from pathlib import Path
from fresfolio.renderers.inline_renderers import InlineRenderers, PDFInlineRenderers
from fresfolio.utils import tools
import traceback
import json

if tools.is_module_installed("omilayers"):
    from omilayers import Omilayers

inline_renderers = InlineRenderers()
inline_renderers_methods = [method for method in dir(inline_renderers) if callable(getattr(inline_renderers, method)) and not method.startswith("__")]
def pass_line_through_inline_renderers(line:str) -> str:
    line = line.strip("\n")
    for method in inline_renderers_methods:
        render = getattr(inline_renderers, method)
        line = render(line)
    return line

PDF_inline_renderers = PDFInlineRenderers()
PDF_inline_renderers_methods = [method for method in dir(PDF_inline_renderers) if callable(getattr(PDF_inline_renderers, method)) and not method.startswith("__")]
def pass_line_through_PDF_inline_renderers(line:str) -> str:
    line = line.strip("\n")
    for method in PDF_inline_renderers_methods:
        render = getattr(PDF_inline_renderers, method)
        line = render(line)
    return line


class HtmlParagraphTag:

    def __init__(self, lines:list):
        self.lines = self.add_indentation_to_lines(lines)
        self.open_tag = "<p>"
        self.close_tag = "</p>"

    def add_indentation_to_lines(self, lines):
        """Add indentation to lines if line starts with ==."""
        processedLines = []
        for line in lines:
            if line.startswith("=="):
                line = line.replace("==", "", 1)
                processedLines.append(f'<span class="app-indentation">{line}</span>')
            else:
                processedLines.append(line)
        return processedLines

    def render_lines(self) -> str: 
        renderedLines = [pass_line_through_inline_renderers(line) for line in self.lines]
        return self.open_tag+"<br>".join(renderedLines)+self.close_tag

class PDFParagraphTag:

    def __init__(self, lines:list):
        self.lines = self.add_indentation_to_lines(lines)
        self.open_tag = ""
        self.close_tag = ""

    def add_indentation_to_lines(self, lines):
        """Add indentation to lines if line starts with ==."""
        processedLines = []
        for line in lines:
            if line.startswith("=="):
                line = line.replace("==", "", 1)
                processedLines.append(f'#h(1em) {line}')
            else:
                processedLines.append(line)
        return processedLines

    def render_lines(self) -> str: 
        renderedLines = [pass_line_through_PDF_inline_renderers(line) for line in self.lines]
        return self.open_tag.join(renderedLines)+self.close_tag

class HtmlCodeTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = '<pre class="app-pre">'
        self.close_tag = "</pre>"

    def render_lines(self) -> str: 
        return self.open_tag+"<br>".join(self.lines)+self.close_tag

class PDFCodeTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = '```'
        self.close_tag = "```"

    def render_lines(self) -> str: 
        return self.open_tag+"\n".join(self.lines)+"\n"+self.close_tag


class HtmlListTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = '<ul>'
        self.close_tag = "</ul>"

    def render_lines(self) -> str: 
        renderedLines = []
        isListNumbered = False
        for line in self.lines:
            if line.startswith("* ") or line.startswith("- "):
                line = "<li>"+line[1:].lstrip()+"</li>"
            elif line.startswith("+ "):
                line = "<li>"+line[1:].lstrip()+"</li>"
                if not isListNumbered:
                    isListNumbered = True
            elif line.startswith("-- "):
                line = '<span>↳ '+line[2:].lstrip()+"</span>"
            renderedLines.append(pass_line_through_inline_renderers(line))
        if isListNumbered:
            self.open_tag = "<ol>"
            self.close_tag = "</ol>"
        return self.open_tag+"<br>".join(renderedLines)+self.close_tag+"<br>"

class PDFlListTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = ''
        self.close_tag = ""

    def render_lines(self) -> str: 
        renderedLines = []
        for line in self.lines:
            if line.startswith("* ") or line.startswith("- "):
                line = "- "+line[1:].lstrip()
            elif line.startswith("+ "):
                line = "+ "+line[1:].lstrip()
            elif line.startswith("-- "):
                # line = f"#pad(left: 1.1em)[↳ {line[2:].lstrip()}]"
                line = f" #linebreak() ↳ {line[2:].lstrip()}"
            renderedLines.append(pass_line_through_PDF_inline_renderers(line))
        return "\n".join(renderedLines)


class HtmlMathTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = '<span class="katex-math-equation">'
        self.close_tag = "</span>"

    def render_lines(self) -> str: 
        return self.open_tag+"<br>".join(self.lines)+self.close_tag

class PDFMathTag:

    def __init__(self, lines:list):
        self.lines = lines
        self.open_tag = '#mitex(`'
        self.close_tag = "`)"

    def render_lines(self) -> str: 
        return self.open_tag+"\n"+"\n".join(self.lines)+"\n"+self.close_tag


class HtmlNoteTag:

    def __init__(self, lines:list, color:str="blue"):
        self.lines = lines
        if color not in ['blue', 'red', 'green']:
            self.open_tag = '<div class="app-note-blue">'
        else:
            self.open_tag = f'<div class="app-note-{color}">'
        self.close_tag = "</div>"

    def render_lines(self) -> str: 
        renderedLines = [pass_line_through_inline_renderers(line) for line in self.lines]
        return self.open_tag+"<br>".join(renderedLines)+self.close_tag

class PDFNoteTag:

    backgroundHEX = {
        "blue": "#b3dee9b3",
        "red": "#e1c0c0",
        "green": "#c2d9b9"
    }

    borderHEX = {
        "blue": "#a7b8b9",
        "red": "#d59b9b",
        "green": "#9db99f"
    }


    def __init__(self, lines:list, color:str="blue"):
        self.lines = lines
        if color not in ['blue', 'red', 'green']:
            self.open_tag = [
                            '#block(',
                            f'fill: rgb("{self.backgroundHEX["blue"]}"),',
                            f'stroke: 1pt + rgb("{self.borderHEX["blue"]}"),', 
                            'inset: 12pt,',
                            'radius: 4pt,',
                            'width: 100%,',
                            ')['
            ]
        else:
            self.open_tag = [
                            '#block(',
                            f'fill: rgb("{self.backgroundHEX[color]}"),',
                            f'stroke: 1pt + rgb("{self.borderHEX[color]}"),', 
                            'inset: 12pt,',
                            'radius: 4pt,',
                            'width: 100%',
                            ')['
            ]
        self.close_tag = "]"

    def render_lines(self) -> str: 
        renderedLines = [pass_line_through_PDF_inline_renderers(line) for line in self.lines]
        return "\n".join(self.open_tag)+"\n"+"\n".join(renderedLines)+"\n"+self.close_tag


class HtmlTableTag:

    def __init__(self, projectName:str, tableIDX:int, lines:list, tagArgs:str):
        self.projectInfo = tools.get_project_info(projectName)
        self.filename = None
        self.title = None
        self.delimiter = None
        self.lines = lines
        self.tableIDX = tableIDX
        self.tagArgs = tools.convert_tag_args_to_json(tagArgs)

    def render_lines(self) -> dict:

        def report_emtpy_table_due_to_error(name):
            jsonCols = []
            jsonLines = []
            tablesJSON.append({"title":f'Table error: cannot load "{name}"', "columns":jsonCols, "rows":jsonLines})

        tablesJSON = []
        jsonCols = []
        jsonLines = []
        if self.tagArgs:
            try:
                if self.tagArgs.get("project", False):
                    self.projectName = self.tagArgs['project']
                    self.projectInfo = tools.get_project_info(self.projectName)

                if self.tagArgs.get("file", False):
                    self.filename = self.tagArgs['file']

                if self.tagArgs.get("title", False):
                    self.title = self.tagArgs['title']

                if self.tagArgs.get("sep", False):
                    self.delimiter = self.tagArgs['sep']
            except Exception:
                traceback.print_exc()
                report_emtpy_table_due_to_error(self.tagArgs)
                return (tablesJSON, self.tableIDX)

        if self.filename:
            if "*" in self.filename:
                filesJSON = tools.get_filepaths_from_wildcard_filename(self.projectInfo, self.filename)
                for fJSON in filesJSON:
                    filePath = fJSON['filePath']
                    if filePath.exists:
                        try:
                            tableLines = open(filePath, 'r').readlines()

                            delimiter = None
                            if "\t" in tableLines[0]:
                                delimiter = "\t"
                            else:
                                delimiter = ","

                            if delimiter is not None:
                                columns = [col.strip() for col in tableLines[0].split(delimiter)]
                            else:
                                columns = [tableLines[0].strip()]
                            for idx,col in enumerate(columns, start=1):
                                jsonCols.append({"name":f"col{idx}", "field":f"col{idx}", "align":"left", "label":col, "sortable": True})

                            for line in tableLines[1:]:
                                line = line.strip()
                                if not line:
                                    continue
                                if delimiter is not None:
                                    line = [pass_line_through_inline_renderers(cell.strip()) for cell in line.split(delimiter)]
                                else:
                                    line = [pass_line_through_inline_renderers(line)]
                                jsonLines.append({f"col{idx}":val for idx,val in enumerate(line, start=1)})
                            if self.title:
                                tableTitle = f"Table {self.tableIDX}: {self.title}"
                            else:
                                tableTitle = f"Table {self.tableIDX}"
                            tablesJSON.append({"title":tableTitle, "columns":jsonCols, "rows":jsonLines})
                            jsonCols = []
                            jsonLines = []
                            self.tableIDX += 1
                        except Exception:
                            traceback.print_exc()
                            report_emtpy_table_due_to_error(self.tagArgs)
                            continue
                    else:
                        report_emtpy_table_due_to_error(filePath.name)
                return (tablesJSON, self.tableIDX)
            else:
                filePath = Path(self.projectInfo['dirFullPath']).joinpath(self.filename)
                if filePath.exists:
                    try:
                        tableLines = open(filePath, 'r').readlines()

                        delimiter = None
                        if "\t" in tableLines[0]:
                            delimiter = "\t"
                        else:
                            delimiter = ","

                        if delimiter is not None:
                            columns = [col.strip() for col in tableLines[0].split(delimiter)]
                        else:
                            columns = [tableLines[0].strip()]
                        for idx,col in enumerate(columns, start=1):
                            jsonCols.append({"name":f"col{idx}", "field":f"col{idx}", "align":"left", "label":col, "sortable": True})

                        for line in tableLines[1:]:
                            line = line.strip()
                            if not line:
                                continue
                            if delimiter is not None:
                                line = [pass_line_through_inline_renderers(cell.strip()) for cell in line.split(delimiter)]
                            else:
                                line = [pass_line_through_inline_renderers(line)]
                            jsonLines.append({f"col{idx}":val for idx,val in enumerate(line, start=1)})
                        if self.title:
                            tableTitle = f"Table {self.tableIDX}: {self.title}"
                        else:
                            tableTitle = f"Table {self.tableIDX}"
                        tablesJSON.append({"title":tableTitle, "columns":jsonCols, "rows":jsonLines})
                        jsonCols = []
                        jsonLines = []
                        self.tableIDX += 1
                    except Exception:
                        traceback.print_exc()
                        report_emtpy_table_due_to_error(self.tagArgs)
                else:
                    report_emtpy_table_due_to_error(filePath.name)
            return (tablesJSON, self.tableIDX)

        if self.delimiter is None:
            self.delimiter = ","
        for line in self.lines:
            if not jsonCols:
                if self.delimiter in line:
                    columns = [col.strip() for col in line.split(self.delimiter)]
                else:
                    columns = [line.strip()]
                for idx,col in enumerate(columns, start=1):
                    jsonCols.append({"name":f"col{idx}", "field":f"col{idx}", "align":"left", "label":col, "sortable": True})
                continue

            if self.delimiter in line:
                line = [pass_line_through_inline_renderers(cell.strip()) for cell in line.split(self.delimiter)]
            else:
                line = [pass_line_through_inline_renderers(line)]
            jsonLines.append({f"col{idx}":val for idx,val in enumerate(line, start=1)})
        if self.title:
            tableTitle = f"Table {self.tableIDX}: {self.title}"
        else:
            tableTitle = f"Table {self.tableIDX}"
        tablesJSON.append({"title":tableTitle, "columns":jsonCols, "rows":jsonLines})
        self.tableIDX += 1
        return (tablesJSON, self.tableIDX) 


class PDFTableTag:

    def __init__(self, projectName:str, tableIDX:int, lines:list, tagArgs:str):
        self.projectInfo = tools.get_project_info(projectName)
        self.filename = None
        self.title = "No available caption."
        self.delimiter = None
        self.lines = lines
        self.tableIDX = tableIDX
        self.tagArgs = tools.convert_tag_args_to_json(tagArgs)

    def render_lines(self) -> dict:

        def report_emtpy_table_due_to_error(name):
            jsonCols = []
            jsonLines = []
            tablesJSON.append({"title":f'Table error: cannot load "{name}"', "columns":jsonCols, "rows":jsonLines})

        tablesJSON = []
        jsonCols = []
        jsonLines = []
        if self.tagArgs:
            try:
                if self.tagArgs.get("project", False):
                    self.projectName = self.tagArgs['project']
                    self.projectInfo = tools.get_project_info(self.projectName)

                if self.tagArgs.get("file", False):
                    self.filename = self.tagArgs['file']

                if self.tagArgs.get("title", False):
                    self.title = self.tagArgs['title']

                if self.tagArgs.get("sep", False):
                    self.delimiter = self.tagArgs['sep']
            except Exception:
                traceback.print_exc()
                report_emtpy_table_due_to_error(self.tagArgs)
                return (tablesJSON, self.tableIDX)

        if self.filename:
            if "*" in self.filename:
                filesJSON = tools.get_filepaths_from_wildcard_filename(self.projectInfo, self.filename)
                for fJSON in filesJSON:
                    filePath = fJSON['filePath']
                    if filePath.exists:
                        try:
                            tableLines = open(filePath, 'r').readlines()

                            delimiter = None
                            if "\t" in tableLines[0]:
                                delimiter = "\t"
                            else:
                                delimiter = ","

                            if delimiter is not None:
                                columns = [col.strip() for col in tableLines[0].split(delimiter)]
                            else:
                                columns = [tableLines[0].strip()]
                            jsonCols = columns

                            for line in tableLines[1:]:
                                line = line.strip()
                                if not line:
                                    continue
                                if delimiter is not None:
                                    line = [pass_line_through_PDF_inline_renderers(cell.strip()) for cell in line.split(delimiter)]
                                else:
                                    line = [pass_line_through_PDF_inline_renderers(line)]
                                jsonLines.append(line)
                            tablesJSON.append({"title":self.title, "columns":jsonCols, "rows":jsonLines})
                            jsonCols = []
                            jsonLines = []
                            self.tableIDX += 1
                        except Exception:
                            traceback.print_exc()
                            report_emtpy_table_due_to_error(self.tagArgs)
                            continue
                    else:
                        report_emtpy_table_due_to_error(filePath.name)
                return (tablesJSON, self.tableIDX)
            else:
                filePath = Path(self.projectInfo['dirFullPath']).joinpath(self.filename)
                if filePath.exists:
                    try:
                        tableLines = open(filePath, 'r').readlines()

                        delimiter = None
                        if "\t" in tableLines[0]:
                            delimiter = "\t"
                        else:
                            delimiter = ","

                        if delimiter is not None:
                            columns = [col.strip() for col in tableLines[0].split(delimiter)]
                        else:
                            columns = [tableLines[0].strip()]
                        jsonCols = columns

                        for line in tableLines[1:]:
                            line = line.strip()
                            if not line:
                                continue
                            if delimiter is not None:
                                line = [pass_line_through_PDF_inline_renderers(cell.strip()) for cell in line.split(delimiter)]
                            else:
                                line = [pass_line_through_PDF_inline_renderers(line)]
                            jsonLines.append(line)
                        tablesJSON.append({"title":self.title, "columns":jsonCols, "rows":jsonLines})
                        jsonCols = []
                        jsonLines = []
                        self.tableIDX += 1
                    except Exception:
                        traceback.print_exc()
                        report_emtpy_table_due_to_error(self.tagArgs)
                else:
                    report_emtpy_table_due_to_error(filePath.name)
            return (tablesJSON, self.tableIDX)

        if self.delimiter is None:
            self.delimiter = ","
        for line in self.lines:
            if not jsonCols:
                if self.delimiter in line:
                    columns = [col.strip() for col in line.split(self.delimiter)]
                else:
                    columns = [line.strip()]
                jsonCols = columns
                continue

            if self.delimiter in line:
                line = [pass_line_through_PDF_inline_renderers(cell.strip()) for cell in line.split(self.delimiter)]
            else:
                line = [pass_line_through_PDF_inline_renderers(line)]
            jsonLines.append(line)
        tablesJSON.append({"title":self.title, "columns":jsonCols, "rows":jsonLines})
        self.tableIDX += 1
        return (tablesJSON, self.tableIDX) 


class HtmlFiguresTag:

    def __init__(self, projectName:str, figureIDX:int, lines:list, tagArgs:str):
        self.projectInfo = tools.get_project_info(projectName)
        self.lines = lines
        self.figureIDX = figureIDX
        self.figsTitle = ""
        self.tagArgs = tools.convert_tag_args_to_json(tagArgs)
        self.filename = None

    def render_lines(self) -> tuple: 

        def render_tmpJSON(tmpJSON):
            if not tmpJSON.get("project", False):
                tmpJSON['project'] = self.projectInfo
            if not tmpJSON.get("caption", False):
                tmpJSON['caption'] = "Caption not available."

            projectID = tmpJSON['project']['ID']
            projectDir = tmpJSON['project']['dirFullPath']
            filename = tmpJSON['filename']
            caption = pass_line_through_inline_renderers(tmpJSON['caption'])
            title = f"Figure {self.figureIDX}"
            if filename.startswith("http"):
                figURL = filename
                return {"url":figURL, "title":title, "caption":caption, "file_exists":1}
            figURL = f"/api/files/{projectID}/{filename}"
            filePath = Path(projectDir).joinpath(filename)
            if filePath.exists():
                file_exists = 1
            else:
                file_exists = 0
            return {"url":figURL, "title":title, "caption":caption, "file_exists":file_exists}

        figsJSON = []
        if self.tagArgs:
            try:
                if self.tagArgs.get("project", False):
                    self.projectName = self.tagArgs['project']
                    self.projectInfo = tools.get_project_info(self.projectName)

                if self.tagArgs.get("file", False):
                    self.filename = self.tagArgs['file']

                if self.tagArgs.get("title", False):
                    self.figsTitle = self.tagArgs['title']
            except Exception:
                traceback.print_exc()
                return (figsJSON, self.figureIDX, self.figsTitle)
        
        if self.filename:
            if "*" in self.filename:
                filesJSON = tools.get_filepaths_from_wildcard_filename(self.projectInfo, self.filename)
                for fJSON in filesJSON:
                    filePath = fJSON['filePath']
                    fileURL = fJSON['fileURL']
                    caption = "Caption not available."
                    title = f"Figure {self.figureIDX}"
                    if filePath.exists:
                        file_exists = 1
                    else:
                        file_exists = 0
                    figsJSON.append({"url":fileURL, "title":title, "caption":caption, "file_exists":file_exists})
                    self.figureIDX += 1
            else:
                caption = "Caption not available."
                title = f"Figure {self.figureIDX}"
                figURL = f"/api/files/{self.projectInfo['ID']}/{self.filename}"
                filePath = Path(self.projectInfo['dirFullPath']).joinpath(self.filename)
                if filePath.exists():
                    file_exists = 1
                else:
                    file_exists = 0
                figsJSON.append({"url":figURL, "title":title, "caption":caption, "file_exists":file_exists})
                self.figureIDX += 1
            return (figsJSON, self.figureIDX, self.figsTitle)

        tmpJSON = {}
        for line in self.lines:
            line = line.strip()

            if line.startswith("project"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    figsJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                    self.figureIDX += 1
                try:
                    tmpJSON['project'] = tools.get_project_info(line.split(":")[-1].strip())
                except Exception:
                    traceback.print_exc()
                    continue
            elif line.startswith("figure"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    figsJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                    self.figureIDX += 1
                try:
                    tmpJSON['filename'] = line.split(":", 1)[-1].strip()
                except Exception as error:
                    print(error)
                    continue
            elif line.startswith("caption"):
                try:
                    tmpJSON['caption'] = line.split(":", 1)[-1].strip()
                except Exception as error:
                    print(error)
                    continue

        if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
            figsJSON.append(render_tmpJSON(tmpJSON))
            tmpJSON = {}
            self.figureIDX += 1
        return (figsJSON, self.figureIDX, self.figsTitle)


class PDFFiguresTag:

    def __init__(self, projectName:str, figureIDX:int, lines:list, tagArgs:str):
        self.projectInfo = tools.get_project_info(projectName)
        self.lines = lines
        self.figureIDX = figureIDX
        self.figsTitle = ""
        self.tagArgs = tools.convert_tag_args_to_json(tagArgs)
        self.filename = None

    def render_lines(self) -> tuple: 

        def render_tmpJSON(tmpJSON):
            if not tmpJSON.get("project", False):
                tmpJSON['project'] = self.projectInfo
            if not tmpJSON.get("caption", False):
                tmpJSON['caption'] = "No available caption."

            projectID = tmpJSON['project']['ID']
            projectDir = tmpJSON['project']['dirFullPath']
            filename = tmpJSON['filename']
            caption = pass_line_through_PDF_inline_renderers(tmpJSON['caption'])
            title = f"Figure {self.figureIDX}"
            if filename.startswith("http"):
                figURL = filename
                return {"url":figURL, "title":title, "caption":caption, "file_exists":1}
            figURL = f"/api/files/{projectID}/{filename}"
            filePath = Path(projectDir).joinpath(filename)
            if filePath.exists():
                file_exists = 1
            else:
                file_exists = 0
            # --root Path.home() has been set for typst.
            # This means that typst adds the Path.home() to absolute paths.
            # Thus Path.home() should be removed from the figure_path of figures, otherwise it will be repeated.
            return {"figure_path":str(filePath.relative_to(Path.home())), "title":title, "caption":caption, "file_exists":file_exists}

        figsJSON = []
        if self.tagArgs:
            try:
                if self.tagArgs.get("project", False):
                    self.projectName = self.tagArgs['project']
                    self.projectInfo = tools.get_project_info(self.projectName)

                if self.tagArgs.get("file", False):
                    self.filename = self.tagArgs['file']

                if self.tagArgs.get("title", False):
                    self.figsTitle = self.tagArgs['title']
            except Exception:
                traceback.print_exc()
                return (figsJSON, self.figureIDX, self.figsTitle)
        
        if self.filename:
            if "*" in self.filename:
                filesJSON = tools.get_filepaths_from_wildcard_filename(self.projectInfo, self.filename)
                for fJSON in filesJSON:
                    filePath = fJSON['filePath']
                    caption = "No available caption."
                    title = f"Figure {self.figureIDX}"
                    if filePath.exists:
                        file_exists = 1
                    else:
                        file_exists = 0
                    figsJSON.append({"figure_path":str(filePath.relative_to(Path.home())), "title":title, "caption":caption, "file_exists":file_exists})
                    self.figureIDX += 1
            else:
                caption = "No available caption."
                title = f"Figure {self.figureIDX}"
                filePath = Path(self.projectInfo['dirFullPath']).joinpath(self.filename)
                if filePath.exists():
                    file_exists = 1
                else:
                    file_exists = 0
                figsJSON.append({"figure_path":str(filePath.relative_to(Path.home())), "title":title, "caption":caption, "file_exists":file_exists})
                self.figureIDX += 1
            return (figsJSON, self.figureIDX, self.figsTitle)

        tmpJSON = {}
        for line in self.lines:
            line = line.strip()

            if line.startswith("project"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    figsJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                    self.figureIDX += 1
                try:
                    tmpJSON['project'] = tools.get_project_info(line.split(":")[-1].strip())
                except Exception:
                    traceback.print_exc()
                    continue
            elif line.startswith("figure"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    figsJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                    self.figureIDX += 1
                try:
                    tmpJSON['filename'] = line.split(":", 1)[-1].strip()
                except Exception as error:
                    print(error)
                    continue
            elif line.startswith("caption"):
                try:
                    tmpJSON['caption'] = line.split(":", 1)[-1].strip()
                except Exception as error:
                    print(error)
                    continue

        if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
            figsJSON.append(render_tmpJSON(tmpJSON))
            tmpJSON = {}
            self.figureIDX += 1
        return (figsJSON, self.figureIDX, self.figsTitle)


class HtmlFilesTag:

    def __init__(self, projectName:str, lines:list, tagArgs:str):
        self.projectInfo = tools.get_project_info(projectName)
        self.filesTitle = ""
        self.lines = lines
        self.tagArgs = tools.convert_tag_args_to_json(tagArgs)

    def render_lines(self) -> tuple: 
        def render_tmpJSON(tmpJSON):
            if not tmpJSON.get("project", False):
                tmpJSON['project'] = self.projectInfo
            if not tmpJSON.get("caption", False):
                tmpJSON['caption'] = "Caption not available."

            projectID = tmpJSON['project']['ID']
            projectDir = tmpJSON['project']['dirFullPath']
            filename = tmpJSON['filename']
            extension = Path(filename).suffix.replace(".", "").upper()
            caption = pass_line_through_inline_renderers(tmpJSON['caption'])
            fileURL = f"/api/files/{projectID}/{filename}"
            filePath = Path(projectDir).joinpath(filename)
            if filePath.exists():
                file_exists = 1
            else:
                file_exists = 0
                caption = "File does not exist."
            return {"url":fileURL, "filename":filename, "caption":caption, "extension":extension, "file_exists":file_exists}

        if self.tagArgs:
            try:
                if self.tagArgs.get("title", False):
                    self.filesTitle = self.tagArgs['title']
            except Exception:
                traceback.print_exc()
                self.filesTitle = ""

        tmpJSON = {}
        filesJSON = []
        for line in self.lines:
            line = line.strip()

            if line.startswith("project"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    filesJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                try:
                    tmpJSON['project'] = tools.get_project_info(line.split(":")[-1].strip())
                except Exception:
                    traceback.print_exc()
                    continue
            elif line.startswith("file"):
                if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
                    filesJSON.append(render_tmpJSON(tmpJSON))
                    tmpJSON = {}
                try:
                    tmpJSON['filename'] = line.split(":", 1)[-1].strip()
                except Exception:
                    traceback.print_exc()
                    continue
            elif line.startswith("caption"):
                try:
                    tmpJSON['caption'] = line.split(":", 1)[-1].strip()
                except Exception:
                    traceback.print_exc()
                    continue

        if len(tmpJSON) != 0 and tmpJSON.get('filename', False):
            filesJSON.append(render_tmpJSON(tmpJSON))
            tmpJSON = {}
        return (filesJSON, self.filesTitle)


class PDFFilesTag:
    """Tag is ignored for PDF rendering"""

    def __init__(self, projectName:str, lines:list, tagArgs:str):
        self.projectInfo = None
        self.filesTitle = ""
        self.lines = None
        self.tagArgs = None

    def render_lines(self) -> tuple: 
        return ([], self.filesTitle)


class HtmlOmilayersTableTag:

    def __init__(self, projectName:str, lines:list):
        self.projectInfo = tools.get_project_info(projectName)
        self.lines = lines

    def render_lines(self) -> tuple: 
        def render_tmpJSON(tmpJSON):
            defaultFields = {
                    "project": self.projectInfo,
                    "layer": "",
                    "nrows": "5"
                    }
            requiredFields = [
                    "file",
                    ]
            for field in defaultFields:
                if not tmpJSON.get(field, False):
                    tmpJSON[field] = defaultFields[field]

            missingFields = []
            for field in requiredFields:
                if not tmpJSON.get(field, False):
                    tmpJSON[field] = ""
                    missingFields.append(field)
            if missingFields:
                return {"missingFields": missingFields}

            projectID = tmpJSON['project']['ID']
            projectDir = tmpJSON['project']['dirFullPath']
            DBpath = tmpJSON['file']
            DBFullPath = Path(projectDir).joinpath(DBpath)
            DBname = DBFullPath.name
            layer = tmpJSON['layer']
            if DBFullPath.exists():
                if layer != "":
                    omi = Omilayers(str(DBFullPath))
                    if omi._dbutils._table_exists(layer):
                        layerInfo = omi.layers[layer].info
                        layer_exists = 1
                    else:
                        layerInfo = "LAYER DOES NOT EXIST."
                        layer_exists = 0
                else:
                    layer_exists = 0
                    layerInfo = ""
                nLayers = len(tools.get_omilayers(projectID, DBpath))
            else:
                nLayers = 0
                omi = Omilayers(str(DBFullPath))
                layerInfo = ""

            nrows = tmpJSON['nrows']
            return {"DBpath":DBpath, 
                    "DBname":DBname, 
                    "layer":layer, 
                    "layer_exists": layer_exists,
                    "nLayers":nLayers,
                    "projectID":projectID, 
                    "columns":[], 
                    "rows":[], 
                    "layerInfo":layerInfo,
                    "nrows":nrows,
                    "missingFields": missingFields,
                    "errors": ""
                    }

        tmpJSON = {}
        filesJSON = []
        for line in self.lines:
            line = line.strip()
            if ":" in line:
                try:
                    field, value = line.split(":", 1)
                    field = field.strip()
                    value = value.strip()
                except Exception:
                    traceback.print_exc()
                    return [{"errors":{"message":"Syntax error", "line":line}}]

                if field == 'project':
                    if len(tmpJSON) != 0 and tmpJSON.get("file", False):
                        filesJSON.append(render_tmpJSON(tmpJSON))
                        tmpJSON = {}
                    try:
                        tmpJSON['project'] = tools.get_project_info(value)
                    except Exception:
                        traceback.print_exc()
                        return [{"errors":{"message":"Cannot get project info.", "line":line}}]

                elif field == 'file':
                    if len(tmpJSON) != 0 and tmpJSON.get("file", False):
                        filesJSON.append(render_tmpJSON(tmpJSON))
                        tmpJSON = {}

                tmpJSON[field] = value

        if len(tmpJSON) != 0:
            filesJSON.append(render_tmpJSON(tmpJSON))
            tmpJSON = {}
        return filesJSON


class PDFOmilayersTableTag:
    """Tag is ignored for PDF rendering."""

    def __init__(self, projectName:str, lines:list):
        self.projectInfo = None
        self.lines = None

    def render_lines(self) -> tuple: 
        return []


class HtmlOmilayersPlotTag:

    def __init__(self, project_name:str, lines:list):
        self.project_info = tools.get_project_info(project_name)
        self.lines = lines

    def render_lines(self) -> tuple: 
        def render_tmpJSON(tmpJSON):
            default_fields = {
                    "project": self.project_info,
                    "caption": "No available caption."
                    }
            required_fields = [
                    "file",
                    "layer",
                    "name",
                    "save-dir"
                    ]
            for field in default_fields:
                if not tmpJSON.get(field, False):
                    tmpJSON[field] = default_fields[field]

            missing_fields = []
            for field in required_fields:
                if not tmpJSON.get(field, False):
                    tmpJSON[field] = ""
                    missing_fields.append(field)
            if missing_fields:
                return {"missingFields": missing_fields}

            tmpJSON['missingFields'] = missing_fields
            tmpJSON['name'] = tmpJSON['name'].replace(" ", "_")

            project_dir = tmpJSON['project']['dirFullPath']
            db_full_path = Path(project_dir).joinpath(tmpJSON['file'])

            if db_full_path.exists():
                tmpJSON['db_exists'] = 1
                omi = Omilayers(str(db_full_path))
                if omi._dbutils._table_exists(tmpJSON['layer']):
                    tmpJSON['layer_exists'] = 1
                    tmpJSON['columns'] = omi.layers[tmpJSON['layer']].columns
                    tmpJSON['layerInfo'] = omi.layers[tmpJSON['layer']].info
                else:
                    tmpJSON['layer_exists'] = 0
                    tmpJSON['columns'] = []
                    tmpJSON['layerInfo'] = "LAYER DOES NOT EXIST"
            else:
                tmpJSON['db_exists'] = 0
                tmpJSON['layer_exists'] = 0
                tmpJSON['columns'] = []
                tmpJSON['layerInfo'] = ""

            plot_data_json = Path(project_dir).joinpath(f"{tmpJSON['save-dir']}/{tmpJSON['name']}.json")
            tmpJSON['plot_data_json_output_filename'] = str(plot_data_json)
            if tmpJSON['layer_exists'] == 1 and plot_data_json.exists():
                with open(plot_data_json, 'r') as inf:
                    plot_data = json.load(inf)
                if tmpJSON['file'] == plot_data['file'] and tmpJSON['layer'] == plot_data['layer']:
                    tmpJSON.update(plot_data)
            else:
                plot_data = {
                        "plot-type": "",
                        "x": "", 
                        "y": "",
                        "groupby": "",
                        "hover": [],
                        "width": 1000,
                        "height": 700,
                        "size": 10,
                        "opacity":1.0
                        }
                tmpJSON.update(plot_data)

            tmpJSON["savePlotPath"] = f"{tmpJSON['save-dir']}/{tmpJSON['name']}.html"
            plot_full_path = Path(project_dir).joinpath(f"{tmpJSON['save-dir']}/{tmpJSON['name']}.html")
            if plot_full_path.exists():
                tmpJSON["plot_exists"] = 1
            else:
                tmpJSON["plot_exists"] = 0

            tmpJSON["projectID"] = tmpJSON['project']['ID']
            tmpJSON["errors"] = ""
            del tmpJSON["project"]
            return tmpJSON

        tmpJSON = {}
        filesJSON = []
        for line in self.lines:
            line = line.strip()
            if ":" in line:
                try:
                    field, value = line.split(":", 1)
                    field = field.strip()
                    value = value.strip()
                except Exception:
                    traceback.print_exc()
                    return [{"errors":{"message":"Syntax error", "line":line}}]

                if field == 'project':
                    if len(tmpJSON) != 0 and tmpJSON.get("file", False):
                        filesJSON.append(render_tmpJSON(tmpJSON))
                        tmpJSON = {}
                    try:
                        tmpJSON['project'] = tools.get_project_info(value)
                    except Exception:
                        traceback.print_exc()
                        return [{"errors":{"message":"Cannot get project info.", "line":line}}]

                elif field == 'file':
                    if len(tmpJSON) != 0 and tmpJSON.get("file", False):
                        filesJSON.append(render_tmpJSON(tmpJSON))
                        tmpJSON = {}

                tmpJSON[field] = value

        if len(tmpJSON) != 0:
            filesJSON.append(render_tmpJSON(tmpJSON))
            tmpJSON = {}
        return filesJSON


class PDFOmilayersPlotTag:
    """Tag is ignored for PDF rendering."""

    def __init__(self, project_name:str, lines:list):
        self.project_info = None
        self.lines = None

    def render_lines(self) -> tuple: 
        return []


