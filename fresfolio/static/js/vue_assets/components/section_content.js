const { defineComponent } = Vue;

const SectionContent = defineComponent({
    props: ['cJSON', 'cIDX'],
    data() {
        return {
            showFigureDialog: false,
            selectedFigures: [],
            slide: null,
            fullscreen: false,
            selectedOmilayersJSON: null,
            selectedOmilayersIDX: null,
            selectedOmilayerColumnsAndDtypes: [],
            showSelectOmilayerDialog: false,
            showInsertDataToOmilayerDialog: false,
            showInsertFileToOmilayer: false,
            showSetSelectedOmilayerDescriptionDialog: false,
            availableOmilayers: [],
            newOmilayerColumns: [],
            showNewOmilayerDialog: false,
            newOmilayerName: "",
            newOmilayerDescription: "",
            newOmilayerFields: [{ name: '', datatype: '' }], // initial row
            datatypeOptions: ['TEXT', 'INTEGER', 'FLOAT'],
            uploadToSectionRoute: [],
            uploadToOmilayerRoute: "/api/upload-file-to-omilayer",
            filterQuery: "",
            flatFilesExtensions: ["MD", 
                                  "TXT", 
                                  "PY", 
                                  "JS",
                                  "SH",
                                  "R",
                                  "Rscript",
                                  "CSV",
                                  "TSV",
                                  "JSON",
                                  "TEX"],
            logViewerContent: "",
            showLogViewer: false
        };
    },
    methods: {
        imageclick(figureIDX) {
            this.selectedFigures = this.cJSON['html']
            this.showFigureDialog = true
            this.slide = figureIDX
        },
        getSelectedOmilayer(fileJSON, fJSONIDX){
            this.selectedOmilayersJSON = fileJSON;
            this.selectedOmilayersIDX = fJSONIDX;
            this.renderOmilayer(fileJSON['layer'], fileJSON['nrows']);
        },
        async getOmilayers(fileJSON, fJSONIDX){
            try {
                const response = await fetch("/api/get-omilayers", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(fileJSON)
                });

                if (response.ok) {
                    this.availableOmilayers = await response.json();
                    this.selectedOmilayersJSON = fileJSON;
                    this.selectedOmilayersIDX = fJSONIDX;
                    this.showSelectOmilayerDialog = true;
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
        createOmilayer(fileJSON, fJSONIDX) {
            this.selectedOmilayersJSON = fileJSON;
            this.selectedOmilayersIDX = fJSONIDX;
            this.showNewOmilayerDialog = true;

        },
        async insertDataToOmilayer(fileJSON) {
            try {
                const response = await fetch("/api/get-column-names-and-dtypes-for-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": fileJSON['projectID'], 
                            "dbPath": fileJSON['DBpath'],
                            "layerName": fileJSON['layer']
                        }
                    )
                });

                if (response.ok) {
                    this.selectedOmilayerColumnsAndDtypes =  await response.json();
                    this.selectedOmilayersJSON = fileJSON;
                    this.showInsertDataToOmilayerDialog = true;
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
        async renderOmilayer(layer, nrows) {
            try {
                const response = await fetch("/api/get-data-for-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedOmilayersJSON['projectID'],
                        "DBpath": this.selectedOmilayersJSON['DBpath'],
                        "layer": layer,
                        "nrows": nrows,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.cJSON['html'][this.selectedOmilayersIDX]['columns'] = data['columns'];
                    this.cJSON['html'][this.selectedOmilayersIDX]['rows'] = data['rows'];
                    this.cJSON['html'][this.selectedOmilayersIDX]['layer'] = layer;
                    this.cJSON['html'][this.selectedOmilayersIDX]['layer_exists'] = 1;
                    this.cJSON['html'][this.selectedOmilayersIDX]['layerInfo'] = data['layerInfo'];
                    this.showSelectOmilayerDialog = false;
                } else {
                    const responseText = await response.text();
                    this.showSelectOmilayerDialog = false
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                this.showSelectOmilayerDialog = false
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }

        }, 
        addRowToNewOmilayer() {
            this.newOmilayerFields.push({ name: '', datatype: '' })
        },
        async submitNewOmilayer() {
            try {
                const response = await fetch("/api/create-new-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedOmilayersJSON['projectID'],
                        "dbPath": this.selectedOmilayersJSON['DBpath'],
                        "layerName": this.newOmilayerName,
                        "layerDescription": this.newOmilayerDescription,
                        "columns": this.newOmilayerFields
                    })
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Omilayer created successfully.",
                        color: 'green',
                        position: "top-right"
                    })
                    this.showNewOmilayerDialog = false;
                    this.newOmilayerFields= [{ name: '', datatype: '' }];
                    this.newOmilayerName = ""
                    this.newOmilayerDescription = ""
                    this.cJSON['html'][this.selectedOmilayersIDX]['nLayers']++;
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.showNewOmilayerDialog = false;
                }
            } catch (error) {
                this.showNewOmilayerDialog = false;
                console.error(error);
            }
        },
        cancelNewOmilayerDialog() {
            this.showNewOmilayerDialog = false;
            this.newOmilayerFields= [{ name: '', datatype: '' }];
            this.newOmilayerName = ""
            this.newOmilayerDescription = ""
        },
        async submitDataToOmilayer() {
            try {
                const response = await fetch("/api/insert-data-to-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "projectID": this.selectedOmilayersJSON['projectID'],
                        "dbPath": this.selectedOmilayersJSON['DBpath'],
                        "layerName": this.selectedOmilayersJSON['layer'],
                        "layerData": this.selectedOmilayerColumnsAndDtypes
                    })
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Omilayer created successfully.",
                        color: 'green',
                        position: "top-right"
                    })
                    this.showInsertDataToOmilayerDialog = false;
                } else {
                    const responseText = await response.text();
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.showInsertDataToOmilayerDialog = false;
                }
            } catch (error) {
                this.showInsertDataToOmilayerDialog = false;
                console.error(error);
            }

        },
        insertFileToOmilayer(fileJSON) {
            this.selectedOmilayersJSON = fileJSON;
            this.uploadFileToOmilayerFields = [
                                            {"name":"projectID", "value":fileJSON['projectID']},
                                            {"name":"dbPath", "value":fileJSON['DBpath']},
                                            {"name":"layerName", "value":fileJSON['layer']}
                                        ]
            this.showInsertFileToOmilayer = true;
        },
        onFileUploadedToOmilayer() {
            this.$q.notify({
                message: "File inserted successfully.",
                color: 'green',
                position: "top-right"
            })
            this.showInsertFileToOmilayer = false;
        },
        onFileFailedToUploadToOmilayer() {
            this.$q.notify({
                message: "Something went wrong.",
                color: 'negative',
                position: "top-right"
            })
            this.showInsertFileToOmilayer = false;

        },
        setLayerDescription(fileJSON, fJSONIDX) {
            this.selectedOmilayersJSON = fileJSON;
            this.selectedOmilayersIDX = fJSONIDX;
            this.showSetSelectedOmilayerDescriptionDialog = true
        },
        async submitSetSelectedOmilayerDescription() {
            try {
                const response = await fetch("/api/set-omilayer-description", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedOmilayersJSON['projectID'],
                            "dbPath": this.selectedOmilayersJSON['DBpath'],
                            "layerName": this.selectedOmilayersJSON['layer'],
                            "layerInfo": this.selectedOmilayersJSON['layerInfo']
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Layer description is set.",
                        color: 'green',
                        position: "top-right"
                    })
                    this.cJSON['html'][this.selectedOmilayersIDX]['layerInfo'] = this.selectedOmilayersJSON['layerInfo'];
                    this.showSetSelectedOmilayerDescriptionDialog = false;
                } else {
                    const responseText = await response.text();
                    this.showSetSelectedOmilayerDescriptionDialog = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
                this.showSetSelectedOmilayerDescriptionDialog = false;
            }
        },
        deleteSelectedLayer(fileJSON, fJSONIDX) {
            this.$q.dialog({
                title: 'Delete layer?',
                message: 'Are you sure you want to delete '+ fileJSON['layer'] + '? This action cannot be undone.',
                cancel: true,
            }).onOk(() => {
                this.submitDeleteSelectedLayer(fileJSON, fJSONIDX);
            })
        },
        async submitDeleteSelectedLayer(fileJSON, fJSONIDX) {
            try {
                const response = await fetch("/api/delete-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": fileJSON['projectID'],
                            "dbPath": fileJSON['DBpath'],
                            "layerName": fileJSON['layer']
                        }
                    )
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Layer deleted successfully",
                        color: 'green',
                        position: "top-right"
                    })
                    this.availableOmilayers = this.availableOmilayers.filter(item => item.name !== fileJSON['layer'])
                    this.cJSON['html'][fJSONIDX]['layer'] = "";
                    this.cJSON['html'][fJSONIDX]['nLayers'] = this.cJSON['html'][fJSONIDX]['nLayers'] -1;
                    this.cJSON['html'][fJSONIDX]['layer_exists'] = 0;
                    this.cJSON['html'][fJSONIDX]['layerInfo'] = "";
                } else {
                    const responseText = await response.text();
                    this.showSetSelectedOmilayerDescriptionDialog = false;
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.error(error);
                this.showSetSelectedOmilayerDescriptionDialog = false;
            }

        },
        delegateViewClick(event) {
            const el = event.target.closest("action-link");
            if (!el) return;

            const args = el.getAttribute("data-args");
            const parsedArgs = args ? args.split(",").map(a => a.trim()) : [];
            this.$emit('get-view', parsedArgs)
        },
        openWithAceEditor(fileJSON) {
            this.$emit('open-with-ace-editor', fileJSON)
        },
        getFilenameFromUrl(fileUrl) {
            const url = new URL(fileUrl, window.location.origin);
            return url.pathname.split("/").pop();
        },
        async downloadImage(fileUrl) {
            try {
                const response = await fetch(fileUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);

                    const link = document.createElement("a");
                    link.href = url;

                    const fileName = this.getFilenameFromUrl(fileUrl);
                    // const fileName = "foobar.jpg"
                    link.download = fileName || "download";

                    document.body.appendChild(link);
                    link.click();

                    link.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    this.$q.notify({
                        message: "Error downloading figure",
                        color: 'negative',
                        position: "top-right"
                    })
                }
            } catch (error) {
                console.log(error)
                this.$q?.notify?.({
                    message: "Download failed",
                    color: "negative",
                    position: "top-right",
                });
            }
        },
        startProcess(fileJSON) {
            this.$emit('start-process', fileJSON)
        },
        async getProcessOutput(logFile, stdType) {
            try {
                const response = await fetch("/api/get-process-output", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "logFile": logFile,
                            "stdType": stdType
                        }
                    )
                });

                if (response.ok) {
                    data = await response.json();
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
        }
    },
    watch: {
    },
    created() {
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
    computed: {
        filteredOmilayers() {
            const q = (this.filterQuery || '').toLowerCase().trim();
            return this.availableOmilayers.filter(layer =>
                !q ||
                layer.name?.toLowerCase().includes(q) ||
                layer.info?.toLowerCase().includes(q)
            );
        },
        textColor() {
            return this.$q.dark.isActive ? 'text-white' : 'text-dark';
        }
    },
    template: `

<!-- TABLES RENDERING START -->
<div v-if="cJSON['type'] === 'table'" class="q-mb-md">
    <q-table 
        :title="cJSON.html[0].title"
        :columns="cJSON.html[0].columns" 
        :rows="cJSON.html[0].rows" 
        row-key="name"
        flat 
        dark 
        dense
        card-class="bg-info text-white"
        color="amber" 
        virtual-scroll
        @click="delegateViewClick"
        >

        <template v-slot:body-cell="props">
            <q-td v-render-katex :props="props">
                <span v-html="props.row[props.col.field]"></span>
            </q-td>
        </template>
    </q-table>
</div>
<!-- TABLES RENDERING END -->


<!-- OMILAYERS TABLE RENDERING START -->
<div v-else-if="cJSON['type'] === 'omitable'" class="q-mb-lg">

    <q-card v-if="cJSON['has_omilayers'] == 0">
        <div class="app-note-red">
            <b>Missing package warning</b><br>
            <span>Cannot render 'omitable' tag because the following package(s) are not installed:<br></span>
            <span>- omilayers</span>
        </div>
    </q-card>

    <template v-else v-for="(fileJSON, fJSONIDX) in cJSON['html']" :key="fJSONIDX">

        <q-card v-if="fileJSON['missingFields'].length !== 0">
            <div class="app-note-red">
                <b>Missing table fields</b><br>
                    <q-list dense>
                        <q-item v-for="(item, index) in fileJSON['missingFields']" :key="index">
                            - {{ item }}
                        </q-item>
                    </q-list>
            </div>
        </q-card>

        <q-card v-else-if="fileJSON['errors'] !== ''">
            <div class="app-note-red">
                <b>Error detected</b><br>
                <span>error: {{fileJSON['errors']['message']}}<br></span>
                <span>line: {{fileJSON['errors']['line']}}<br></span>
            </div>
        </q-card>

        <q-table 
            v-else
            :title="fileJSON.DBname"
            :columns="cJSON['html'][fJSONIDX]['columns']" 
            :rows="cJSON['html'][fJSONIDX]['rows']" 
            row-key="name"
            flat 
            dark 
            dense
            card-class="bg-info text-white"
            color="amber" 
            virtual-scroll
            class="q-mb-md"
            >
            <template v-slot:top>
                <div>
                    omilayers
                    <q-item-label caption class="text-white">file: {{fileJSON['DBpath']}}</q-item-label>
                    <q-item-label caption class="text-white">n-layers: {{fileJSON['nLayers']}}</q-item-label>
                    <q-item-label caption class="text-white">layer: {{fileJSON['layer']}}</q-item-label>
                    <q-item-label caption class="text-white">layer-info: {{fileJSON['layerInfo']}}</q-item-label>
                </div>
                <div class='absolute-top-right q-gutter-xs q-pa-md'>
                    <q-btn 
                        class="q-ml-md" 
                        size="sm" 
                        color="primary" 
                        label="Select layer" 
                        @click="getOmilayers(fileJSON, fJSONIDX)" 
                    />

                    <q-btn-dropdown 
                        rounded 
                        class="q-ml-md"
                        size="xs" 
                        color="primary" 
                        text-color="white"
                        icon="settings"
                        :menu-offset="[0,10]"
                    >

                        <q-list separator style="background-color: var(--q-secondary); color: white;">
                            <q-item clickable v-close-popup @click="createOmilayer(fileJSON, fJSONIDX)">
                                <q-item-section>
                                    <q-item-label>Create new layer</q-item-label>
                                </q-item-section>
                            </q-item>

                            <q-item  v-if="fileJSON['layer'] !== ''" clickable v-close-popup @click="insertFileToOmilayer(fileJSON)">
                                <q-item-section>
                                    <q-item-label>Insert data from file to layer</q-item-label>
                                </q-item-section>
                            </q-item>

                            <q-item  v-if="fileJSON['layer'] !== ''" clickable v-close-popup @click="insertDataToOmilayer(fileJSON)">
                                <q-item-section>
                                    <q-item-label>Insert data from form to layer</q-item-label>
                                </q-item-section>
                            </q-item>

                            <q-item  v-if="fileJSON['layer'] !== ''" clickable v-close-popup @click="setLayerDescription(fileJSON, fJSONIDX)">
                                <q-item-section>
                                    <q-item-label>Set layer description</q-item-label>
                                </q-item-section>
                            </q-item>

                            <q-item v-if="fileJSON['layer'] !== ''" clickable v-close-popup @click="deleteSelectedLayer(fileJSON, fJSONIDX)">
                                <q-item-section>
                                    <q-item-label>Delete layer</q-item-label>
                                </q-item-section>
                            </q-item>

                        </q-list>
                    </q-btn-dropdown>
                </div>
            </template>

            <template v-slot:body-cell="props">
                <q-td :props="props">
                    <span v-html="props.row[props.col.field]"></span>
                </q-td>
            </template>
        </q-table>
    </template>
</div>
<!-- OMILAYERS TABLE RENDERING END -->


<!-- PROCESS RENDERING START -->
<div v-else-if="cJSON['type'] === 'process'" class="q-mb-lg">
    <template v-for="(fileJSON, fJSONIDX) in cJSON['html']" :key="fJSONIDX">

        <q-card v-if="fileJSON['missingFields'].length !== 0">
            <div class="app-note-red">
                <b>Missing table fields</b><br>
                    <q-list dense>
                        <q-item v-for="(item, index) in fileJSON['missingFields']" :key="index">
                            - {{ item }}
                        </q-item>
                    </q-list>
            </div>
        </q-card>

        <q-card dark class="process-card">
          <q-card-section class="q-pa-sm">
                <div class="row items-center q-mb-xs">
                    <div style="flex: 1; min-width: 0; font-family: 'JetBrains Mono', monospace; font-size: 11px;">Process: {{ fileJSON['title'] }}</div>
                    <q-badge outline color="secondary">{{fileJSON['dateExecuted']}}</q-badge>
                    <q-btn v-if='fileJSON["workdir_exists"]==1' round unelevated dense color="secondary" icon="visibility" size="sm" class="q-ml-sm" @click="openWithAceEditor(fileJSON)" />
                    <q-btn v-if='fileJSON["workdir_exists"]==1' round unelevated dense color="secondary" icon="play_arrow" size="sm" class="q-ml-sm" @click="startProcess(fileJSON)" />
                </div>
                <!-- Row 1: conda + Run button -->
                <div class="row items-center q-mb-xs">
                    <div class="process-row">
                        <span class="process-key"><q-icon name="eco" size="12px" class="q-mr-xs text-cyan-4" /><span class="label-key">conda</span></span>
                        <span class="label-sep">|</span>
                        <span class="label-val text-cyan-4">{{ fileJSON["conda"] }}</span>
                    </div>
                </div>

                <!-- Row 2: workdir -->
                <div class="row items-center q-mb-xs">
                    <div class="process-row">
                        <span class="process-key"><q-icon name="folder_open" size="12px" class="q-mr-xs text-amber-4" /><span class="label-key">workdir</span></span>
                        <span class="label-sep">|</span>
                        <span class="label-val text-amber-4">{{ fileJSON["workdir"] }}</span>
                    </div>
                </div>

                <!-- Row 3: script -->
                <div class="row items-center q-mb-xs">
                    <div class="process-row">
                    <span class="process-key"><q-icon name="code" size="12px" class="q-mr-xs text-light-green-4" /><span class="label-key">script</span></span>
                    <span class="label-sep">|</span>
                    <span class="label-val text-light-green-4">{{ fileJSON["script"] }}</span>
                    </div>
                </div>

                <!-- Bottom row: badge + action buttons -->
                <div v-if="fileJSON['exitCode'] !== 'NA'" class="row items-center justify-end q-gutter-x-sm q-mt-xs">
                    <q-badge v-if="fileJSON['exitCode'] === 0" color="teal" label="success" />
                    <q-badge v-else color="warning" label="failed" />
                    <q-btn @click="getProcessOutput(fileJSON['logFilename'], 'stdout')" round unelevated dense color="secondary" icon="terminal" size="xs" />
                    <q-btn @click="getProcessOutput(fileJSON['logFilename'], 'stderr')" round unelevated dense color="secondary" icon="bug_report" size="xs" />
                </div>

          </q-card-section>
        </q-card>

    </template>
</div>
<!-- PROCESS RENDERING END -->

<!-- FILES RENDERING START -->
<div class="q-mb-md" v-else-if="cJSON['type'] === 'files'">
        <q-toolbar class="text-white shadow-2 rounded-borders app-section-files">
            <q-toolbar-title v-if="cJSON['containerTitle'] === ''">Files</q-toolbar-title>
            <q-toolbar-title v-else>Files: {{cJSON["containerTitle"]}}</q-toolbar-title>
        </q-toolbar>

        <q-list bordered separator class="app-section-files">
            <template v-for="(fileJSON, index) in cJSON['html']" :key="index">
                    <div v-if="flatFilesExtensions.includes(fileJSON['extension'])">
                        <q-item clickable @click="openWithAceEditor(fileJSON)" v-if="fileJSON['file_exists'] === 1">
                            <q-item-section class="app-section-files text-white">
                                <q-item-label class="q-mb-xs">
                                    <q-badge outline>{{fileJSON["extension"]}}</q-badge> 
                                    {{fileJSON["filename"]}}
                                </q-item-label>
                                <q-item-label class="text-white" v-render-katex caption v-html="fileJSON['caption']"></q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item v-else clickable @click="openWithAceEditor(fileJSON)" style="background-color: #523434">
                            <q-item-section>
                                <q-item-label class="q-mb-xs text-white">{{fileJSON["filename"]}}</q-item-label>
                                <q-item-label class="text-white" v-render-katex caption v-html="fileJSON['caption']"></q-item-label>
                            </q-item-section>
                        </q-item>
                    </div>
                    <div v-else>
                        <q-item clickable :href="fileJSON['url']" v-if="fileJSON['file_exists'] === 1">
                            <q-item-section class="app-section-files text-white">
                                <q-item-label class="q-mb-xs">
                                    <q-badge outline>{{fileJSON["extension"]}}</q-badge> 
                                    {{fileJSON["filename"]}}
                                </q-item-label>
                                <q-item-label class="text-white" v-render-katex caption v-html="fileJSON['caption']"></q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item v-else style="background-color: #523434">
                            <q-item-section>
                                <q-item-label class="q-mb-xs text-white">{{fileJSON["filename"]}}</q-item-label>
                                <q-item-label class="text-white" v-render-katex caption v-html="fileJSON['caption']"></q-item-label>
                            </q-item-section>
                        </q-item>
                    </div>
            </template>
        </q-list>
</div>
<!-- FILES RENDERING END -->


<!-- FIGURES RENDERING START -->
<div class="q-mb-md" v-else-if="cJSON['type'] === 'figures'">
    <q-toolbar class="text-white shadow-2 q-mb-md rounded-borders app-section-figures">
        <q-toolbar-title v-if="cJSON['containerTitle'] === ''">Figures</q-toolbar-title>
        <q-toolbar-title v-else>Figures: {{cJSON["containerTitle"]}}</q-toolbar-title>
    </q-toolbar>

    <div class="row q-gutter-md q-col-gutter-md wrap q-ml-xl">
        <template v-for="(fileJSON, figureIDX) in cJSON['html']" :key="figureIDX">
            <q-img  v-if="fileJSON['file_exists'] === 1" :src="fileJSON['url']" height="80px" style="max-width: 150px" class="q-hoverable frn-image">
                    <div class="absolute-bottom text-subtitle2 text-white" style="padding:0px;background-color:#000000ad;font-size:10px">
                        {{fileJSON["title"]}}
                    </div>
                <div class="absolute-full transparent">
                    <q-list class="absolute-full transparent">
                        <q-item clickable v-ripple @click="imageclick(figureIDX)"></q-item>
                    </q-list>
                  </div>
            </q-img>
            <q-img v-else height="80px" style="max-width: 150px; background-color: black;" src="">
                <div class="absolute-bottom text-subtitle2 text-white" style="padding:0px;font-size:10px">
                    {{fileJSON["url"]}}
                </div>
            </q-img>
        </template>
    </div>
</div>
<!-- FIGURES RENDERING END -->


<div v-else>
    <span v-html="cJSON['html']" v-render-katex @click="delegateViewClick"></span>
</div>

    <!-- SHOW FIGURE DIALOG START -->
    <q-dialog v-model="showFigureDialog">
        <q-card class="col app-bg-color-5" style="display: flex; max-width: 70vw; max-height: 90vh; min-height:70vh">

            <q-card-section class="col q-pa-md items-center">
                <q-carousel
                      animated
                      v-model="slide"
                      arrows
                      infinite
                      class="fit column"
                      v-model:fullscreen="fullscreen"
                    >

                    <template v-for="(figure, figureIDX) in selectedFigures" :key="figureIDX">
                        <q-carousel-slide :name="figureIDX" class="flex items-center justify-center app-bg-color-5">
                                <q-img
                                    :src="figure.url"
                                    style="max-height: 90%; max-width: 80%;"
                                    fit="contain"
                                    class="flex"
                                >
                                </q-img>

                            <div class="flex row q-mt-md full-width" style="max-height:30vh;">
                                <div class="full-width">
                                    <b>{{figure.title}}: </b>
                                    <span class="app-figure-caption-text" v-html="figure.caption"></span>
                                </div>
                            </div>
                        </q-carousel-slide>
                    </template>

                    <template v-slot:control>
                        <q-carousel-control
                            position="top-right"
                            :offset="[18, 18]"
                        >
                            <q-btn 
                                push round dense
                                color="primary" 
                                icon="download" 
                                @click="downloadImage(selectedFigures[slide].url)" 
                            >
                                <q-tooltip>
                                    Download figure
                                </q-tooltip>
                            </q-btn>
                        </q-carousel-control>

                        <q-carousel-control
                            position="bottom-right"
                            :offset="[18, 18]"
                        >
                            <q-btn
                                push round dense color="primary" text-color="primary"
                                :icon="fullscreen ? 'fullscreen_exit' : 'fullscreen'"
                                @click="fullscreen = !fullscreen"
                            />
                        </q-carousel-control>
                    </template>

                </q-carousel>
            </q-card-section>

        </q-card>
    </q-dialog>
    <!-- SHOW FIGURE DIALOG END -->


    <!-- SHOW OMILAYERS DIALOG START -->
    <q-dialog v-model="showSelectOmilayerDialog">
        <q-card class="full-width app-bg-color-5">
            <q-card-section class="full-width">

                <q-input
                    v-model="filterQuery"
                    placeholder="Filter layers..."
                    dark
                    dense
                    clearable
                    debounce="200"
                    class="q-mb-md"
                >
                    <template #prepend>
                        <q-icon name="search" />
                    </template>
                </q-input>

                <q-list dense class="full-width">
                    <template v-for="(JSON, index) in filteredOmilayers" :key="index">
                        <q-item-section class="full-width">
                            <div class="q-mb-sm row items-center justify-between">
                                <q-item-label><b>{{JSON['name']}}</b></q-item-label>
                                <div>
                                    <q-btn class='q-mr-sm' round color="secondary" size="sm" icon="filter_5" @click="renderOmilayer(JSON['name'], '5')">
                                        <q-tooltip>Top 5 rows</q-tooltip>
                                    </q-btn>

                                    <q-btn class='q-mr-sm' round color="secondary" size="sm" icon="table_rows" @click="renderOmilayer(JSON['name'], 'all')">
                                        <q-tooltip>All rows</q-tooltip>
                                    </q-btn>


                                    <q-btn round color="negative" size="sm" icon="delete" 
                                        @click="() => { selectedOmilayersJSON['layer'] = JSON['name']; deleteSelectedLayer(selectedOmilayersJSON, selectedOmilayersIDX); }">
                                        <q-tooltip>Delete layer</q-tooltip>
                                    </q-btn>

                                </div>
                            </div>
                            <div class="full-width">
                                <q-item-label caption class="text-subtitle1">{{JSON['info']}}</q-item-label>
                                <q-item-label caption class="text-subtitle1">shape: {{JSON['shape']}}</q-item-label>
                            </div>
                        </q-item-section>

                      <q-separator spaced inset />

                    </template>
                </q-list>
            </q-card-section>
        </q-card>
    </q-dialog>
    <!-- SHOW OMILAYERS DIALOG END -->


 <!-- ADD NEW OMILAYER DIALOG START -->
    <q-dialog v-model="showNewOmilayerDialog">
        <q-card class="full-width">
            <q-card-section>
                <div class="text-h6">Add omilayer</div>
                <div>
                    <q-item-label caption>file: {{selectedOmilayersJSON['DBpath']}}</q-item-label>
                </div>
            </q-card-section>

            <q-card-section>
                <q-form @submit.prevent="submitForm">
                    <div class="full-width">
                        <q-input class="q-mb-md" v-model="newOmilayerName" label="Name" filled />
                    </div>
                    <div class="full-width">
                        <q-input class="q-mb-md" v-model="newOmilayerDescription" label="Description" filled />
                    </div>
                    <div v-for="(field, index) in newOmilayerFields" :key="index" class="row q-col-gutter-md q-mb-sm">
                        <div class="col">
                            <q-input v-model="field.name" label="Column name" filled />
                        </div>
                        <div class="col">
                            <q-select
                                v-model="field.datatype"
                                :options="datatypeOptions"
                                label="Datatype"
                                filled
                                emit-value
                                map-options
                            />
                        </div>
                    </div>

                    <!-- Add row button -->
                    <div>
                        <q-btn
                            outline
                            icon="add"
                            label="Add Row"
                            color="primary"
                            @click="addRowToNewOmilayer"
                            class="q-mt-md full-width"
                        />
                    </div>
                </q-form>
            </q-card-section>

            <q-card-actions align="right" class="full-width">
                <q-btn flat label="Cancel" color="primary"  @click="cancelNewOmilayerDialog" />
                <q-btn flat label="Save" color="primary" @click="submitNewOmilayer" />
            </q-card-actions>
        </q-card>
    </q-dialog>
 <!-- ADD NEW OMILAYER DIALOG END -->


 <!-- INSERT DATA TO OMILAYER DIALOG START -->
    <q-dialog v-model="showInsertDataToOmilayerDialog">
        <q-card class="full-width">
            <q-card-section>
                <div class="text-h6">Insert data from form</div>
                <div>
                    <q-item-label caption dark :class="textColor">layer: {{selectedOmilayersJSON['layer']}}</q-item-label>
                </div>
            </q-card-section>

            <q-card-section>
                <q-form @submit.prevent="submitForm">
                    <div v-for="(field, index) in selectedOmilayerColumnsAndDtypes" :key="index" class="row q-col-gutter-md q-mb-sm">
                        <div class="col">
                            <q-input v-model="field.value" :label="field.name" :hint="field.dtype" filled />
                        </div>
                    </div>
                </q-form>
            </q-card-section>

            <q-card-actions align="right" class="full-width">
                <q-btn flat label="Cancel" color="primary"  @click="showInsertDataToOmilayerDialog = false" />
                <q-btn flat label="Save" color="primary" @click="submitDataToOmilayer" />
            </q-card-actions>
        </q-card>
    </q-dialog>
 <!-- INSERT DATA TO OMILAYER DIALOG END -->

 <!-- INSERT FILE TO OMILAYER DIALOG START -->
    <q-dialog v-model="showInsertFileToOmilayer">
        <q-card class="app-bg-color-5" style="width: 700px; max-width: 80vw;">
            <q-card-section>
                    <div class="text-h6">Insert data from file</div>
                    <div>
                        <q-item-label caption>layer: {{selectedOmilayersJSON['layer']}}</q-item-label>
                    </div>
            </q-card-section>

            <q-card-section class="row justify-center">
                <q-uploader
                  :url="uploadToOmilayerRoute"
                  accept=".txt,.csv,.tsv,.xls,.xlsx"
                  field-name="omilayerData"
                  method="POST"
                  :form-fields="uploadFileToOmilayerFields"
                  color="teal"
                  flat
                  bordered
                  batch
                  style="max-width: 600px; width: 600px;"
                  @uploaded="onFileUploadedToOmilayer"
                  @failed="onFileFailedToUploadToOmilayer"
                >
                    <template v-slot:header="scope">
                        <div class="row no-wrap items-center q-pa-sm q-gutter-xs">
                            <q-btn v-if="scope.queuedFiles.length > 0" icon="clear_all" @click="scope.removeQueuedFiles" round dense flat />
                            <q-btn v-if="scope.uploadedFiles.length > 0" icon="done_all" @click="scope.removeUploadedFiles" round dense flat />
                            <q-spinner v-if="scope.isUploading" class="q-uploader__spinner" />
                            <div class="col">
                                <div class="q-uploader__title">Select file</div>
                                <q-space />
                                <div class="text-caption">Allowed files: .txt, .csv, .tsv, .xls, .xlsx</div>
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
 <!-- INSERT FILE TO OMILAYER DIALOG END -->


 <!-- SET OMILAYER DESCRIPTION DIALOG START -->
    <q-dialog v-model="showSetSelectedOmilayerDescriptionDialog">
        <q-card class="app-bg-color-5" style="width: 700px; max-width: 80vw;">
            <q-card-section>
                    <div class="text-h6">Set description</div>
                    <div>
                        <q-item-label dark caption :class="textColor">layer: {{selectedOmilayersJSON['layer']}}</q-item-label>
                    </div>
            </q-card-section>
            <q-card-section>
                <q-form @submit.prevent="submitForm">
                    <div class="full-width">
                        <q-input class="q-mb-md" v-model="selectedOmilayersJSON['layerInfo']" label="Description" filled />
                    </div>
                    <div>
                        <q-btn
                            outline
                            label="Submit"
                            color="primary"
                            @click="submitSetSelectedOmilayerDescription"
                            class="q-mt-md full-width"
                        />
                    </div>
                </q-form>
            </q-card-section>

        </q-card>
    </q-dialog>
 <!-- SET OMILAYER DESCRIPTION DIALOG END -->


    <!-- LOG VIEWER DIALOG START -->
    <q-dialog v-model="showLogViewer">
        <q-card style="width: 1200px; max-width: 80vw; max-height: 80vh;">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Log viewer</div>
                    <q-space />
                    <q-btn icon="close" flat round dense v-close-popup />
                    </q-card-section>

                    <q-card-section>
                    <div class="app-logviewer-container" style="overflow: auto; max-height: 60vh;">
                        <pre><code>{{ logViewerContent }}</code></pre>
                    </div>
            </q-card-section>
        </q-card>
    </q-dialog>
    <!-- LOG VIEWER DIALOG END -->

    `
});

export default SectionContent;
