from flask import Blueprint, jsonify, request, send_from_directory, Response
from pathlib import Path
import re
import traceback
from platform import system
import subprocess
import json
from fresfolio.utils import tools
from fresfolio.utils.classes import ProjectsUtils

if tools.is_module_installed("pyarrow"):
    import pyarrow as pa

apiroutes = Blueprint('apiroutes', __name__)
PUTL = ProjectsUtils()
OSname = system().lower()


# PROJECTS RELATED ROUTES
#========================
@apiroutes.route('/api/create-project', methods=['POST'])
def app_api_create_project():
    try:
        data = request.get_json()
        projectName = data['projectName']
        projectDescription = data['projectDescription']
        if PUTL.project_exists(projectName):
            return "Project exists.", 400
        if not PUTL.project_is_created(projectName, projectDescription):
            return "Error creating project.", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-projects', methods=['POST'])
def app_api_fetch_projects():
    projects = PUTL.get_projects()
    return jsonify(projects)

@apiroutes.route('/api/get-notebooks', methods=['POST'])
def app_api_get_notebooks():
    data = request.get_json()
    projectID = data['projectID']
    try:
        projectNotebooks = PUTL.get_notebooks_and_chapters_for_project(projectID)
    except Exception:
        traceback.print_exc()
        return "", 400
    return jsonify(projectNotebooks)

@apiroutes.route('/api/create-notebook', methods=['POST'])
def app_api_create_notebook():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookName = data['notebook']
        if PUTL.notebook_exists(projectID, notebookName):
            return "Notebook exists", 400
        if not PUTL.notebook_is_created(projectID, notebookName):
            return "Cannot create notebook", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-chapter', methods=['POST'])
def app_api_create_chapter():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        chapterName = data['chapterName']
        if PUTL.chapter_exists(projectID, notebookID, chapterName):
            return "Chapter exists in notebook.", 400
        if not PUTL.chapter_is_created(projectID, notebookID, chapterName):
            return "Cannot create chapter", 400
        return "", 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-notebook-name', methods=['POST'])
def app_api_set_notebook_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        newNotebookName = data['newNotebookName']
        if PUTL.notebook_exists(projectID, newNotebookName):
            return "Notebook name exists", 400
        if PUTL.notebook_name_is_set(projectID, notebookID, newNotebookName):
            return "", 200
        return "Cannot change notebook name", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-chapter-name', methods=['POST'])
def app_api_set_chapter_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        chapterID = data['chapterID']
        newChapterName = data['newChapterName']
        if PUTL.chapter_exists(projectID, notebookID, newChapterName):
            return "Chapter name exists.", 400
        if PUTL.chapter_name_is_set(projectID, chapterID, newChapterName):
            return "", 200
        return "Cannot change chapter name", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-chapter-sections', methods=['POST'])
def app_api_get_chapter_sections():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sections = PUTL.get_chapter_sections(projectID, chapterID)
        return jsonify(sections)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-section', methods=['POST'])
def app_api_create_section():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        try:
            newSectionID = PUTL.create_section_in_db(projectID, chapterID)
        except Exception:
            traceback.print_exc()
            return 'Cannot create section', 400
        data = PUTL.get_section_content_rendered(projectID, newSectionID) 
        return jsonify({"sectionData": data}), 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-section-title', methods=['POST'])
def app_api_set_section_title():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        newSectionTitle = data['newSectionTitle']
        if PUTL.section_title_is_set(projectID, sectionID, newSectionTitle):
            return "", 200
        return "Cannot change section title", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-section-raw-content', methods=['POST'])
def app_api_get_section_raw_content():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionRawContent = PUTL.get_section_raw_content(projectID, sectionID)
        if data.get('keepNewLine', False):
            if data['keepNewLine'] == 1:
                return jsonify({"sectionRawContent":sectionRawContent}), 200
        return jsonify({"sectionRawContent":sectionRawContent.replace("\n", "<br>")}), 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-section-content', methods=['POST'])
def app_api_set_section_content():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        newSectionContent = data['newSectionContent']
        # This is a fix for the extra newline Quasar editor sometimes adds.
        newSectionContent = re.sub(r'\n{3,}', '\n\n', newSectionContent)
        if PUTL.section_content_is_set(projectID, sectionID, newSectionContent):
            data = PUTL.get_section_content_rendered(projectID, sectionID) 
            return jsonify({"sectionData": data}), 200
        return "Error setting section content"
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/update-section-content', methods=['POST'])
def app_api_update_section_content():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        data = PUTL.get_section_content_rendered(projectID, sectionID) 
        print(data)
        return jsonify({"sectionData": data}), 200
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/create-section-directory', methods=['POST'])
def app_api_create_section_directory():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        message, section_directory_created = PUTL.section_directory_is_created(projectID, sectionID)
        if section_directory_created:
            return "", 200
        return message, 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-sections-for-search', methods=['POST'])
def app_api_get_sections_for_search():
    try:
        data = request.get_json()
        projectID = data['projectID']
        query = data['query']
        sectionsIDsPerProject = PUTL.get_sections_IDs_based_on_search_bar_query(projectID, query)
        if not sectionsIDsPerProject:
            return "Search query matched no sections.", 400
        sectionsRendered = []
        for projectID in sectionsIDsPerProject:
            sectionsIDs = sectionsIDsPerProject[projectID]
            for sectionID in sectionsIDs:
                sectionsRendered.append(PUTL.get_section_content_rendered(projectID, sectionID))
        if sectionsRendered:
            return jsonify(sectionsRendered), 200
        return "Search query matched no sections.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-section', methods=['POST'])
def app_api_delete_section():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        if PUTL.section_directory_exists(projectID, sectionID):
            sectionDirDeleted = False
        else:
            sectionDirDeleted = True
        if not sectionDirDeleted:
            sectionDirDeleted = PUTL.section_directory_is_deleted(projectID, sectionID)

        if PUTL.section_in_db_exists(projectID, sectionID):
            sectionInDBDeleted = False
        else:
            sectionInDBDeleted = True
        if not sectionInDBDeleted:
            sectionInDBDeleted = PUTL.section_in_db_is_deleted(projectID, sectionID)
        
        if sectionDirDeleted and sectionInDBDeleted:
            return "", 200
        return "Cannot delete section.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-notebook', methods=['POST'])
def app_api_delete_notebook():
    try:
        data = request.get_json()
        projectID = data['projectID']
        notebookID = data['notebookID']
        sectionsFate = data['sections-fate']
        if PUTL.notebook_is_deleted(projectID, notebookID, keep_sections=(sectionsFate=="keep-sections")):
            return "", 200
        return "Cannot delete notebook.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-chapter', methods=['POST'])
def app_api_delete_chapter():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sectionsFate = data['sections-fate']
        if PUTL.chapter_is_deleted(projectID, chapterID, keep_sections=(sectionsFate=="keep-sections")):
            return "", 200
        return "Cannot delete notebook.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-project-description', methods=['POST'])
def app_api_set_project_description():
    try:
        data = request.get_json()
        projectID = data['projectID']
        newProjectDescription = data['newProjectDescription']
        if PUTL.project_description_is_set(projectID, newProjectDescription):
            return "", 200
        return "Cannot change project description.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-project-name', methods=['POST'])
def app_api_set_project_name():
    try:
        data = request.get_json()
        projectID = data['projectID']
        newProjectName = data['newProjectName']
        if PUTL.project_exists(newProjectName):
            return "Project name exists.", 400
        if PUTL.project_name_is_set(projectID, newProjectName):
            return "", 200
        return "Cannot change project name.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/delete-project', methods=['POST'])
def app_api_delete_project():
    try:
        data = request.get_json()
        projectID = data['projectID']
        if PUTL.project_is_deleted(projectID):
            return "", 200
        return "Cannot delete project.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-sections-tags', methods=['POST'])
def app_api_set_section_tags():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionTags = data['sectionTags']
        if PUTL.section_tags_is_set(projectID, sectionID, sectionTags):
            return "", 200
        return "Cannot change section tags.", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/set-chapter-sections-order', methods=['POST'])
def app_api_set_chapter_sections_order():
    try:
        data = request.get_json()
        projectID = data['projectID']
        chapterID = data['chapterID']
        sectionsOrder = data['sectionsOrder']
        sectionsOrder = sectionsOrder.splitlines()
        sectionsIDs = []
        for section in sectionsOrder:
            try:
                if section:
                    if "-" in section:
                        sectionsIDs.append(int(section.split("-")[0].strip()))
                    else:
                        sectionsIDs.append(int(section.strip()))
            except Exception:
                continue
        sectionsIDs = list(dict.fromkeys(sectionsIDs)) # Remove duplicates and keep order
        sectionsIDsExistInDB = PUTL.check_which_section_IDs_exist_in_db(projectID, sectionsIDs)
        sectionsIDs = [sID for sID in sectionsIDs if sID in sectionsIDsExistInDB]
        if PUTL.chapter_links_are_deleted(projectID, chapterID):
            if sectionsIDs:
                if PUTL.chapter_sections_links_are_created(projectID, chapterID, sectionsIDs):
                    return "", 200
                else:
                    return "Cannot rearrange sections", 400
            else:
                return "", 200
        else:
            return "Cannot rearrange sections", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400

@apiroutes.route('/api/get-omilayers', methods=['POST'])
def app_api_get_omilayers():
    try:
        data = request.get_json()
        projectID = data['projectID']
        DBpath = data['DBpath']
        layers = tools.get_omilayers(projectID, DBpath)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(layers)

@apiroutes.route('/api/get-data-for-omilayer', methods=['POST'])
def app_api_get_data_for_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        DBpath = data['DBpath']
        layerName = data['layer']
        nrows = data['nrows']
        columns, rows, layerInfo = PUTL.get_data_for_omilayer(projectID, DBpath, layerName, nrows)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify({"columns":columns, "rows":rows, "layerInfo":layerInfo})

@apiroutes.route('/api/get-section-directory-tree', methods=['POST'])
def app_api_get_section_directory_tree():
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionID = data['sectionID']
        sectionDirectoryTree = PUTL.get_section_directory_tree(projectID, sectionID)
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(sectionDirectoryTree)



# FILES RELATED ROUTES
# ====================
@apiroutes.route('/api/files/<projectid>/<path:filename>', methods=['GET'])
def get_filepath(projectid, filename):
    projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectid)
    filePath = Path(projectDir).joinpath(filename)


    fileExtention = Path(filePath).suffix
    docExtensions = ['.docx', 
                     '.doc', 
                     '.xls', 
                     '.xlsx',
                     '.ppt',
                     '.pptx'
                     ]

    flatExtensions = [
                     '.csv',
                     '.tsv',
                     '.txt',
                     '.md',
                     '.py',
                     '.sh',
                     '.R',
                     '.Rscript',
                     '.json',
                     '.tex'
                    ]

    if not filePath.exists() and fileExtention not in flatExtensions:
        return f"File {filePath} does not exist.", 400

    if fileExtention in docExtensions:
        fileViewer = {
                "linux"  : "xdg-open",
                "windows": "start",
                "osx"    : "open",
                "darwin" : "open"
                }
        subprocess.run([fileViewer[OSname], filePath], capture_output=True, check=False, text=True)
        return '', 204 
    elif fileExtention in flatExtensions:
        if Path(filePath).exists():
            with open(filePath, 'r') as inf:
                fileContents = inf.read()
        else:
            fileContents = ""
        return jsonify({"fileContents":fileContents})
    dirPath = filePath.parent
    filename = filePath.name
    return send_from_directory(dirPath, filename)

@apiroutes.route('/api/upload-files-to-section', methods=['POST'])
def upload_files_to_section():
    projectID = request.form.get('projectID')
    sectionID = request.form.get('sectionID')
    projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
    sectionDir = Path(projectDir).joinpath(f"sections/{sectionID}")
    try:
        if not sectionDir.exists():
            sectionDir.mkdir(exist_ok=False)
        for k in request.files.keys():
            f = request.files[k]
            f.save(sectionDir.joinpath(f.filename))
    except Exception:
        traceback.print_exc()
        return '', 400
    return "", 200

@apiroutes.route('/api/create-new-omilayer', methods=['POST'])
def api_create_new_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerDescription = data['layerDescription']
        columns = data['columns']

        if PUTL.omilayer_exists(projectID, dbPath, layerName):
            return "Omilayer already exists", 400

        if not PUTL.new_omilayer_is_created(projectID, dbPath, layerName, layerDescription, columns):
            return "Cannot create omilayer.", 400
    except Exception:
        traceback.print_exc()
        return "Cannot create omilayer.", 400
    return "", 200

@apiroutes.route('/api/get-column-names-and-dtypes-for-omilayer', methods=['POST'])
def api_get_omilayer_column_names_and_dtypes():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerColumns = PUTL.get_column_names_and_dtypes_for_omilayer(projectID, dbPath, layerName)
        if len(layerColumns) > 10:
            return "Layer has more than 10 columns", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return jsonify(layerColumns)

@apiroutes.route('/api/insert-data-to-omilayer', methods=['POST'])
def api_insert_data_to_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerData = data['layerData']
        if not PUTL.data_are_inserted_to_omilayer(projectID, dbPath, layerName, layerData):
            return "Cannot insert data to omilayer", 400
    except Exception:
        traceback.print_exc()
        return "Something went wrong", 400
    return "", 200

@apiroutes.route('/api/upload-file-to-omilayer', methods=['POST'])
def upload_file_to_omilayer():
    try:
        projectID = request.form.get('projectID')
        dbPath = request.form.get('dbPath')
        layerName = request.form.get('layerName')
        projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        uploaded_file = request.files['omilayerData']
        file_extension = Path(uploaded_file.filename).suffix

        if file_extension == '.xls' and not tools.is_module_installed("xlrd"):
            return "Python package 'xlrd' is not installed"

        if file_extension == '.xlsx' and not tools.is_module_installed("openpyxl"):
            return "Python package 'openpyxl' is not installed", 400

        if not PUTL.file_is_inserted_to_omilayer(projectID, dbPath, layerName, uploaded_file, file_extension):
            return "Cannot insert file to omilayer", 400
    except Exception:
        traceback.print_exc()
        return 'Cannot insert file to omilayer.', 400
    return "", 200

@apiroutes.route('/api/set-omilayer-description', methods=['POST'])
def api_set_omilayer_description():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        layerInfo = data['layerInfo']
        if not PUTL.omilayer_description_is_set(projectID, dbPath, layerName, layerInfo):
            return "Cannot set omilayer description.", 400
    except Exception:
        traceback.print_exc()
        return 'Cannot set omilayer description.', 400
    return "", 200

@apiroutes.route('/api/delete-omilayer', methods=['POST'])
def api_delete_omilayer():
    try:
        data = request.get_json()
        projectID = data['projectID']
        dbPath = data['dbPath']
        layerName = data['layerName']
        if not PUTL.omilayer_is_deleted(projectID, dbPath, layerName):
            return 'Cannot delete layer', 400
    except Exception:
        traceback.print_exc()
        return 'Cannot delete layer', 400
    return "", 200

@apiroutes.route('/api/get-view-sections', methods=['POST'])
def app_api_get_view_sections():
    # try:
    data = request.get_json()['parsedArgs']
    projectName, *sectionsIDs = data
    try:
        projectID = tools.get_project_ID_based_on_name(projectName.strip())
    except Exception:
        traceback.print_exc()
        return 'Project does not exist', 400

    try:
        sectionsIDs = [int(x.strip()) for x in sectionsIDs]
    except Exception:
        traceback.print_exc()
        return 'Section IDs are not integers', 400

    try:
        renderedSections = []
        for sectionID in sectionsIDs:
            renderedSection = PUTL.get_section_content_rendered(projectID, sectionID)
            if not renderedSection:
                return 'One or more section IDs not found.', 400
            renderedSections.append(renderedSection)
    except Exception:
        traceback.print_exc()
        return 'One or more section IDs not found.', 400
    
    return jsonify(renderedSections), 200

@apiroutes.route('/api/sections-to-pdf', methods=['POST'])
def app_api_sections_to_pdf():
    if not tools.is_typst_installed():
        return "Typst not installed", 400
    typstExecutable = tools.get_typst_path()
    try:
        data = request.get_json()
        projectID = data['projectID']
        sectionsIDs = data['sectionsIDs']
        notebookName = data['notebookName']
        chapterName = data['chapterName']
        renderPDFFlag = data['renderPDFFlag'] # 1 = render PDF or 0 = write .typ file

        projectInfo = tools.get_project_info(projectID, input_is_uuid=True)
        typst_preamble = Path(projectInfo['dirFullPath']).joinpath("typst.preamble")
        if typst_preamble.exists():
            with open(typst_preamble, 'r') as inf:
                pdfOptions = inf.read()
        else:
            pdfOptions = """
#set page(paper: "a4")
#set par(justify: true)
#show link: set text(fill: blue)
#set heading(numbering: "1.")
#show table.cell.where(y: 0): set text(weight: "bold")
#set table( 
    fill: (_, y) => if calc.odd(y) { rgb("#EAF2F5") }, 
    stroke: 1pt + rgb("#21222C")
)
#let tickedIcon = text(fill:rgb("#178236"), font: "DejaVu Sans", "\\u{2611}")
#let untickedIcon = text(font: "DejaVu Sans", "\\u{2610}")
#let errorIcon = text(fill:red, font: "DejaVu Sans", "\\u{2612}")
#let infoIcon = text(
  fill: blue,
  font: "DejaVu Sans", 
  size: 1.2em,
  baseline: 0.1em,
  "\\u{24d8}"
)
#set list(marker: ([•], [], []))
#import "@preview/mitex:0.2.4": *

"""
        pdf_content = [pdfOptions]
        for sectionID in sectionsIDs:
            sectionRenderedContainers = PUTL.get_section_content_rendered(projectID, sectionID, render_type='pdf')
            pdf_content.append(f'= {sectionRenderedContainers["title"]}')
            for containerJSON in sectionRenderedContainers['content']:
                for contentJSON in containerJSON['content']:
                    if not contentJSON['text']:
                        continue
                    if contentJSON['type'] == "table":
                        tableJSON = contentJSON['text'][0]
                        contentText = f"""
                                        #figure(
                                            table(
                                                columns: {len(tableJSON['columns'])},
                                                stroke: none,
                                                table.hline(),
                                                table.header{''.join([f'[{col}]' for col in tableJSON['columns']])},
                                                table.hline(stroke: .5pt),
                                                {"\n  ".join([f"[{item}]," for row in tableJSON['rows'] for item in row])}
                                                table.hline(),
                                            ),
                                            caption: [{tableJSON['title']}]
                                        )
                                        """
                    elif contentJSON['type'] == 'figures':
                        for figJSON in contentJSON['text']:
                            if figJSON['file_exists'] == 1:
                                contentText = f"""
                                                #figure(
                                                    image("{figJSON['figure_path']}", width: 100%),
                                                    caption: [{figJSON['caption']}],
                                                )
                                                """
                                pdf_content.append(contentText)
                        continue
                    elif contentJSON['type'] == "files":
                        continue
                    elif contentJSON['type'] == "omitable":
                        continue
                    else:
                        contentText = contentJSON['text'][0] + "\n"
                    pdf_content.append(contentText)
        pdf_content = "\n".join(pdf_content)

        # Specify PDF output
        if len(sectionsIDs) == 1:
            sectionID = sectionsIDs[0]
            sectionFullPath = Path(projectInfo['dirFullPath']).joinpath(f"sections/{str(sectionID)}")
            sectionFullPath.mkdir(exist_ok=True)
            typst_out_filename = sectionFullPath.joinpath(f"typst_output_s{sectionID}")
        else:
            outDirFullPath = Path(projectInfo['dirFullPath']).joinpath("typst_pdf_renderings")
            outDirFullPath.mkdir(exist_ok=True)
            outfilename = f"{projectInfo['name']}_{notebookName.replace(' ', '_').lower()}_{chapterName.replace(' ', '_').lower()}"
            typst_out_filename = outDirFullPath.joinpath(outfilename)

        if renderPDFFlag == 1:
            typst_out_filename = typst_out_filename.with_suffix(".pdf")
            result = subprocess.run(
                                    [typstExecutable, "compile", "-", typst_out_filename, "--root", str(Path.home())],
                                    input=pdf_content,
                                    text=True,
                                    capture_output=True
            )

            if result.returncode == 0:
                return "", 200
            else:
                print(result.stderr)
                return 'Error creating PDF', 400
        else:
            typst_out_filename = typst_out_filename.with_suffix(".typ")
            with open(typst_out_filename, 'w') as outf:
                print(pdf_content, file=outf)

    except Exception:
        traceback.print_exc()
        return 'Error creating PDF', 400
    return "", 200

@apiroutes.route('/api/store-ace-editor-content', methods=['POST'])
def api_store_ace_editor_content():
    try:
        data = request.get_json()
        file_path = data['file_path']
        file_content = data['file_content']
        projectid, *rest = file_path.split("/")
        file_rel_path = "/".join(rest)
        projectDir, projectDB = tools.get_paths_for_project_dir_and_db(projectid)
        filePath = Path(projectDir).joinpath(file_rel_path)
        with open(filePath, 'w') as outf:
            print(file_content, file=outf)
    except Exception:
        traceback.print_exc()
        return 'Cannot store file content.', 400
    return "", 200

@apiroutes.route('/api/start-process', methods=['POST'])
def api_start_process():
    try:
        data = request.get_json()
        projectID = data['projectID']
        condaEnv = data['conda']
        workdir = data['workdir']
        command = data['script']

        executable, scriptName, *_ = command.split(" ")

        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        workdir_fullpath = Path(projectDirectory).joinpath(workdir)
        script_fullpath = workdir_fullpath.joinpath(scriptName)
        if not script_fullpath.exists():
            return 'Script does not exist', 400
        logDir = Path(projectDirectory).joinpath("processes_logs")
        logDir.mkdir(exist_ok=True)
        logFilename = f"{workdir.replace('/', '_')}_{scriptName}"
        logFilename_fullpath = logDir.joinpath(logFilename).with_suffix(".json")
        tools.run_and_log(
                script_cmd=command,
                conda_env=condaEnv,
                workdir=str(workdir_fullpath),
                log_file=str(logFilename_fullpath),
                process_name=logFilename
                )

    except Exception:
        traceback.print_exc()
        return 'Cannot start process', 400
    return "", 200

@apiroutes.route('/api/get-processes', methods=['POST'])
def api_get_processes():
    processesLogs = []
    try:
        data = request.get_json()
        projectID = data['projectID']
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        logDir = Path(projectDirectory).joinpath("processes_logs")
        if not logDir.exists():
            return [], 200
        for log_file in logDir.glob("*.json"):
            with open(log_file) as f:
                pJSON = json.load(f)
            if pJSON['status'] == 'running':
                processesLogs.append(pJSON['processName'])
    except Exception:
        traceback.print_exc()
        return 'Cannot load processes logs', 400
    return jsonify(processesLogs), 200

@apiroutes.route('/api/get-process-output', methods=['POST'])
def api_get_process_output():
    try:
        data = request.get_json()
        logFile = Path(data['logFile'])
        stdType = data["stdType"]
        if not logFile.exists():
            return "Log file does not exist", 400
        with open(logFile, 'r') as inf:
            logJSON = json.load(inf)
        if stdType not in logJSON:
            return "Output type not found in log file", 400
    except Exception:
        traceback.print_exc()
        return 'Cannot read log file', 400
    return jsonify({"log":logJSON[stdType]}), 200

@apiroutes.route('/api/get-project-duckdbs', methods=['POST'])
def api_get_project_duckdkb():
    try:
        data = request.get_json()
        projectID = data['projectID']
        projectDirectory, projectDB = tools.get_paths_for_project_dir_and_db(projectID)
        dbs = []
        for pathdb in Path(projectDirectory).rglob("*.duckdb"):
            pathdbRelPath = str(pathdb.relative_to(projectDirectory))
            dbs.append({"label":pathdbRelPath})
    except Exception:
        traceback.print_exc()
        return 'Cannot load project databases', 400
    return jsonify(dbs), 200

@apiroutes.route("/api/fetch-plot-data", methods=["POST"])
def api_fetch_plot_data():
    if not tools.is_module_installed('pyarrow'):
        return "pyarrow is not installed"
    try:
        data = request.get_json()
        print(data)
        projectID = data['projectID']
        DBpath = data['DBpath']
        sqlQuery = data['sqlQuery']
        sqlQuery = sqlQuery.strip()

        if not sqlQuery:
            return jsonify({"error": "No query provided"}), 400

        df = PUTL.get_data_from_omilayer_for_plotting(projectID, DBpath, sqlQuery)
    except Exception as e:
        return "Error executing query", 400

    table = pa.Table.from_pandas(df, preserve_index=False)
    sink = pa.BufferOutputStream()
    writer = pa.ipc.new_stream(sink, table.schema)
    writer.write_table(table)
    writer.close()
    arrow_bytes = sink.getvalue().to_pybytes()

    return Response(
        arrow_bytes,
        mimetype="application/vnd.apache.arrow.stream",
        headers={"Content-Type": "application/vnd.apache.arrow.stream"}
    )
