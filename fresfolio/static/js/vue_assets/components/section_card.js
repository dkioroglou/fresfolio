const SectionCard = defineComponent({
    components: {
        SectionContent
    },
    props: ['sectionData', 'expandSection'],
    data() {
        return {
            isExpanded: true,
            showChangeSectionTitle: false,
            newSectionTitle: "",
            showEditor: false,
            sectionContentFetched: true,
            qEditorContent: "",
            selectedSectionDirectoryTreeData: [],
            showSectionDirectoryTreeDialog: false,
            showFileUploaderDialog: false,
            uploadToSectionRoute: "/api/upload-files-to-section",
            uploadToSectionFields: [],
        };
    },
    setup () {
        const sectionEditorRef = ref(null)

        return {
            sectionEditorRef,
            onPaste (evt) {
                // QUASAR's solution for pasting plain text
                if (evt.target.nodeName === 'INPUT') return
                let text, onPasteStripFormattingIEPaste
                evt.preventDefault()
                evt.stopPropagation()
                if (evt.originalEvent && evt.originalEvent.clipboardData.getData) {
                    text = evt.originalEvent.clipboardData.getData('text/plain')
                    sectionEditorRef.value.runCmd('insertText', text)
                }
                else if (evt.clipboardData && evt.clipboardData.getData) {
                    text = evt.clipboardData.getData('text/plain')
                    sectionEditorRef.value.runCmd('insertText', text)
                }
                else if (window.clipboardData && window.clipboardData.getData) {
                    if (!onPasteStripFormattingIEPaste) {
                        onPasteStripFormattingIEPaste = true
                        sectionEditorRef.value.runCmd('ms-pasteTextOnly', text)
                    }
                    onPasteStripFormattingIEPaste = false
                }
            }
        }
    },
    methods: {
        handleExpansion() {
            let sectionIsExpanded = localStorage.getItem(this.sectionData['ID'])
            if (sectionIsExpanded == 'true') {
                localStorage.setItem(this.sectionData['ID'], 'false')
            } else {
                localStorage.setItem(this.sectionData['ID'], 'true')
            }
        },
        stageSetSectionTitle() {
            this.newSectionTitle = this.sectionData['title'];
            this.showChangeSectionTitle = true;
        },
        async getSectionRawContent() {
            this.sectionContentFetched = false;
            try {
                const response = await fetch("/api/get-section-raw-content", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID']
                        }
                    )
                });

                if (response.ok) {
                    const data = await response.json();
                    this.qEditorContent = data['sectionRawContent']
                    this.sectionContentFetched = true;
                    this.showEditor = true;
                } else {
                    const responseText = await response.text();
                    this.sectionContentFetched = true;
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
        cancelSetSectionContent() {
            this.showEditor = false;
            this.qEditorContent = "";
        },
        async setSectionContent() {
            try {
                const response = await fetch("/api/set-section-content", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID'],
                            "newSectionContent": this.$refs.sectionEditorRef.getContentEl().innerText
                        }
                    )
                });

                if (response.ok) {
                    const data = await response.json();
                    this.sectionData['content'] = data['sectionData']['content']
                    this.showEditor = false;
                } else {
                    const responseText = await response.text();
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
        async setSectionTitle() {
            if (!this.newSectionTitle.trim()) {
                    this.$q.notify({
                        message: "Section title cannot be emtpy",
                        color: 'negative',
                        position: "top-right"
                    })
                return
              }

            try {
                const response = await fetch("/api/set-section-title", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID'],
                            "newSectionTitle": this.newSectionTitle
                        }
                    )
                });

                if (response.ok) {
                    this.showChangeSectionTitle = false;
                    this.sectionData['title'] = this.newSectionTitle;
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
        async createSectionDirectory() {
            try {
                const response = await fetch("/api/create-section-directory", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID']
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Section directory created",
                        color: 'green',
                        position: "top-right"
                    })
                    this.sectionData['section_dir_exists'] = 1;
                } else {
                    const responseText = await response.text();
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
        async deleteSectionCallback() {
            try {
                const response = await fetch("/api/delete-section", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID']
                        }
                    )
                });

                if (response.ok) {
                    this.$emit('delete-section', this.sectionData['ID'])
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
        uploadFilesToSection() {
            this.uploadToSectionFields = [
                                            {"name":"projectID", "value":this.sectionData['projectID']},
                                            {"name":"sectionID", "value":this.sectionData['ID']}
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
        deleteSection() {
            this.$q.dialog({
                title: 'Delete Section?',
                message: 'Are you sure you want to delete this section? This action cannot be undone.',
                cancel: true,
            }).onOk(() => {
                this.deleteSectionCallback();
            })
        },
        async setSectionTags(scope) {
            try {
                const response = await fetch("/api/set-sections-tags", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID'],
                            "sectionTags": scope.value 
                                           .split(',')
                                           .map(item => item.trim())
                                           .filter(item => item.length > 0)
                        }
                    )
                });

                if (response.ok) {
                    // const newSectionTags = scope.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                    // this.sectionData['tags'] = newSectionTags;
                    scope.set(scope.value);
                    this.$refs.tagsPopup.hide();
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.$refs.tagsPopup.hide();
                }
            } catch (error) {
                console.log(error)
                this.$refs.tagsPopup.hide();
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
            }
        },
        async getSectionDirectoryTree() {
            try {
                const response = await fetch("/api/get-section-directory-tree", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.sectionData['projectID'], 
                            "sectionID": this.sectionData['ID']
                        }
                    )
                });

                if (response.ok) {
                    this.selectedSectionDirectoryTreeData = await response.json();
                    this.showSectionDirectoryTreeDialog = true;
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }

        },
        insertLinkTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '[]()'
            )
            edit.focus()
        },
        insertFilesTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{files}<br>file:<br>caption:<br>\\end{files}'
            )
            edit.focus()
        },
        insertFiguresTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{figures}<br>figure:<br>caption:<br>\\end{figures}'
            )
            edit.focus()
        },
        insertTableTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{table}<br><br>\\end{table}'
            )
            edit.focus()
        },
        insertNoteBlueTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{note}[blue]<br><br>\\end{note}'
            )
            edit.focus()
        },
        insertNoteRedTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{note}[red]<br><br>\\end{note}'
            )
            edit.focus()
        },
        insertNoteGreenTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{note}[green]<br><br>\\end{note}'
            )
            edit.focus()
        },
        insertFoldTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{fold}[Fold name]<br><br>\\end{fold}'
            )
            edit.focus()
        },
        insertCodeTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '```<br><br>```'
            )
            edit.focus()
        },
        insertMathTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '$$<br><br>$$'
            )
            edit.focus()
        },
        insertOmilayersTableTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{omitable}<br>file:<br>layer:<br>nrows: 5<br>\\end{omitable}'
            )
            edit.focus()
        },
        insertOmilayersPlotTagToSectionEditor() {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd(
            'insertHTML',
                '\\begin{omiplot}<br>file:<br>layer:<br>name:<br>save-dir:<br>\\end{omiplot}'
            )
            edit.focus()
        },
        insertArrowToSectionEditor(arrow) {
            const edit = this.$refs.sectionEditorRef
            edit.caret.restore()
            edit.runCmd('insertText', arrow)
            edit.focus()
        },
        getView(parsedArgs) {
            this.$emit('get-view', parsedArgs)
        },
        pinSection(projectID, sectionID) {
            this.$emit('pin-section', projectID, sectionID)
        },
        async sectionToPdf(projectID, sectionID, renderPDFFlag) {
            try {
                const response = await fetch("/api/sections-to-pdf", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": projectID, 
                            "sectionsIDs": [sectionID],
                            "notebookName": "NA",
                            "chapterName": "NA",
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
    watch: {
        expandSection(newVal) {
            this.isExpanded = newVal; // Update isExpanded based on expandSection
        }
    },
    computed: {
        sectionTagsToString: {
            get() {
                return this.sectionData['tags'].join(', ')
            },
            set(newValue) {
                this.sectionData['tags'] = newValue
                                          .split(',')
                                          .map(item => item.trim())
                                          .filter(item => item.length > 0)
            }
        }
    },
    created() {
        // Initialize isExpanded based on the initial expandSection prop value
        // this.isExpanded = this.expandSection;
        let sectionIsExpanded = localStorage.getItem(this.sectionData['ID'])
        if (sectionIsExpanded == null) {
            localStorage.setItem(this.sectionData['ID'], 'false')
        }
        let sectionIsExpandedBoolean = localStorage.getItem(this.sectionData['ID']) == 'true'
        this.isExpanded = sectionIsExpandedBoolean;
    },
    directives: {
        'render-katex': {
            mounted(el) {
                let mathElements = el.getElementsByClassName('katex-math-inline');
                for (const element of mathElements) {
                    const expression = element.textContent;
                    katex.render(expression, element, {
                        displayMode: false,
                    });
                };
                mathElements = el.getElementsByClassName('katex-math-equation');
                for (const element of mathElements) {
                    const expression = element.textContent;
                    katex.render(expression, element, {
                        displayMode: true,
                    });
                }
            },
        }
    },
    template: `

<div class="row">
    <div class="col">
        <q-expansion-item 
            dense 
            switch-toggle-side 
            :label="sectionData.title" 
            header-class="app-card-header"
            header-style="bg-primary"
            expand-icon-class="app-expansion-icon"
            class="shadow-1 q-mb-sm"
            style="border-radius: 10px; background:#cfccc9"
            v-model="isExpanded"
            @click="handleExpansion"
        >

            <q-separator />


            <q-card class="app-card">
                <q-card-section>

                    <!-- SECTION MENU BUTTONS START -->
                    <div class='absolute-top-left q-gutter-xs' style="height: 2px; font-size: 11px; margin-top: 1px; margin-left: 17px;">
                        <q-badge color="info" outline>{{sectionData.projectName}}</q-badge>
                        <q-badge color="info" outline>id:{{sectionData.ID}}</q-badge>
                        <q-badge color="info" outline>{{sectionData.date}}</q-badge>

                        <q-badge
                            v-for="(tag, index) in sectionData.tags"
                            :key="index"
                            class="q-mr-sm"
                            color="info"
                            outline
                        >
                            {{ tag }}

                        </q-badge>

                        <q-badge class="cursor-pointer bg-info q-ml-sm">
                            + Tags
                            <q-popup-edit cover ref="tagsPopup" v-model="sectionTagsToString" v-slot="scope">
                                <q-input
                                    autofocus
                                    dense
                                    v-model="scope.value"
                                    :model-value="scope.value"
                                    hint="Add or remove tags. Separate tags with comma."
                                    @keyup.enter="setSectionTags(scope)"
                                    style="width: 70vw;"

                                >
                                </q-input>
                            </q-popup-edit>
                        </q-badge>
                    </div>
                    <div class='absolute-top-right q-gutter-xs' style="height: 2px; font-size: 16px; margin-top: 1px; margin-right: 2px;">

                        <!-- SECTION CHANGE TITLE BUTTON START -->
                        <q-btn round size="xs" color="secondary" icon="edit" @click="stageSetSectionTitle">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Change section title.
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION CHANGE TITLE BUTTON END -->

                        <!-- SECTION PIN BUTTON START -->
                        <q-btn 
                            round 
                            size="xs" 
                            color="secondary" 
                            icon="push_pin" 
                            @click="pinSection(sectionData['projectID'], sectionData['ID'])"
                        >
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Pin section.
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION PIN BUTTON END -->

                        <!-- SECTION CREATE DIRECTORY BUTTON START -->
                        <q-btn 
                            round 
                            size="xs" 
                            color="secondary" 
                            icon="folder" 
                            @click="createSectionDirectory"
                            :disable="sectionData['section_dir_exists'] === 1"
                        >
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Create directory.
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION CREATE DIRECTORY BUTTON END -->

                        <!-- SECTION ACTIONS BUTTON START -->
                        <q-btn-dropdown 
                            rounded 
                            size="xs" 
                            color="secondary" 
                            text-color="white"
                            label="Menu"
                            :menu-offset="[0,10]"
                        >
                            <q-list separator style="background-color: var(--q-secondary); color: white;">

                                <q-item v-if="sectionData['section_dir_exists'] === 1" clickable v-close-popup @click="getSectionDirectoryTree">
                                    <q-item-section>
                                        <q-item-label>View section directory tree</q-item-label>
                                    </q-item-section>
                                </q-item>

                                <q-item v-if="sectionData['section_dir_exists'] === 1" clickable v-close-popup @click="uploadFilesToSection">
                                    <q-item-section>
                                        <q-item-label>Upload files</q-item-label>
                                    </q-item-section>
                                </q-item>

                                <q-item clickable @click="sectionToPdf(sectionData['projectID'], sectionData['ID'], 1)">
                                    <q-item-section>
                                        <q-item-label>Export section to PDF</q-item-label>
                                    </q-item-section>
                                </q-item>

                                <q-item clickable @click="sectionToPdf(sectionData['projectID'], sectionData['ID'], 0)">
                                    <q-item-section>
                                        <q-item-label>Export section to .typ</q-item-label>
                                    </q-item-section>
                                </q-item>

                                <q-item clickable v-close-popup @click="deleteSection">
                                    <q-item-section>
                                        <q-item-label>Delete section</q-item-label>
                                    </q-item-section>
                                </q-item>

                            </q-list>
                        </q-btn-dropdown>
                        <!-- SECTION ACTIONS BUTTON END -->

                        <!-- SECTION EDIT CONTENT BUTTON START -->
                        <q-btn v-show="!showEditor" round size="xs" color="warning" icon="subject" @click="getSectionRawContent">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Edit section content
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION EDIT CONTENT BUTTON END -->

                        <!-- SECTION CANCEL EDIT BUTTON START -->
                        <q-btn v-show="showEditor" round size="xs" color="warning" icon="close" @click="cancelSetSectionContent">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Cancel
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION CANCEL EDIT BUTTON END -->

                        <!-- SECTION SAVE EDITED CONTENT BUTTON START -->
                        <q-btn v-show="showEditor" round size="xs" color="warning" icon="save" @click="setSectionContent">
                            <q-tooltip class="bg-teal" :offset="[10, 10]">
                                Save section content
                            </q-tooltip>
                        </q-btn>
                        <!-- SECTION SAVE EDITED CONTENT BUTTON END -->

                    </div>
                    <!-- SECTION MENU BUTTONS END -->


                    <Transition name="fade">
                        <!-- SECTION EDITOR START -->
                        <div v-if="!sectionContentFetched" class="app-spinner-container q-mt-xl">
                            <q-spinner size="2em" />
                            <p class="app-spinner-text">Loading data, please wait...</p>
                        </div>
                        <div class="q-mt-md" v-if="showEditor">
                            <q-editor 
                                ref="sectionEditorRef"
                                v-model="qEditorContent" 
                                @paste="onPaste"
                                :toolbar="[
                                [
                                'linktag',
                                'files', 
                                'figures',
                                'table',
                                'noteblue',
                                'notered',
                                'notegreen',
                                'fold',
                                'codeblock',
                                'math',
                                'omitable',
                                'omiplot',
                                'arrows'
                                ]
                                ]"
                                class="app-section-editor"
                                :content-style="{ overflowY: 'auto', flex: 1 }"
                                style="display: flex; flex-direction: column; height: 600px;"
                            >
                                <template v-slot:linktag>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Link"
                                        @click="insertLinkTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:files>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Files"
                                        @click="insertFilesTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:figures>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Figures"
                                        @click="insertFiguresTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:table>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Table"
                                        @click="insertTableTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:noteblue>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Note-blue"
                                        @click="insertNoteBlueTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:notered>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Note-red"
                                        @click="insertNoteRedTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:notegreen>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Note-green"
                                        @click="insertNoteGreenTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:fold>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Fold"
                                        @click="insertFoldTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:codeblock>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Code"
                                        @click="insertCodeTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:math>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Math"
                                        @click="insertMathTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:omitable>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Omitable"
                                        @click="insertOmilayersTableTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:omiplot>
                                    <q-btn
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Omiplot"
                                        @click="insertOmilayersPlotTagToSectionEditor"
                                    />
                                </template>

                                <template v-slot:arrows>
                                    <q-btn-dropdown
                                        dense
                                        unelevated
                                        color="secondary"
                                        text-color="white"
                                        size="sm"
                                        label="Arrows"
                                        dropdown-icon="arrow_drop_down"
                                    >
                                        <q-list dense>
                                            <q-item clickable v-close-popup @click="insertArrowToSectionEditor('⟶')">
                                                <q-item-section>
                                                <q-item-label>⟶</q-item-label>
                                                </q-item-section>
                                            </q-item>
                                            <q-item clickable v-close-popup @click="insertArrowToSectionEditor('⟹ ')">
                                                <q-item-section>
                                                <q-item-label>⟹ </q-item-label>
                                                </q-item-section>
                                            </q-item>
                                            <q-item clickable v-close-popup @click="insertArrowToSectionEditor('↳')">
                                                <q-item-section>
                                                <q-item-label>↳</q-item-label>
                                                </q-item-section>
                                            </q-item>
                                            <q-item clickable v-close-popup @click="insertArrowToSectionEditor('⮕')">
                                                <q-item-section>
                                                <q-item-label>⮕</q-item-label>
                                                </q-item-section>
                                            </q-item>
                                        </q-list>
                                    </q-btn-dropdown>
                                </template>

                            </q-editor>
                        </div>
                        <!-- SECTION EDITOR END -->


                        <!-- SECTION CONTENT START -->
                        <div v-else>
                            <template v-for="(sJSON, index) in sectionData['content']" :key="index">
                                <div class="q-mt-md">
                                    <div v-if="sJSON['container'] === 'fold'">
                                        <div>
                                            <q-expansion-item 
                                                expand-separator 
                                                switch-toggle-side 
                                                class="app-section-fold" 
                                            >
                                                <template v-slot:header>
                                                    <div v-html="sJSON.title" class="q-mt-xs"></div>
                                                </template>

                                                <q-card class="app-card no-padding">
                                                    <q-card-section class="no-padding">
                                                        <template v-for="(cJSON, cIDX) in sJSON['content']" :key="cIDX">
                                                            <section-content :cJSON=cJSON :cIDX=cIDX @get-view="getView"></section-content>
                                                        </template>
                                                    </q-card-section>
                                                </q-card>
                                            </q-expansion-item>
                                        </div>
                                    </div>

                                    <div v-else>
                                        <template v-for="(cJSON, cIDX) in sJSON['content']" :key="cIDX">
                                            <section-content :cJSON=cJSON :cIDX=cIDX @get-view="getView"></section-content>
                                        </template>
                                    </div>
                                </div>
                            </template>
                        </div>
                        <!-- SECTION CONTENT END -->
                    </Transition>

                </q-card-section>
            </q-card>
        </q-expansion-item>
    </div>
</div>


<q-dialog v-model="showChangeSectionTitle" persistent>
    <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
        <q-card-section>
            <div class="row items-start q-col-gutter-md">
                <div class="text-h6 app-text-color-primary col-11">
                    Change section title
                </div>
                <div class="col-1 q-mb-lg">
                    <q-btn size="sm" round icon="close" @click="showChangeSectionTitle = false" color="grey-5"/>
                </div>
            </div>
            <q-input
                v-model="newSectionTitle"
                autofocus
                label="Section title"
                filled
                dense
                no-error-icon="true"
                :rules="[val => !!val || 'Section title is required']"
                lazy-rules
                @keyup.enter="setSectionTitle"
            />
        </q-card-section>
    </q-card>
</q-dialog>


<!-- SHOW SECTION DIRECTORY TREE DIALOG START -->
<q-dialog v-model="showSectionDirectoryTreeDialog">
    <q-card class="col" style="display: flex; max-width: 30vw; max-height: 90vh; min-height:70vh">
        <q-card-section>
            <div><b>Section directory tree</b></div>
            <q-tree
                dense
                :nodes="selectedSectionDirectoryTreeData"
                node-key="label"
                no-nodes-label="Section directory is emtpy."
            />
        </q-card-section>
    </q-card>
</q-dialog>
<!-- SHOW SECTION DIRECTORY TREE DIALOG END -->


<!--UPLOAD FILES DIALOG START-->
<q-dialog v-model="showFileUploaderDialog" persistent>
    <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
        <q-card-section>
            <div class="row items-start q-col-gutter-md">
                <div class="text-h6 col-11">
                    Upload files to section {{sectionData['ID']}}
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


    `
});


