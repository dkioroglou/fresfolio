const ProjectLayout = defineComponent({
    components: {
        SectionCard
    },
    props:['selectedProjectID', 'selectedProjectName'],
    data () {
        return {
            leftDrawerOpen: true,
            leftDrawerWidth: 400,
            searchDrawerOpen: false,
            viewDrawerOpen: false,
            pinnedDrawerOpen: false,
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
            showFileUploaderDialog: false,
            fetchedSectionsToRender: true,
            renderedSections: [],
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
            sectionIDToUploadFiles: null,
            uploadToSectionRoute: "/api/upload-files-to-section",
            uploadToSectionFields: [],
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
        toggleSearchDrawer() {
            this.viewDrawerOpen = false;
            this.pinnedDrawerOpen = false;
            if (this.searchDrawerOpen) {
                this.searchDrawerOpen = false;
            } else {
                this.searchDrawerOpen = true;
            }
        },
        toggleViewDrawer() {
            this.searchDrawerOpen = false;
            this.pinnedDrawerOpen = false;
            if (this.viewDrawerOpen) {
                this.viewDrawerOpen = false;
            } else {
                this.viewDrawerOpen = true;
            }
        },
        togglePinnedDrawer() {
            this.searchDrawerOpen = false;
            this.viewDrawerOpen = false;
            if (this.pinnedDrawerOpen) {
                this.pinnedDrawerOpen = false;
            } else {
                this.pinnedDrawerOpen = true;
            }
        },
        clearSearchSections() {
            this.searchDrawerOpen = false;
            this.searchSections = [];
        },
        clearViewSections() {
            this.viewDrawerOpen = false;
            this.viewSections = [];
        },
        clearPinnedSections() {
            this.pinnedDrawerOpen = false;
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
            try {
                const response = await fetch("/api/get-sections-for-search", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedProjectID,
                        "query": this.searchText
                    }),
                });
                if (response.ok) {
                    this.searchSections = await response.json();
                    this.searchText = '';
                    if (this.searchSections.length !== 0){
                        this.viewDrawerOpen = false;
                        this.pinnedDrawerOpen = false;
                        this.searchDrawerOpen = true;
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
        },
        pinSection(projectID, sectionID) {
            const sectionPinned = this.pinnedSections.find(section => section.ID === sectionID && section.projectID === projectID);
            if (sectionPinned) {
                this.pinnedSections = this.pinnedSections.filter(section => !(section.ID === sectionID && section.projectID === projectID));
            } else {
                sectionInRenderedSections = this.renderedSections.find(section => section.ID === sectionID && section.projectID === projectID);
                sectionInSearchSections = this.searchSections.find(section => section.ID === sectionID && section.projectID === projectID);
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
                        this.searchDrawerOpen = false;
                        this.pinnedDrawerOpen = false;
                        this.viewDrawerOpen = true;
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
    },
    async mounted () {
        this.get_notebooks();
    },
    template: `
<q-layout view="hHh LpR fFf">
    <q-header elevated class="app-header-color">
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
                color="teal"
                size="md"
                v-if="viewSections.length"
                icon="visibility"
                @click="toggleViewDrawer()"
            />

            <q-btn
                round
                class="q-mr-md"
                color="teal"
                size="md"
                v-if="pinnedSections.length"
                icon="push_pin"
                @click="togglePinnedDrawer()"
            />

            <q-btn
                round
                class="q-mr-md"
                color="teal"
                size="md"
                v-if="searchSections.length"
                icon="search"
                @click="toggleSearchDrawer()"
            />

            <!-- SEARCH BAR START -->
            <q-input 
                filled
                dense
                v-model="searchText" 
                standout="bg-teal text-white"
                input-style="color: white"
                label-color="white"
                class="col-4 q-mr-lg text-h6" 
                placeholder="Search" 
                @keydown.enter.prevent="searchText && search()"
                :dense="dense">
                    <template v-slot:append>
                        <q-icon id="search-bar-icon" name="close" @click="searchText = ''" class="cursor-pointer" />
                    </template>
            </q-input>
            <!-- SEARCH BAR END -->

            <q-btn color="secondary" label="Menu">
                <q-menu
                    :offset="[0, 10]"
                    transition-show="jump-down"
                    transition-hide="jump-up"
                    :style="{ backgroundColor: 'var(--q-secondary)', color: 'white'}"
                >
                    <q-list dense style="min-width: 100px">

                        <q-item clickable v-close-popup @click="changeProject">
                            <q-item-section>Select project</q-item-section>
                        </q-item>

                    </q-list>
                </q-menu>
            </q-btn>

        </q-toolbar>
    </q-header>

    <q-drawer 
        v-model="leftDrawerOpen" 
        side='left' 
        class="app-bg-dark" 
        :width="leftDrawerWidth"
    >
        <div class="row full-height no-wrap">

            <!-- NOTEBOOKS DRAWER START -->
            <div class="col bg-primary" v-show="notebooksDrawerOpen">
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
                                <div style="margin-top: 4px;">
                                    Notebooks
                                </div>
                            </q-item-label>

                            <div class="q-mt-xl" v-if="notebooks.length === 0">
                                <p class="row justify-center centers text-white">No available notebooks.</p>
                            </div>

                            <div v-else style="margin-top: 5px;">
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
                                            {{ notebook.notebookName }}
                                        </div>

                                        <q-tooltip :delay="1000" :offset="[10, 10]">
                                            {{ notebook.notebookName }}
                                        </q-tooltip>
                                    </q-item-section>
                                </q-item>
                            </div>

                        </q-list>
                    </Transition>

                    <q-btn-group rounded class="absolute-bottom-right q-mb-md q-mr-md">
                        <q-btn color="secondary" icon="add" @click="showCreateNotebookDialog=true">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Create new notebook.
                            </q-tooltip>
                        </q-btn>
                        <q-btn color="secondary" icon="update" @click="refreshNotebooks">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Refresh notebooks
                            </q-tooltip>
                        </q-btn>
                    </q-btn-group>
                </q-scroll-area>
            </div>
            <!-- NOTEBOOKS DRAWER END -->

            <!-- CHAPTERS DRAWER START -->
            <div class="col bg-secondary">
                <q-scroll-area class="fit">
                    <q-list dense>

                        <q-item-label header class="row text-white items-center justify-between">
                            <div>
                                Chapters
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
                                        {{ chapter.chapterName }}
                                    </q-tooltip>
                                </q-item-section>
                            </q-item>
                        </div>

                    </q-list>
                    <q-btn 
                        v-if="selectedNotebookID != null"
                        round 
                        color="primary" 
                        icon="add" 
                        @click="showCreateChapterDialog=true" 
                        this.selectedChapterID
                        class="absolute-bottom-right q-mb-md q-mr-md"
                    >
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Add chapter.
                            </q-tooltip>
                    </q-btn>
                </q-scroll-area>
            </div>
            <!-- CHAPTERS DRAWER END -->

        </div>

    </q-drawer>


    <!-- SEARCH DRAWER START -->
    <q-drawer 
        overlay
        v-model="searchDrawerOpen" 
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
                        @click="toggleSearchDrawer()" 
                        icon="close"
                    />
                    <h3 class="q-ml-md q-ma-none">Search results</h3>
                </div>
                <q-btn 
                    color="primary" 
                    size='sm' 
                    @click="clearSearchSections()" 
                    label="Clear"
                />
            </div>

            <template v-if="searchSections.length" class="q-px-md">
                <section-card 
                    v-for="(sectionJSON, index) in searchSections" :key="index" 
                    :section-data="searchSections[index]" 
                    :expand-section="expandAll"
                    @delete-section="deleteRenderedSection"
                    @pin-section="pinSection"
                    @get-view="getView"
                >
            </template>

        </div>
    </q-drawer>
    <!-- SEARCH DRAWER END -->


    <!-- VIEW DRAWER START -->
    <q-drawer 
        overlay
        v-model="viewDrawerOpen" 
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
                        @click="toggleViewDrawer()" 
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
                >
            </template>

        </div>
    </q-drawer>
    <!-- VIEW DRAWER END -->


    <!-- PINNED DRAWER START -->
    <q-drawer 
        overlay
        v-model="pinnedDrawerOpen" 
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
                        @click="togglePinnedDrawer()" 
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
                >
            </template>

        </div>
    </q-drawer>
    <!-- PINNED DRAWER END -->



    <q-page-container class="app-page-container-color">
        <q-page class="q-px-xl">

                <q-list v-if="renderedChapterIDX !== ''" dense separator>
                    <q-item>
                        <q-item-section class="app-text-color-primary text-h6">

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
                                    color="secondary" 
                                    text-color="white"
                                    icon="settings"
                                    :menu-offset="[0,10]"
                                >
                                    <q-list separator style="background-color: var(--q-secondary); color: white;">
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
                        <q-item-section class="app-text-color-primary text-h6">
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
                        <p class="app-spinner-text">Loading data, please wait...</p>
                    </div>

                    <div v-else class="q-ml-md">
                        <div class="q-mt-xl app-text-color-primary" v-if="renderedSections.length === 0">
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
                            >
                        </div>
                    </div>

                </Transition>


            <!--CREATE NOTEBOOK DIALOG START-->
            <q-dialog v-model="showCreateNotebookDialog" persistent>
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
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
                                filled
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
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
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
                                filled
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
                <q-card style="min-width: 500px; max-width: 90vw;">
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


            <!--UPLOAD FILES DIALOG START-->
            <q-dialog v-model="showFileUploaderDialog" persistent>
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
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


            <!-- PAGE FLOATING BUTTONS -->
            <div v-if="renderedNotebookIDX !== '' && renderedChapterIDX !== ''">
                <q-page-sticky position="bottom-right" :offset="[10, 10]">
                    <q-btn round class="frn-button-hover" icon="add" color="secondary" @click="createSection()">
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


