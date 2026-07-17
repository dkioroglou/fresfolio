const { defineComponent } = Vue;

import SectionCard from '/static/js/vue_assets/components/section_card.js'
import Todos from '/static/js/vue_assets/components/todos.js'
import PlotRenderer from '/static/js/vue_assets/components/plot_renderer.js'
import OmilayersRenderer from '/static/js/vue_assets/components/omilayers_renderer.js';

const ProjectLayout = defineComponent({
    components: {
        SectionCard,
        Todos,
        PlotRenderer,
        OmilayersRenderer

    },
    props:['selectedProjectID', 'selectedProjectName'],
    data () {
        return {
            leftDrawerOpen: true,
            leftDrawerWidth: 400,
            drawers: {
                search: false,
                view: false,
                pinned: false,
                chat: false,
                todos: false,
                processes: false,
                plot: false,
                omilayers: false,
            },
            notebooksDrawerOpen: true,
            notebooksFetched: false,
            chaptersBTNCollapseIcon: "chevron_left",
            notebooks: [],
            sectionsDataFetched: false,
            showCreateNotebookDialog: false,
            newNotebookName: "",
            showCreateChapterDialog: false,
            newChapterName: "",
            renderedNotebookIDX: "",
            renderedNotebookName: "",
            renderedChapterIDX: "",
            renderedChapterName: "",
            renderedChapterSectionsOrder: "",
            showRearrangeChapterSectionsDialog: false,
            showSearchSectionsDialog: false,
            searchSectionsOrder: "",
            showFileUploaderDialog: false,
            fetchedSectionsToRender: true,
            fetchingChatSectionsToRender: false,
            renderedSections: [],
            chatSections: [],
            searchSections: [],
            viewSections: [],
            pinnedSections: [],
            selectedNotebookID: null,
            selectedNotebookIDX: null,
            selectedNotebookName: null,
            selectedChapterID: null,
            selectedChapterIDX: null,
            selectedChapterName: null,
            selectedNotebookChapters: [],
            isSaving: false,
            expandAll: false,
            searchText: '',
            useRAG: false,
            searchThreshold: 0.7,
            sectionIDToUploadFiles: null,
            uploadToSectionRoute: "/api/upload-files-to-section",
            uploadToSectionFields: [],
            showAceEditor: false,
            aceEditorModeMapper: {"MD": "markdown", 
                                  "TXT": "markdown", 
                                  "PY": "python", 
                                  "HTML": "html", 
                                  "JS": "javascript",
                                  "SH": "sh",
                                  "R": "r",
                                  "Rscript":"r",
                                  "CSV":"csv",
                                  "TSV":"tsv",
                                  "JSON":"json",
                                  "TEX":"latex"
            },
            aceEditorMode: "markdown",
            aceEditorFilePath: "",
            aceEditorFileTitle: "",
            editorInstance: null,
            isMinimized: false,
            isExpanded: false,
            initialCode: "",
            processesList: [],
            processPollingInterval: null,
            chatPrompt: "",
            isSubmittingPrompt: false,
            ai_api_key_found: false,
            ai_models: [],
            selectedModel: "",
            logViewerContent: "",
            showLogViewer: false,
            creatingRag: false,
            initChecks: {},
            taskID: null,
            monitorTaskTimer: null,
        }
    },
    methods: {
        toggleNotebookDrawer() {
            if (this.notebooksDrawerOpen) {
                this.notebooksDrawerOpen = false;
                this.leftDrawerWidth = 200;
                this.chaptersBTNCollapseIcon = "chevron_right";
            } else {
                this.notebooksDrawerOpen = true;
                this.leftDrawerWidth = 400;
                this.chaptersBTNCollapseIcon = "chevron_left";
            }
        },
        toggleDrawer(name) {
            const wasOpen = this.drawers[name];
            Object.keys(this.drawers).forEach(key => {
                if (key !== name) {
                    this.drawers[key] = false;
                }
            });
            this.drawers[name] = !wasOpen;
        },
        toggleChatDrawer() {
            if (this.chatSections.length === 0){
                this.getChatSections();
            }
            this.toggleDrawer('chat');
        },
        clearSearchSections() {
            this.toggleDrawer("search")
            this.searchSections = [];
        },
        clearViewSections() {
            this.toggleDrawer("view");
            this.viewSections = [];
        },
        clearPinnedSections() {
            this.toggleDrawer("pinned");
            this.pinnedSections = [];
        },
        searchDrawerWidth() {
            if (this.$q.screen.lt.md) {
                return this.$q.screen.width
            } else {
                return Math.round(this.$q.screen.width - this.leftDrawerWidth)
            }
        },
        selectNotebook(id) {
            this.selectedNotebookID = id
            this.selectedNotebookIDX = this.notebooks.findIndex(notebook => notebook.notebookID === id)
            this.selectedNotebookChapters = this.notebooks[this.selectedNotebookIDX]['chapters']
        },
        selectChapter(id) {
            this.selectedChapterID = id
            this.selectedChapterIDX = this.selectedNotebookChapters.findIndex(chapter => chapter.chapterID === id)
            this.renderedNotebookIDX = this.selectedNotebookIDX;
            this.renderedNotebookName = this.getNotebookAttribute(this.selectedNotebookIDX, 'notebookName')
            this.renderedChapterIDX = this.selectedChapterIDX;
            this.renderedChapterName = this.getChapterAttribute(this.selectedNotebookIDX, this.selectedChapterIDX, 'chapterName')
            this.fetchedSectionsToRender = false;
            this.renderedSections = [];
            this.getChapterSections();
            this.closeAllDrawers();
        },
        computed: {
            selectedItem() {
                  return this.notebooks.find(notebook => notebook.notebookID === this.selectedNotebookID);
            }
            
        },
        async getChapterSections() {
            this.fetchedSectionsToRender = false;
            try {
                const response = await fetch("/api/get-chapter-sections", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "chapterID":this.getChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterID')
                        }
                    )
                });

                if (response.ok) {
                    this.renderedSections = await response.json();
                    this.fetchedSectionsToRender = true;
                } else {
                    const responseText = await response.text();
                    this.fetchedSectionsToRender = true;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async getChatSections() {
            this.fetchingChatSectionsToRender = true;
            try {
                const response = await fetch("/api/get-chat-sections", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID
                        }
                    )
                });

                if (response.ok) {
                    this.chatSections = await response.json();
                    this.fetchingChatSectionsToRender = false;
                } else {
                    const responseText = await response.text();
                    this.fetchingChatSectionsToRender = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        changeProject () {
            window.location.href = "/";
        },
        logout() {
            localStorage.clear();
            window.location.href = "/logout";
        },
        async refreshNotebooks() {
            this.notebooksFetched = false;
            this.get_notebooks();
        },
        async createNotebook() {
            try {
                const response = await fetch("/api/create-notebook", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {"projectID": this.selectedProjectID, "notebook":this.newNotebookName}
                    )
                });

                if (response.ok) {
                    this.showCreateNotebookDialog = false;
                    this.newNotebookName = "";
                    this.notebooksFetched = false;
                    this.get_notebooks();
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async createChapter() {
            try {
                const response = await fetch("/api/create-chapter", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "notebookID":this.getNotebookAttribute(this.selectedNotebookIDX, 'notebookID'),
                            "chapterName":this.newChapterName
                        }
                    )
                });

                if (response.ok) {
                    this.showCreateChapterDialog = false;
                    this.newChapterName = "";
                    this.notebooksFetched = false;
                    this.get_notebooks();
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async get_notebooks(){
            try {
                const response = await fetch("/api/get-notebooks", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {"projectID": this.selectedProjectID}
                    )
                });

                if (response.ok) {
                    const data = await response.json();
                    this.notebooks = data;
                    this.notebooksFetched = true;
                    if (this.selectedNotebookIDX != null){
                        this.selectedNotebookChapters = this.getNotebookAttribute(this.selectedNotebookIDX, 'chapters')
                    }
                } else {
                    this.$q.notify({
                        message: 'Error fetching notebooks.',
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        getNotebookAttribute(notebookIDX, attribute) {
            return this.notebooks[notebookIDX][attribute]
        },
        setNotebookAttribute(notebookIDX, attribute, value) {
            this.notebooks[notebookIDX][attribute] = value;
        },
        setChapterAttribute(notebookIDX, chapterIDX, attribute, value) {
            this.notebooks[notebookIDX]['chapters'][chapterIDX][attribute] = value;
        },
        getChapterAttribute(notebookIDX, chapterIDX, attribute) {
            return this.notebooks[notebookIDX]['chapters'][chapterIDX][attribute]
        },
        async setNotebookName(scope) {
            this.isSaving = true;
            try {
                const response = await fetch("/api/set-notebook-name", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "notebookID":this.getNotebookAttribute(this.renderedNotebookIDX, 'notebookID'),
                            "newNotebookName": scope.value
                        }
                    )
                });

                if (response.ok) {
                    this.isSaving = false;
                    scope.set(scope.value);
                    this.setNotebookAttribute(this.renderedNotebookIDX, 'notebookName', scope.value)
                } else {
                    const responseText = await response.text();
                    this.isSaving = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async setChapterName(scope) {
            this.isSaving = true;
            try {
                const response = await fetch("/api/set-chapter-name", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "notebookID":this.getNotebookAttribute(this.renderedNotebookIDX, 'notebookID'),
                            "chapterID":this.getChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterID'),
                            "newChapterName": scope.value
                        }
                    )
                });

                if (response.ok) {
                    this.isSaving = false;
                    scope.set(scope.value);
                    this.setChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterName', scope.value)
                } else {
                    const responseText = await response.text();
                    this.isSaving = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async createSection() {
            try {
                const response = await fetch("/api/create-section", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "chapterID":this.getChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterID'),
                        }
                    )
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem(data['sectionData']['ID'], 'true')
                    this.renderedSections.push(data['sectionData']);
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async search() {
            if (this.useRAG) {
                var searchQuery = "@rag-"+this.searchThreshold+":"+this.searchText
            } else {
                var searchQuery = this.searchText
            }
            try {
                const response = await fetch("/api/get-sections-for-search", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedProjectID,
                        "query": searchQuery
                    }),
                });
                if (response.ok) {
                    this.searchSections = await response.json();
                    this.searchText = '';
                    if (this.searchSections.length !== 0){
                        if (!this.drawers.search) {
                            this.toggleDrawer('search');
                        }
                    }
                } else {
                    const responseText = await response.text(); 
                    this.searchSections = [];
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                  console.log(error);
            }
        },
        deleteRenderedSection(sectionID) {
            this.renderedSections = this.renderedSections.filter(section => section.ID !== sectionID);
            this.searchSections = this.searchSections.filter(section => section.ID !== sectionID);
            this.pinnedSections = this.pinnedSections.filter(section => section.ID !== sectionID);
            this.chatSections = this.chatSections.filter(section => section.ID !== sectionID);
        },
        pinSection(projectID, sectionID) {
            const sectionPinned = this.pinnedSections.find(section => section.ID === sectionID && section.projectID === projectID);
            if (sectionPinned) {
                this.pinnedSections = this.pinnedSections.filter(section => !(section.ID === sectionID && section.projectID === projectID));
            } else {
                const sectionInRenderedSections = this.renderedSections.find(section => section.ID === sectionID && section.projectID === projectID);
                const sectionInSearchSections = this.searchSections.find(section => section.ID === sectionID && section.projectID === projectID);
                if (sectionInRenderedSections) {
                    const sectionJSON = this.renderedSections.find(section => section.ID === sectionID && section.projectID === projectID);
                    this.pinnedSections.push({ ...sectionJSON })  
                } else if (sectionInSearchSections) {
                    const sectionJSON = this.searchSections.find(section => section.ID === sectionID && section.projectID === projectID);
                    this.pinnedSections.push({ ...sectionJSON })  

                }
            }
        },
        async getView(parsedArgs) {
            try {
                const response = await fetch("/api/get-view-sections", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "parsedArgs": parsedArgs
                        }
                    )
                });

                if (response.ok) {
                    this.viewSections = await response.json();
                    if (this.viewSections.length) {
                        if (!this.drawers.view){
                            this.toggleDrawer('view');
                        }
                    }
                } else {
                    const responseText = await response.text()
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        getRelativeFilePathFromUrl(fileUrl) {
            const url = new URL(fileUrl, window.location.origin);
            // Replaces "/api/file/" (and any leading slashes) with an empty string
            return url.pathname.replace(/^\/api\/files\//, "");
        },
        async loadFileIntoAceEditor(fileJSON) {
            try {
                const response = await fetch(fileJSON['url'], { method: "GET" });
                if (response.ok) {
                    const data = await response.json();
                    const relativePath = this.getRelativeFilePathFromUrl(fileJSON['url']);
                    this.aceEditorFilePath = relativePath; 
                    this.aceEditorFileTitle = relativePath.slice(relativePath.indexOf('/') + 1)
                    this.initialCode = data['fileContents'];
                    this.aceEditorMode = this.aceEditorModeMapper[fileJSON['extension']];
                    this.isMinimized = false;
                    this.$nextTick(() => {
                        this.showAceEditor = true;
                        this.$nextTick(() => {
                            this.$nextTick(() => this.initAceEditor())
                        })
                    })
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    });
                }
            } catch (error) {
                console.error(error);
            }
        },
        async openWithAceEditor(fileJSON) {
            if (this.editorInstance != null) {
                this.$q.dialog({
                    title: 'Close previously open file?',
                    message: 'Any unsaved changes will be lost.',
                    cancel: true,
                }).onOk(async () => {
                    this.destroyAceEditor();   // destroy before loading new file
                    await this.loadFileIntoAceEditor(fileJSON);
                });
            } else {
                await this.loadFileIntoAceEditor(fileJSON);
            }
        },
        closePanel() {
            this.destroyAceEditor();
            this.showAceEditor = false;
        },
        toggleMinimize() {
            this.isMinimized = !this.isMinimized
            // Ace needs a resize hint when revealed again
            if (!this.isMinimized && this.editor) {
            this.$nextTick(() => this.editorInstance.resize())
            }
        },
        toggleExpand() {
            this.isExpanded = !this.isExpanded
            this.$nextTick(() => this.editorInstance?.resize())
        },
        initAceEditor() {
            // Initialize using the Vue ref instead of document.getElementById
            this.editorInstance = ace.edit(this.$refs.aceEditor);

            // Set themes and modes if you brought them in via Flask static
            this.editorInstance.setTheme("ace/theme/github_dark");
            this.editorInstance.session.setMode("ace/mode/"+this.aceEditorMode);

            this.editorInstance.setOption("fontSize", "14px");
            
            // Remove vertical line that marks 80 characters width
            this.editorInstance.setOption("showPrintMargin", false);

            // Enable text wrap
            this.editorInstance.setOption("wrap", true);
            this.editorInstance.session.setUseWrapMode(true);

            // Set the initial value
            this.editorInstance.setValue(this.initialCode, -1); // -1 moves cursor to the start

            // Activate vim mode
            this.editorInstance.setKeyboardHandler("ace/keyboard/vim")
            // Access the Vim extension core
            const vimApi = ace.require("ace/keyboard/vim").CodeMirror.Vim;
            // Map 'jk' to behave exactly like '<Esc>' during insert mode
            vimApi.map("jk", "<Esc>", "insert");

            // :w → trigger a save (emit an event or call your save method)
            vimApi.defineEx("write", "w", () => {
                this.saveAceEditorContent();           // replace with your save logic
            });

            // :q → trigger a close/quit (e.g. navigate away, close a panel)
            vimApi.defineEx("quit", "q", () => {
                this.closePanel();        // replace with your close logic
            });

            // :wq → save then quit
            vimApi.defineEx("wq", "wq", () => {
                this.saveAceEditorContent();
                this.closePanel();
            });

            // Force the cursor to the top-left (Line 1, Column 0)
            this.editorInstance.gotoLine(1, 0, true);
            
            // Clear selection to prevent the whole text from being highlighted
            this.editorInstance.clearSelection();

            // Force HTML focus onto the editor
            this.editorInstance.focus();

            // Optional: Resize handler to ensure it fits perfectly inside Quasar's card
            this.editorInstance.resize();
        },
        destroyAceEditor() {
            if (this.editorInstance) {
                this.editorInstance.destroy();
                this.editorInstance = null;
            }
        },
        async saveAceEditorContent() {
            try {
                const response = await fetch("/api/store-ace-editor-content", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "file_path": this.aceEditorFilePath,
                            "file_content": this.editorInstance.getValue()
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "File saved.",
                        color: 'green',
                        position: "top-right"
                    })
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }

        },
        uploadFilesToSection(sectionID) {
            this.sectionIDToUploadFiles = sectionID
            this.uploadToSectionFields = [
                                            {"name":"projectID", "value":this.selectedProjectID},
                                            {"name":"sectionID", "value":this.sectionIDToUploadFiles}
                                        ]
            this.showFileUploaderDialog = true;
        },
        onFilesUploadedToSection() {
            this.showFileUploaderDialog = false;
            this.$q.notify({
                message: 'Files successfully uploaded.',
                color: 'green',
                position: "top-right"
            })
        },
        onFilesFailedToUploadToSection() {
            this.showFileUploaderDialog = false;
            this.$q.notify({
                message: 'Failed to upload files.',
                color: 'negative',
                position: "top-right"
            })

        },
        deleteNotebook() {
            this.$q.dialog({
                title: this.renderedNotebookName,
                message: 'Choose an option:',
                options: {
                type: 'radio',
                model: 'keep-sections',
                // inline: true
                items: [
                { label: 'Delete notebook and keep sections.', value: 'keep-sections', color: 'secondary' },
                { label: 'Delete notebook and delete sections.', value: 'delete-sections' }
                ]
                },
            cancel: true,
            persistent: true
            }).onOk(sectionsFate => {
                this.deleteNotebookCallback(sectionsFate);
            })
        },
        initialize_rendered_notebooks_and_chapters() {
            this.renderedNotebookIDX = ""
            this.renderedNotebookName = ""
            this.renderedChapterIDX = ""
            this.renderedChapterName = ""
            this.renderedSections = []
            this.selectedNotebookID = null
            this.selectedNotebookIDX = null
            this.selectedNotebookName = null
            this.selectedChapterID = null
            this.selectedChapterIDX = null
            this.selectedChapterName = null
            this.selectedNotebookChapters = []
        },
        async deleteNotebookCallback(sectionsFate) {
            try {
                const response = await fetch("/api/delete-notebook", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "notebookID": this.getNotebookAttribute(this.renderedNotebookIDX, 'notebookID'),
                            "sections-fate": sectionsFate
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Notebook deleted",
                        color: 'green',
                        position: "top-right"
                    })
                    this.initialize_rendered_notebooks_and_chapters();
                    this.notebooksFetched = false;
                    this.get_notebooks();
                } else {
                    const responseText = await response.text()
                    this.showEditor = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }

        },
        deleteChapter() {
            this.$q.dialog({
                title: this.renderedChapterName,
                message: 'Choose an option:',
                options: {
                type: 'radio',
                model: 'keep-sections',
                // inline: true
                items: [
                { label: 'Delete chapter and keep sections.', value: 'keep-sections', color: 'secondary' },
                { label: 'Delete chapter and delete sections.', value: 'delete-sections' }
                ]
                },
            cancel: true,
            persistent: true
            }).onOk(sectionsFate => {
                this.deleteChapterCallback(sectionsFate);
            })
        },
        async deleteChapterCallback(sectionsFate) {
            try {
                const response = await fetch("/api/delete-chapter", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "chapterID":this.getChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterID'),
                            "sections-fate": sectionsFate
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Chapter deleted",
                        color: 'green',
                        position: "top-right"
                    })
                    this.initialize_rendered_notebooks_and_chapters();
                    this.notebooksFetched = false;
                    this.get_notebooks();
                } else {
                    const responseText = await response.text()
                    this.showEditor = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        rearrangeChapterSections() {
            this.renderedChapterSectionsOrder = "";
            this.renderedSections.forEach(section => {
                this.renderedChapterSectionsOrder += section['ID'] + "-" + section['title'] + "\n"
            })
            this.showRearrangeChapterSectionsDialog = true;
        },
        getSearchSectionsOrder() {
            this.searchSectionsOrder = "";
            this.searchSections.forEach(section => {
                this.searchSectionsOrder += section['ID'] + "-" + section['title'] + "\n"
            })
            this.showSearchSectionsDialog = true;
        },
        async setChapterSectionsOrder() {
            try {
                const response = await fetch("/api/set-chapter-sections-order", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "chapterID":this.getChapterAttribute(this.renderedNotebookIDX, this.renderedChapterIDX, 'chapterID'),
                            "sectionsOrder": this.renderedChapterSectionsOrder
                        }
                    )
                });

                if (response.ok) {
                    this.showRearrangeChapterSectionsDialog = false;
                    this.getChapterSections();
                } else {
                    const responseText = await response.text()
                    this.showRearrangeChapterSectionsDialog = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                this.showRearrangeChapterSectionsDialog = false;
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }

        },
        async sectionsToPDF(renderPDFFlag) {
            console.log(this.renderedNotebookName)
            console.log(this.renderedChapterName)
            try {
                const response = await fetch("/api/sections-to-pdf", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                            "sectionsIDs": this.renderedSections.map(item => item.ID),
                            "notebookName": this.renderedNotebookName,
                            "chapterName": this.renderedChapterName,
                            "renderPDFFlag": renderPDFFlag

                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "PDF created",
                        color: 'green',
                        position: "top-right"
                    })
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }

        },
        handleShortcut(e) {
            if (e.altKey && e.key === 'j') {
                e.preventDefault()
                this.toggleDrawer("todos")
            }

        },
        async startProcess(fileJSON) {
            if (this.processesList.includes(fileJSON['processName'])) {
                this.$q.notify({
                    message: "Process is currently running",
                    color: 'negative',
                    position: "top-right"
                })
            } else {
                try {
                    const response = await fetch("/api/start-process", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(fileJSON)
                    });

                    if (response.ok) {
                        this.$q.notify({
                            message: "Process started",
                            color: 'green',
                            position: "top-right"
                        })
                        this.processesList.push(fileJSON['processName']);
                        this.startPolling();
                    } else {
                        const responseText = await response.text();
                        this.$q.notify({
                            message: responseText,
                            color: 'negative',
                            position: "top-right"
                        })
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        },
        async getProcesses() {
            try {
                const response = await fetch("/api/get-processes", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID, 
                        }
                    )
                });

                if (response.ok) {
                    this.processesList = await response.json();
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        startPolling() {
            if (this.processPollingInterval) return; // prevent duplicate intervals

            this.processPollingInterval = setInterval(async () => {
                await this.getProcesses();
                if (this.processesList.length === 0) {
                    this.stopPolling();
                    this.$q.notify({
                        message: "Processes finished",
                        color: 'green',
                        position: "top-right"
                    })
                }
            }, 5000);
        },
        stopPolling() {
            clearInterval(this.processPollingInterval);
            this.processPollingInterval = null;
        },
        closeAllDrawers() {
            this.drawers = Object.fromEntries(
                Object.keys(this.drawers).map(key => [key, false])
            );
        },
        handleChatKeydown(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.submitChatPrompt();
            }
            },
        async submitChatPrompt() {
            this.isSubmittingPrompt = true;
            try {
                const response = await fetch("/api/submit-prompt-to-ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID,
                            "prompt": this.chatPrompt,
                            "model": this.selectedModel
                        }
                    )
                });

                if (response.ok) {
                    this.fetchingChatSectionsToRender = true;
                    const data = await response.json();
                    localStorage.setItem(data['sectionData']['ID'], 'true')
                    this.chatSections.unshift(data['sectionData']);
                    this.isSubmittingPrompt = false;
                    this.chatPrompt = "";
                    this.fetchingChatSectionsToRender = false;
                } else {
                    const responseText = await response.text();
                    this.isSubmittingPrompt = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async get_ai_models() {
            try {
                const response = await fetch("/api/get-ai-models", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify()
                });

                if (response.ok) {
                    const data = await response.json();
                    this.ai_models = data['ai_models'];
                    if (this.ai_models.length !== 0) {
                        this.selectedModel = data['ai_models'][0]
                    }
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        refreshChatSections() {
            this.getChatSections()
        },
        async getFresfolioLog() {
            try {
                const response = await fetch("/api/get-fresfolio-log", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify()
                });

                if (response.ok) {
                    const data = await response.json();
                    this.logViewerContent = data['log'];
                    this.showLogViewer = true;
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        },
        async createProjectRag() {
            this.creatingRag = true;
            try {
                const response = await fetch("/api/create-rag-for-project", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedProjectID, 
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.taskID = data['taskID'];
                    this.monitorTaskStatus();
                } else {
                    this.creatingRag = false;
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                this.creatingRag = false;
                console.error(error);
            }
        },
        monitorTaskStatus() {
            this.monitorTaskTimer = setInterval(async () => {
                const res = await fetch("/api/get-task-status", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ taskID: this.taskID })
                });
                const data = await res.json();
                if (data.status === 'done' || data.status === 'failed' || data.status === 'unknown') {
                    clearInterval(this.monitorTaskTimer);
                    this.monitorTaskTimer = null;
                    if (data.status === 'done') {
                        this.$q.notify({
                            message: "RAG created",
                            color: 'green',
                            position: "top-right"
                        })
                        this.creatingRag = false;
                    } else {
                        this.$q.notify({
                            message: data.error,
                            color: 'negative',
                            position: "top-right"
                        })
                    }
                    this.clearTask()
                }
            }, 5000); // poll every 5s
        },
        async clearTask() {
            try {
                const response = await fetch("/api/clear-task", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "taskID": this.taskID, 
                    })
                });

                if (response.ok) {
                    this.taskID = null;
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                this.creatingRag = false;
                console.error(error);
            }
        },
        incrementThreshold() {
            this.searchThreshold = Math.min(1, Math.round((this.searchThreshold + 0.1) * 10) / 10);
        },
        decrementThreshold() {
            this.searchThreshold = Math.max(0, Math.round((this.searchThreshold - 0.1) * 10) / 10);
        },
        async makeInitChecks() {
            try {
                const response = await fetch("/api/make-init-checks", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify()
                });

                if (response.ok) {
                    this.initChecks = await response.json();
                    this.useRAG = this.initChecks['vector_db_exists'];
                    this.ai_api_key_found = this.initChecks['ai_api_key_found'];
                    if (this.ai_api_key_found) {
                        this.get_ai_models()
                    }
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }

        },
        async clearFresfolioLog() {
            try {
                const response = await fetch("/api/clear-log-traceback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify()
                });

                if (response.ok) {
                    this.showLogViewer = false;
                    this.$q.notify({
                        message: "Log cleared",
                        color: 'green',
                        position: "top-right"
                    })
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
            }
        }
    },
    async mounted () {
        this.get_notebooks();
        this.getProcesses();
        this.makeInitChecks();
        window.addEventListener('keydown', this.handleShortcut)
    },
    beforeUnmount() {
        this.stopPolling(); // prevent memory leaks
        window.removeEventListener('keydown', this.handleShortcut)
    },
    template: `
<q-layout view="hHh LpR fFf">
    <q-header class="app-header-color">
        <q-toolbar>

            <q-btn
                flat
                dense
                round
                @click="leftDrawerOpen = !leftDrawerOpen"
                aria-label="Menu"
                icon="menu"
            ></q-btn>

            <q-toolbar-title>
                {{selectedProjectName}}
            </q-toolbar-title>

            <q-btn
                round
                class="q-mr-md"
                color="primary"
                size="md"
                v-if="viewSections.length"
                icon="visibility"
                @click="toggleDrawer('view')"
            />

            <q-btn
                round
                class="q-mr-md"
                color="primary"
                size="md"
                v-if="pinnedSections.length"
                icon="push_pin"
                @click="toggleDrawer('pinned')"
            />

            <q-btn
                round
                class="q-mr-md"
                color="primary"
                size="md"
                v-if="searchSections.length"
                icon="search"
                @click="toggleDrawer('search')"
            />

            <q-btn
                v-if="processesList.length"
                round
                class="q-mr-md"
                color="primary"
                size="md"
                icon="terminal"
                @click="toggleDrawer('processes')"
            />

            <q-btn
                v-if="ai_api_key_found && ai_models.length > 0"
                round
                class="q-mr-md"
                color="primary"
                size="md"
                icon="forum"
                @click="toggleChatDrawer"
            />

            <q-btn
                v-if="initChecks.extras_installed"
                round
                class="q-mr-md"
                color="primary"
                size="md"
                icon="table_chart"
                @click="toggleDrawer('omilayers')"
            />

            <q-btn
                v-if="initChecks.extras_installed"
                round
                class="q-mr-md"
                color="primary"
                size="md"
                icon="bar_chart"
                @click="toggleDrawer('plot')"
            />

            <q-btn
                round
                class="q-mr-md"
                color="primary"
                size="md"
                icon="assignment_turned_in"
                @click="toggleDrawer('todos')"
            />

            <!-- SEARCH BAR START -->
            <q-input
                v-model="searchText"
                type="textarea"
                autogrow
                dense
                dark
                placeholder="Search"
                class="col-4 q-mr-sm"
                @keydown.enter.prevent="searchText && search()"
                :dense="dense">
                    <template v-slot:append>
                        <q-icon id="search-bar-icon" name="close" @click="searchText = ''" class="cursor-pointer" />
                    </template>
            </q-input>

            <div v-if="initChecks.vector_db_exists" class="column mode-column q-mr-sm">
                <q-checkbox
                    v-model="useRAG"
                    size="sm"
                    dense
                    dark
                    label="RAG"
                    color="primary"
                    keep-color
                />
                <div v-if="useRAG" class="threshold-display row items-center no-wrap">
                    <span class="threshold-value">{{ searchThreshold.toFixed(1) }}</span>
                    <div class="row items-center stepper-arrows q-ml-xs">
                        <q-icon
                            name="keyboard_arrow_left"
                            class="cursor-pointer stepper-arrow"
                            @click="decrementThreshold"
                        />
                        <q-icon
                            name="keyboard_arrow_right"
                            class="cursor-pointer stepper-arrow"
                            @click="incrementThreshold"
                        />
                    </div>
                </div>
            </div>
            <!-- SEARCH BAR END -->

            <q-btn color="primary" label="Menu">
                <q-menu
                    :offset="[0, 10]"
                    transition-show="jump-down"
                    transition-hide="jump-up"
                    :style="{ backgroundColor: 'var(--q-primary)', color: 'white'}"
                >
                    <q-list dense style="min-width: 200px">

                        <q-item clickable v-close-popup @click="changeProject">
                            <q-item-section>Select project</q-item-section>
                        </q-item>

                        <q-item clickable v-close-popup @click="getFresfolioLog">
                            <q-item-section>View log</q-item-section>
                        </q-item>

                        <q-item 
                            v-if="initChecks.extras_installed" 
                            clickable 
                            :disable="creatingRag"
                            @click="createProjectRag"
                        >
                            <q-item-section side v-if="creatingRag">
                                <q-spinner color="white" size="20px" />
                            </q-item-section>
                            <q-item-section>Create RAG</q-item-section>
                        </q-item>

                    </q-list>
                </q-menu>
            </q-btn>

        </q-toolbar>
    </q-header>

    <q-drawer 
        v-model="leftDrawerOpen" 
        side='left' 
        class="app-bg-color-1" 
        :width="leftDrawerWidth"
    >
        <div class="row full-height no-wrap">

            <!-- NOTEBOOKS DRAWER START -->
            <div class="col app-bg-color-2" v-show="notebooksDrawerOpen">
                <q-scroll-area class="fit">
                    <Transition name="fade">
                        <div v-if="!notebooksFetched" class="app-spinner-container q-mt-xl">
                            <q-spinner
                                color="white"
                                size="2em"
                            />
                            <p class="app-spinner-text text-white">Loading data, please wait...</p>
                        </div>

                        <q-list dense v-else>

                            <q-item-label header class="row text-white items-center justify-between">
                                <div class="row">
                                    <q-chip
                                        clickable
                                        @click="showCreateNotebookDialog=true"
                                        color="primary"
                                        text-color="white"
                                        icon="add"
                                    >
                                        <q-tooltip class="bg-primary" :offset="[10, 10]">
                                            Create new notebook.
                                        </q-tooltip>
                                        Notebooks
                                    </q-chip>
                                </div>
                            </q-item-label>

                            <div class="q-mt-xl" v-if="notebooks.length === 0">
                                <p class="row justify-center centers text-white">No available notebooks.</p>
                            </div>

                            <div v-else>
                                <q-item
                                    class="text-white"
                                    v-for="notebook in notebooks"
                                    :key="notebook.notebookID"
                                    clickable
                                    v-ripple
                                    :active="selectedNotebookID === notebook.notebookID"
                                    @click="selectNotebook(notebook.notebookID)"
                                    active-class="bg-info text-white"
                                >
                                    <q-item-section>
                                        <div class="ellipsis" style="max-width: 160px">
                                            <q-badge rounded color="primary">{{ notebook.chapters.length }}</q-badge>
                                            <span class="q-ml-sm">{{ notebook.notebookName }}</span>
                                        </div>

                                        <q-tooltip :delay="1000" :offset="[10, 10]">
                                            [{{ notebook.notebookID }}]  {{ notebook.notebookName }}
                                        </q-tooltip>
                                    </q-item-section>
                                </q-item>
                            </div>

                        </q-list>
                    </Transition>

                </q-scroll-area>
            </div>
            <!-- NOTEBOOKS DRAWER END -->

            <!-- CHAPTERS DRAWER START -->
            <div class="col app-bg-color-3">
                <q-scroll-area class="fit">
                    <q-list dense>

                        <q-item-label header class="row text-white items-center justify-between">
                            <div class="row">
                                <q-chip
                                    ref="chapterChip"
                                    v-show="selectedNotebookID != null"
                                    clickable
                                    @click="$event.currentTarget.blur(); showCreateChapterDialog = true"
                                    color="primary"
                                    text-color="white"
                                    icon="add"
                                >
                                    <q-tooltip class="bg-primary" :offset="[10, 10]">
                                        Add chapter.
                                    </q-tooltip>
                                    Chapters
                                </q-chip>
                            </div>

                            <div>
                                <q-btn 
                                    v-if="selectedNotebookID != null"
                                    color="primary" 
                                    size='sm' 
                                    @click="toggleNotebookDrawer()" 
                                    :icon="chaptersBTNCollapseIcon"
                                >
                                    <q-tooltip :delay="1000" :offset="[10, 10]">
                                        Toggle notebooks drawer.
                                    </q-tooltip>
                                </q-btn>
                            </div>
                        </q-item-label>


                        <div class="q-mt-xl" v-if="selectedNotebookChapters.length === 0">
                            <p v-if="selectedNotebookID != null" class="row justify-center centers text-white">
                                No available chapters.
                            </p>
                        </div>

                        <div v-else>
                            <q-item
                                class="text-white"
                                v-for="chapter in selectedNotebookChapters"
                                :key="chapter.chapterID"
                                clickable
                                v-ripple
                                :active="selectedChapterID === chapter.chapterID"
                                @click="selectChapter(chapter.chapterID)"
                                active-class="bg-info text-white"
                            >
                                <q-item-section>
                                    <div class="ellipsis" style="max-width: 160px">
                                        {{ chapter.chapterName }}
                                    </div>

                                    <q-tooltip :delay="1000" :offset="[10, 10]">
                                        [{{ chapter.chapterID }}] {{ chapter.chapterName }}
                                    </q-tooltip>
                                </q-item-section>
                            </q-item>
                        </div>

                    </q-list>
                </q-scroll-area>
            </div>
            <!-- CHAPTERS DRAWER END -->

        </div>

    </q-drawer>


    <!-- TODOS DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.todos" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('todos')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Todos</h3>
                </div>
            </div>

            <todos :projectid="selectedProjectID" :focus="drawers.todos" />
        </div>
    </q-drawer>
    <!-- TODOS DRAWER END -->

    <!-- PROCESSES DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.processes" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('processes')" 
                        icon="close"
                    />
                    <q-btn 
                        class='q-ml-sm'
                        round
                        color="primary" 
                        size='sm' 
                        @click="getProcesses()" 
                        icon="sync"
                    />
                    <h3 class="q-ml-md q-ma-none">Processes running</h3>
                </div>
            </div>

            <div v-if="processesList.length !== 0" class="bg-transparent">
                <q-list v-for="(item, itemIDX) in processesList" :key="itemIDX">
                        <q-item-section>
                            <q-item-label class='text-white'>
                                {{item}}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </div>
            <div v-else>
                No process is currently running
            </div>

        </div>
    </q-drawer>
    <!-- PROCESSES DRAWER END -->

    <!-- SEARCH DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.search" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('search')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Search results</h3>
                </div>
                <div>
                    <q-btn 
                        color="primary" 
                        class="q-mr-md"
                        size='sm' 
                        @click="getSearchSectionsOrder()" 
                        label="Sections"
                    />
                    <q-btn 
                        color="primary" 
                        size='sm' 
                        @click="clearSearchSections()" 
                        label="Clear"
                    />
                </div>
            </div>

            <template v-if="searchSections.length" class="q-px-md">
                <section-card 
                    v-for="(sectionJSON, index) in searchSections" :key="index" 
                    :section-data="searchSections[index]" 
                    :expand-section="expandAll"
                    @delete-section="deleteRenderedSection"
                    @pin-section="pinSection"
                    @get-view="getView"
                    @open-with-ace-editor="openWithAceEditor"
                    @start-process="startProcess"
                />
            </template>

        </div>
    </q-drawer>
    <!-- SEARCH DRAWER END -->


    <!-- VIEW DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.view" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('view')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Sections view</h3>
                </div>
                <q-btn 
                    color="primary" 
                    size='sm' 
                    @click="clearViewSections()" 
                    label="Clear"
                />
            </div>

            <template v-if="viewSections.length" class="q-px-md">
                <section-card 
                    v-for="(sectionJSON, index) in viewSections" :key="index" 
                    :section-data="viewSections[index]" 
                    :expand-section="expandAll"
                    @delete-section="deleteRenderedSection"
                    @pin-section="pinSection"
                    @get-view="getView"
                    @open-with-ace-editor="openWithAceEditor"
                    @start-process="startProcess"
                />
            </template>

        </div>
    </q-drawer>
    <!-- VIEW DRAWER END -->


    <!-- PINNED DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.pinned" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('pinned')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Pinned sections</h3>
                </div>
                <q-btn 
                    color="primary" 
                    size='sm' 
                    @click="clearPinnedSections()" 
                    label="Clear"
                />
            </div>

            <template v-if="pinnedSections.length" class="q-px-md">
                <section-card 
                    v-for="(sectionJSON, index) in pinnedSections" :key="index" 
                    :section-data="pinnedSections[index]" 
                    :expand-section="expandAll"
                    @delete-section="deleteRenderedSection"
                    @pin-section="pinSection"
                    @get-view="getView"
                    @open-with-ace-editor="openWithAceEditor"
                    @start-process="startProcess"
                />
            </template>

        </div>
    </q-drawer>
    <!-- PINNED DRAWER END -->

    <!-- CHAT DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.chat" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">

            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('chat')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">AI chat</h3>
                </div>

                <div class="row">
                    <q-btn
                        round
                        class="q-mr-md"
                        icon="refresh"
                        color="primary"
                        @click="refreshChatSections"
                    >
                        
                        <q-tooltip class="bg-primary" :offset="[10, 10]">
                            Refresh chat
                        </q-tooltip>
                    </q-btn>
                    <q-select
                        v-model="selectedModel"
                        :options="ai_models"
                        label="Select model"
                        dense
                        outlined
                        style="min-width: 200px"
                    />
                </div>
            </div>

            <div class="prompt-box q-pa-sm q-mb-md">
                <q-input
                    v-model="chatPrompt"
                    type="textarea"
                    autogrow
                    dense
                    dark
                    borderless
                    placeholder="User prompt..."
                    class="prompt-input"
                    :input-style="{ maxHeight: '200px', overflowY: 'auto' }"
                    :disable="isSubmittingPrompt"
                    @keydown="handleChatKeydown"
                >
                    <template v-slot:after>
                        <q-btn
                            round
                            dense
                            flat
                            :disable="!chatPrompt.trim() || isSubmittingPrompt"
                            :loading="isSubmittingPrompt"
                            :color="chatPrompt.trim() ? 'primary' : 'grey-5'"
                            icon="send"
                            @click="submitChatPrompt"
                        >
                            <template v-slot:loading>
                                <q-spinner-dots color="primary" />
                            </template>
                        </q-btn>
                    </template>
                </q-input>
            </div>

            <Transition name="fade">
                <div v-if="fetchingChatSectionsToRender" key="loading" class="app-spinner-container q-mt-xl">
                    <q-spinner
                        color="primary"
                        size="2em"
                    />
                    <p class="app-main-text-color">Loading chat, please wait...</p>
                </div>

                <div v-else key="content">
                    <template v-if="chatSections.length">
                        <section-card 
                            v-for="(sectionJSON, index) in chatSections" :key="index" 
                            :section-data="chatSections[index]" 
                            :expand-section="expandAll"
                            @delete-section="deleteRenderedSection"
                            @pin-section="pinSection"
                            @get-view="getView"
                            @open-with-ace-editor="openWithAceEditor"
                            @start-process="startProcess"
                        />
                    </template>
                    <div v-else>
                        <p class="app-main-text-color">Chat is empty</p>
                    </div>
                </div>
            </Transition>

        </div>
    </q-drawer>
    <!-- CHAT DRAWER END -->


    <!-- PLOT DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.plot" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">
            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('plot')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Plot viewer</h3>
                </div>
            </div>
                <plot-renderer :projectid="selectedProjectID" />
            </div>
        </div>
    </q-drawer>
    <!-- PLOT DRAWER END -->

    <!-- OMIRENDERER DRAWER START -->
    <q-drawer 
        overlay
        v-model="drawers.omilayers" 
        side='right' 
        class="app-page-container-color" 
        :width="searchDrawerWidth()"
    >
        <div class="col q-px-xl">
            <div class="q-mt-md q-mb-md row items-center justify-between">
                <div class="row items-center">
                    <q-btn 
                        round
                        color="primary" 
                        size='sm' 
                        @click="toggleDrawer('omilayers')" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Omilayers viewer</h3>
                </div>
            </div>
                <omilayers-renderer :projectid="selectedProjectID" />
            </div>
        </div>
    </q-drawer>
    <!-- OMIRENDERER DRAWER END -->


    <q-page-container class="app-page-container-color">
        <q-page class="q-px-xl">

                <q-list v-if="renderedChapterIDX !== ''" dense separator>
                    <q-item>
                        <q-item-section class="app-main-text-color text-h6">

                            <!-- CHAPTER AND NOTEBOOK MENU START -->
                            <div class="row items-center justify-between full-width">
                                <div class="cursor-pointer">
                                    {{getNotebookAttribute(renderedNotebookIDX, 'notebookName')}}
                                    <q-item-label caption class="text-subtitle1">
                                        {{getNotebookAttribute(renderedNotebookIDX, 'notebookDate')}}
                                    </q-item-label>
                                </div>
                                <q-btn-dropdown 
                                    rounded 
                                    size="sm"
                                    color="primary" 
                                    text-color="white"
                                    icon="settings"
                                    :menu-offset="[0,10]"
                                >
                                    <q-list separator style="background-color: var(--q-primary); color: white;">
                                        <q-item clickable v-close-popup @click="rearrangeChapterSections">
                                            <q-item-section>
                                                <q-item-label>Rearrange sections</q-item-label>
                                            </q-item-section>
                                        </q-item>

                                        <q-item clickable @click="sectionsToPDF(1)">
                                            <q-item-section>
                                                <q-item-label>Export chapter to PDF</q-item-label>
                                            </q-item-section>
                                        </q-item>

                                        <q-item clickable @click="sectionsToPDF(0)">
                                            <q-item-section>
                                                <q-item-label>Export chapter to .typ</q-item-label>
                                            </q-item-section>
                                        </q-item>

                                        <q-item clickable v-close-popup @click="deleteChapter">
                                            <q-item-section>
                                                <q-item-label>Delete chapter</q-item-label>
                                            </q-item-section>
                                        </q-item>

                                        <q-item clickable v-close-popup @click="deleteNotebook">
                                            <q-item-section>
                                                <q-item-label>Delete notebook</q-item-label>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-btn-dropdown>
                            </div>
                            <!-- CHAPTER AND NOTEBOOK MENU END -->


                            <!-- RENAME NOTEBOOK POPUP EDIT -->
                            <q-popup-edit v-model="renderedNotebookName" :validate="val => val.length > 1" v-slot="scope">
                                <q-input
                                    autofocus
                                    dense
                                    v-model="scope.value"
                                    :model-value="scope.value"
                                    hint="Change notebook name"
                                    :rules="[val => scope.validate(val) || 'More than 1 chars required']"
                                >
                                    <template v-slot:after>
                                        <q-btn
                                            flat dense color="negative" icon="cancel"
                                            @click.stop.prevent="scope.cancel"
                                        />

                                        <q-btn
                                            flat dense color="positive" icon="check_circle"
                                            @click.stop.prevent="setNotebookName(scope)"
                                            :disable="scope.validate(scope.value) === false || scope.initialValue === scope.value || isSaving"
                                        >
                                            <q-spinner v-if="isSaving" size="20px" color="grey" />
                                        </q-btn>
                                    </template>
                                </q-input>
                            </q-popup-edit>

                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section class="app-main-text-color text-h6">
                            <div class="row full-width">
                                <div class="cursor-pointer">
                                    {{renderedChapterName}}
                                    <q-item-label caption class="text-subtitle1">
                                        {{getChapterAttribute(renderedNotebookIDX, renderedChapterIDX, 'chapterDate')}}
                                    </q-item-label>
                                </div>

                                <!-- RENAME CHAPTER POPUP EDIT -->
                                <q-popup-edit v-model="renderedChapterName" :validate="val => val.length > 1" v-slot="scope">
                                    <q-input
                                        autofocus
                                        dense
                                        v-model="scope.value"
                                        :model-value="scope.value"
                                        hint="Change chapter name"
                                        :rules="[val => scope.validate(val) || 'More than 1 chars required']"
                                    >
                                        <template v-slot:after>
                                            <q-btn
                                                flat dense icon="cancel"
                                                @click.stop.prevent="scope.cancel"
                                            />

                                            <q-btn
                                                flat dense icon="check_circle"
                                                @click.stop.prevent="setChapterName(scope)"
                                                :disable="scope.validate(scope.value) === false || scope.initialValue === scope.value || isSaving"
                                            >
                                                <q-spinner v-if="isSaving" size="20px" color="grey" />
                                            </q-btn>
                                        </template>
                                    </q-input>
                                </q-popup-edit>
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>

                <Transition name="fade">

                    <div v-if="!fetchedSectionsToRender" class="app-spinner-container q-mt-xl">
                        <q-spinner
                            color="primary"
                            size="2em"
                        />
                        <p class="app-main-text-color">Loading data, please wait...</p>
                    </div>

                    <div v-else class="q-ml-md">
                        <div class="q-mt-xl app-main-text-color" v-if="renderedSections.length === 0">
                            <p class="row justify-center centers">
                                No available sections.
                            </p>
                        </div>

                        <!-- SECTIONS AREA -->
                        <div v-else class="q-mt-md">
                            <section-card 
                                v-for="(sectionJSON, index) in renderedSections" :key="index" 
                                :section-data="renderedSections[index]" 
                                :expand-section="expandAll"
                                @delete-section="deleteRenderedSection"
                                @pin-section="pinSection"
                                @get-view="getView"
                                @open-with-ace-editor="openWithAceEditor"
                                @start-process="startProcess"
                            >
                        </div>
                    </div>

                </Transition>


            <!--CREATE NOTEBOOK DIALOG START-->
            <q-dialog v-model="showCreateNotebookDialog" persistent :no-refocus="true">
                <q-card class="app-bg-color-5" style="width: 700px; max-width: 80vw;">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Create new notebook
                            </div>
                            <div class="col-1 q-mb-lg">
                                <q-btn round icon="close" @click="showCreateNotebookDialog=false" color="grey-5"/>
                            </div>
                        </div>
                        <q-form @submit.prevent="createNotebook">
                            <q-input
                                v-model="newNotebookName"
                                autofocus
                                label="Notebook name"
                                dense
                                no-error-icon="true"
                                :rules="[val => !!val || 'Notebook name is required']"
                                lazy-rules
                            />

                            <q-btn
                                label="Create"
                                color="primary"
                                type="submit"
                                class="full-width q-mt-md"
                            />
                        </q-form>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!--CREATE NOTEBOOK DIALOG END-->


            <!--CREATE CHAPTER DIALOG START-->
            <q-dialog v-model="showCreateChapterDialog" persistent>
                <q-card class="app-bg-color-5" style="width: 700px; max-width: 80vw;">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Create new chapter for notebook
                                 <q-item-label caption class="text-subtitle1" lines="2">{{getNotebookAttribute(selectedNotebookIDX, 'notebookName')}}</q-item-label>
                            </div>
                            <div class="col-1 q-mb-lg">
                                <q-btn round icon="close" @click="showCreateChapterDialog=false" color="grey-5"/>
                            </div>
                        </div>
                        <q-form @submit.prevent="createChapter">
                            <q-input
                                v-model="newChapterName"
                                autofocus
                                label="Chapter name"
                                dense
                                no-error-icon="true"
                                :rules="[val => !!val || 'Chapter name is required']"
                                lazy-rules
                            />

                            <q-btn
                                label="Create"
                                color="primary"
                                type="submit"
                                class="full-width q-mt-md"
                            />
                        </q-form>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!--CREATE CHAPTER DIALOG END-->


            <!--REARRANGE CHAPTER SECTIONS DIALOG START-->
            <q-dialog v-model="showRearrangeChapterSectionsDialog" persistent>
                <q-card class="app-bg-color-5" style="min-width: 700px; max-width: 90vw;">
                    <q-card-section>
                        <div class="text-h6">Edit Chapter Sections</div>
                    </q-card-section>

                    <q-card-section>
                        <q-input
                            v-model="renderedChapterSectionsOrder"
                            type="textarea"
                            autogrow
                            outlined
                        />
                    </q-card-section>

                    <q-card-actions align="right">
                        <q-btn flat color="secondary" label="Cancel" v-close-popup />
                        <q-btn flat color="secondary" label="Save" @click="setChapterSectionsOrder" />
                    </q-card-actions>
                </q-card>
            </q-dialog>
            <!--REARRANGE CHAPTER SECTIONS DIALOG END-->

            <!--VIEW SEARCH SECTIONS DIALOG START-->
            <q-dialog v-model="showSearchSectionsDialog">
                <q-card class="app-bg-color-5" style="min-width: 700px; max-width: 90vw;">
                    <q-card-section>
                        <div class="text-h6">Search sections</div>
                    </q-card-section>

                    <q-card-section>
                        <q-input
                            v-model="searchSectionsOrder"
                            type="textarea"
                            autogrow
                            outlined
                        />
                    </q-card-section>

                    <q-card-actions align="right">
                        <q-btn flat color="secondary" label="Cancel" v-close-popup />
                    </q-card-actions>
                </q-card>
            </q-dialog>
            <!--VIEW SEARCH SECTIONS DIALOG END-->


            <!--UPLOAD FILES DIALOG START-->
            <q-dialog v-model="showFileUploaderDialog" persistent>
                <q-card class="app-bg-color-5" style="width: 700px; max-width: 80vw;">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Upload files to section {{sectionIDToUploadFiles}}
                            </div>
                            <div class="col-1">
                                <q-btn round icon="close" @click="showFileUploaderDialog=false" color="secondary"/>
                            </div>
                        </div>
                    </q-card-section>

                    <q-card-section class="row justify-center">
                        <q-uploader
                          label="Upload File"
                          :url="uploadToSectionRoute"
                          method="POST"
                          :form-fields="uploadToSectionFields"
                          color="teal"
                          flat
                          bordered
                          multiple
                          batch
                          style="max-width: 600px; width: 600px;"
                          @uploaded="onFilesUploadedToSection"
                          @failed="onFilesFailedToUploadToSection"
                        >
                            <template v-slot:header="scope">
                                <div class="row no-wrap items-center q-pa-sm q-gutter-xs">
                                    <q-btn v-if="scope.queuedFiles.length > 0" icon="clear_all" @click="scope.removeQueuedFiles" round dense flat />
                                    <q-btn v-if="scope.uploadedFiles.length > 0" icon="done_all" @click="scope.removeUploadedFiles" round dense flat />
                                    <q-spinner v-if="scope.isUploading" class="q-uploader__spinner" />
                                    <div class="col">
                                        <div class="q-uploader__title">Upload your files</div>
                                        <div class="q-uploader__subtitle">{{ scope.uploadSizeLabel }} / {{ scope.uploadProgressLabel }}</div>
                                    </div>
                                    <q-btn v-if="scope.canAddFiles" type="a" icon="add_box" @click="scope.pickFiles" round dense flat>
                                        <q-uploader-add-trigger />
                                    </q-btn>
                                    <q-btn v-if="scope.canUpload" icon="cloud_upload" @click="scope.upload" round dense flat />
                                    <q-btn v-if="scope.isUploading" icon="clear" @click="scope.abort" round dense flat />
                                </div>
                            </template>
                        </q-uploader>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!--UPLOAD FILES DIALOG END-->

            <!-- ACE EDITOR  DIALOG START -->
            <Teleport to="body">
                <Transition name="panel-slide">
                    <div
                        v-if="showAceEditor"
                        class="bottom-panel app-bg-color-5"
                        :class="{ minimized: isMinimized }"
                        :style="{ height: isMinimized ? 'auto' : isExpanded ? '90vh' : '400px' }"
                    >
                        <!-- Header / Toolbar -->
                        <div class="bottom-panel__header" @dblclick="toggleMinimize">
                            <span class="bottom-panel__title">Editor: {{aceEditorFileTitle}}</span>
                            <div class="bottom-panel__actions">
                                <!-- Expand/Collapse height button -->
                                <q-btn
                                    flat dense round
                                    :icon="isExpanded ? 'fullscreen_exit' : 'fullscreen'"
                                    @click="toggleExpand"
                                    size="sm"
                                />
                                <q-btn
                                    flat dense round
                                    :icon="isMinimized ? 'expand_less' : 'expand_more'"
                                    @click="toggleMinimize"
                                    size="sm"
                                />
                                <q-btn
                                    flat dense round
                                    icon="close"
                                    @click="closePanel"
                                    size="sm"
                                />
                            </div>
                        </div>
                        <!-- Collapsible body -->

                        <Transition name="panel-body">
                            <div 
                                v-show="!isMinimized" 
                                class="bottom-panel__body"
                                :style="{ height: isExpanded ? 'calc(90vh - 40px)' : 'calc(400px - 40px)' }"
                                style="display: flex; flex-direction: column;"
                            >
                                <div ref="aceEditor" style="flex: 1; width: 100%;"></div>
                                <div class="bottom-panel__footer">
                                    <q-btn color="primary" label="Save" @click="saveAceEditorContent" />
                                </div>
                            </div>
                        </Transition>
                    </div>
                </Transition>
            </Teleport>
            <!-- ACE EDITOR  DIALOG END -->

            <!-- FRESFOLIO LOG VIEWER DIALOG START -->
            <q-dialog v-model="showLogViewer">
                <q-card style="width: 1200px; max-width: 80vw; max-height: 80vh;">
                    <q-card-section class="row items-center q-pb-none">
                        <div class="text-h6">Fresfolio log viewer</div>
                            <q-space />
                            <q-btn 
                                class="q-mr-md"
                                round 
                                size="sm"
                                icon="delete" 
                                color="primary"
                                @click="clearFresfolioLog"
                            />
                            <q-btn icon="close" flat round dense v-close-popup />
                            </q-card-section>

                            <q-card-section>
                            <div class="app-logviewer-container" style="overflow: auto; max-height: 60vh;">
                                <pre><code>{{ logViewerContent }}</code></pre>
                            </div>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!-- FRESFOLIO LOG VIEWER DIALOG END -->


            <!-- PAGE FLOATING BUTTONS -->
            <div v-if="renderedNotebookIDX !== '' && renderedChapterIDX !== ''">
                <q-page-sticky position="bottom-right" :offset="[10, 10]">
                    <q-btn round class="frn-button-hover" icon="add" color="primary" @click="createSection()">
                        <q-tooltip :offset="[10, 10]">
                            Add new section
                        </q-tooltip>
                    </q-btn>
                </q-page-sticky>
            </div>

        </q-page>
    </q-page-container>

</q-layout>
  `
});

export default ProjectLayout;
