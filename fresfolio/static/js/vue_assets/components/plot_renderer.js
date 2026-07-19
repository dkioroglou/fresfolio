// import * as vg from "/static/js/vgplot.js";
import { parse } from 'https://esm.sh/yaml@2.7.0';
import * as vg from "https://esm.sh/@uwdata/vgplot@0.24.2";
import { parseSpec, astToDOM } from "https://esm.sh/@uwdata/mosaic-spec@0.21.1?deps=@uwdata/vgplot@0.24.2";
// import { parseSpec, astToDOM } from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-spec/+esm';

const { defineComponent } = Vue;

const PlotRenderer = defineComponent({
    props: ['projectid'],
    data() {
        return {
            plotdata: [],
            loading: false,
            error: null,
            plotPointsSize: 5,
            queryHistory: [],
            queryError: null,
            queryLoading: false,
            databases: [],
            selectedDb: null,
            selectedLayer: null,
            availableOmilayers: [],
            showSelectDBDialog: false,
            showSelectOmilayerDialog: false,
            showQueryLayerDialog: false,
            sqlQuery: {
                cols: "*",
                condition: ""
            },
            showBindDataDialog: false,
            showPlotConfigurationDialog: false,
            isPlotRendering: false,
            layerFetched: false,
            plotSpecs: {
                x: null,
                y: null
            },
            plotErrorMessage: "",
            yamlSpec: "",
            showAceEditor: false,
            editorInstance: null,
            isMinimized: false,
            isExpanded: false,
            initialCode: "",
            aceEditorMode: "yaml"
        };
    },
    methods: {
        async getDuckdbDatabases() {
            try {
                const response = await fetch("/api/get-project-duckdbs", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                        }
                    )
            });

            if (response.ok) {
                this.databases = await response.json();
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
        async getOmilayers(){
            try {
                const response = await fetch("/api/get-omilayers", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "DBpath": this.selectedDb,
                        }
                    )
                });

                if (response.ok) {
                    this.availableOmilayers = await response.json();
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
        selectDB(dbName){
            this.selectedDb = dbName;
            this.selectedLayer = null;
            this.showSelectDBDialog = false;
            this.reset_sqlQuery();
            this.getOmilayers();
        },
        selectLayer(layerName){
            this.selectedLayer = layerName;
            this.showSelectOmilayerDialog = false;
            this.reset_sqlQuery();
        },
        reset_sqlQuery(){
            this.sqlQuery = { cols: "*", condition: "" }
            this.layerFetched = false;
        },
        async fetchLayerData(layerName) {
            this.layerFetched = false;
            if (!this._coordinatorReady) {
                this.$q.notify({
                    message: "WASM coordinator is not ready",
                    color: 'negative',
                    position: "top-right"
                })
            } else {
                try {
                    const response = await fetch("/api/fetch-layer-data", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(
                            {
                                "projectID": this.projectid,
                                "DBpath": this.selectedDb,
                                "selectedLayer": layerName,
                                "sqlQuery": this.sqlQuery
                            }
                        )
                });

                if (response.ok) {
                    this.selectedLayer = layerName;
                    this.showSelectOmilayerDialog = false;
                    this.plotdata = new Uint8Array(await response.arrayBuffer());
                    await this.refreshCoordinator();
                    await this.insertData(layerName);
                    this.layerFetched = true;
                    this.$q.notify({
                        message: "Layer data fetched",
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
        async renderPlot() {
            this.isMinimized = true;
            this.isPlotRendering = true;
            this.plotErrorMessage = "";
            this.$refs.container.innerHTML = "";
            const yamlSpec = this.editorInstance.getValue();

            try {
                this.$refs.container.innerHTML = "";

                // this.yamlSpec is a string containing your YAML
                const spec = parse(yamlSpec);

                // Parse into Mosaic AST
                const ast = parseSpec(spec);
                console.log("spec", spec);

                console.log("before astToDOM");
                const result = await astToDOM(ast);
                console.log(result);

                this.$refs.container.appendChild(result.element);
                this.isPlotRendering = false;

            } catch (err) {
                this.isPlotRendering = false;
                console.error(err);
                this.plotErrorMessage = err.message;
            } finally {
                this.isPlotRendering = false;
            }
        },
        async initCoordinator() {
            this._coordinator = vg.coordinator();
            if (!this._connector) {
                // Only create connector once
                this._connector = vg.wasmConnector();
                await this._coordinator.databaseConnector(this._connector);
            }
            this._coordinatorReady = true;
        },
        async refreshCoordinator() {
            this._coordinatorReady = false;
            this._coordinator.clear();
            // Don't reinitialize — reuse existing connector and DuckDB instance
            this._coordinatorReady = true;
        },
        async insertData(layerName) {
            const con = await this._connector.getConnection();
            await this._coordinator.exec(`DROP TABLE IF EXISTS ${layerName}`);
            await con.insertArrowFromIPCStream(this.plotdata, { name: layerName });

        },
        async dropLayerData() {
            this._coordinator.clear();
            await this._coordinator.exec(`DROP TABLE IF EXISTS plotdata`);
            this.$refs.container.innerHTML = "";
            this.selectedLayer = null;
            this.selectedDb = null;
            this.reset_sqlQuery();
            this.plotSpecs = { x: null, y: null }
            this.layerFetched = false
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
                this.closeAceEditor();        // replace with your close logic
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
        openAceEditor() {
            this.isMinimized = false;
            this.$nextTick(() => {
                this.showAceEditor = true;
                this.$nextTick(() => {
                    this.$nextTick(() => this.initAceEditor())
                })
            })

        },
        closeAceEditor() {
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
    },
    computed: {
        filteredOmilayers() {
            const q = (this.filterQuery || '').toLowerCase().trim();
            return this.availableOmilayers.filter(layer =>
                !q ||
                layer.name?.toLowerCase().includes(q) ||
                layer.info?.toLowerCase().includes(q)
            );
        }
    },
    async mounted() {
        this.getDuckdbDatabases();
        await this.initCoordinator();
    },
    created() {
        // Plain instance properties — not reactive, not proxied by Vue
        this._coordinator = null;
        this._connector = null;
        this._coordinatorReady = false;
    },
    template: `
        <div class="column">
            <div class="row items-center q-gutter-x-sm q-mb-sm">
                <q-btn
                    color="primary"
                    outline
                    label="Select database"
                    @click="showSelectDBDialog=true"
                />

                <q-btn
                    round
                    class="q-ml-md"
                    color="primary" 
                    @click="openAceEditor" 
                    icon='scatter_plot'
                    :disable="!layerFetched"
                >
                    <q-tooltip>Make plot</q-tooltip>
                </q-btn>

                <q-btn
                    round
                    class="q-ml-md"
                    color="primary" 
                    @click="dropLayerData()" 
                    icon='delete'
                    :disable="!layerFetched"
                >
                    <q-tooltip>Delete plot</q-tooltip>
                </q-btn>

            </div>
            <div class="row items-center q-gutter-x-sm q-mb-xs q-ml-xs">
                Selected database: {{selectedDb}}
            </div>
            <div class="row items-center q-gutter-x-sm q-mb-sm q-ml-xs">
                Selected layer: {{selectedLayer}}
            </div>

        </div>

        <div class="relative-position">
            <div v-if="isPlotRendering" class="app-spinner-container q-mt-xl">
                <q-spinner color="white" size="2em" />
                <p class="app-spinner-text text-white">Plot rendering...</p>
            </div>
            <div v-if="plotErrorMessage !== ''">
                {{ plotErrorMessage }}
            </div>
            <div v-show="!isPlotRendering && plotErrorMessage === ''" ref="container"></div>
        </div>

        <!--QUERY LAYER DIALOG STARTS-->
        <q-dialog v-model="showQueryLayerDialog">
            <q-card class="app-bg-color-5" style="min-width: 500px; max-width: 90vw;">
                <q-card-section>
                    <div class="text-h6">Query layers</div>
                </q-card-section>

                <q-card-section>
                    <q-card flat bordered class="q-mb-md">
                        <q-card-section class="q-pb-sm">

                            <q-input
                                class="q-mt-md"
                                v-model="sqlQuery.cols"
                                outlined
                                dense
                                label="Columns"
                                :input-style="{ fontFamily: 'monospace', fontSize: '13px' }"
                            />

                            <q-input
                                class="q-mt-md"
                                v-model="sqlQuery.condition"
                                placeholder="Insert condition for query"
                                type="textarea"
                                outlined
                                dense
                                autogrow
                                :rows="3"
                                style="font-family: monospace; font-size: 13px"
                            />

                        </q-card-section>
                    </q-card>
                </q-card-section>
            </q-card>
        </q-dialog>
        <!--QUERY LAYER DIALOG ENDS-->

        <!-- SHOW SELECT DB DIALOG START -->
        <q-dialog v-model="showSelectDBDialog">
            <q-card class="full-width app-bg-color-5">
                <q-card-section class="full-width">
                    <q-list dense class="full-width">
                        <q-item 
                            v-for="(item, index) in databases" 
                            :key="index" 
                            clickable 
                            @click="selectDB(item.label)"
                        >
                            <q-item-section>
                                <q-item-label>{{ item.label }}</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>
        </q-dialog>
        <!-- SHOW SELECT DB DIALOG END -->

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
                                    <div class="row">
                                        <q-btn class='q-mr-sm' round color="secondary" size="sm" icon="filter_alt" @click="showQueryLayerDialog=true">
                                            <q-tooltip>SQL query</q-tooltip>
                                        </q-btn>
                                        <q-btn class='q-mr-sm' round color="secondary" size="sm" icon="table_rows" @click="fetchLayerData(JSON['name'])">
                                            <q-tooltip>Fetch data</q-tooltip>
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

        <!--PLOT CONFIGURATION DIALOG STARTS-->
        <q-dialog v-model="showPlotConfigurationDialog">
            <q-card class="app-bg-color-5" style="min-width: 500px; max-width: 90vw;">
                <q-card-section>
                    <div class="text-h6">Plot configuration</div>
                </q-card-section>
                <!-- PLOT SPECS START -->
                <q-card-section>
                    <div class="text-caption text-weight-medium q-mb-sm" style="color: var(--q-secondary)">
                        Mark options
                    </div>

                    <!-- x -->
                    <div class="col-6">
                        <q-input
                            v-model="plotSpecs.x"
                            outlined
                            dense
                            label="x"
                            :input-style="{ fontFamily: 'monospace', fontSize: '13px' }"
                        />
                    </div>

                    <!-- y -->
                    <div class="col-6 q-mt-md">
                        <q-input
                            v-model="plotSpecs.y"
                            outlined
                            dense
                            label="y"
                            :input-style="{ fontFamily: 'monospace', fontSize: '13px' }"
                        />
                    </div>

                    <div class="row items-center q-mt-md">
                        <q-badge color="secondary">
                            Size: {{ plotPointsSize }}
                        </q-badge>
                        <q-slider v-model="plotPointsSize" :min="1" :max="10" :step="1" />
                    </div>

                    <div class="row items-center">
                        <q-btn
                            color="primary"
                            size="sm"
                            label="Make plot"
                            icon="play_arrow"
                            :loading="queryLoading"
                            @click="renderPlot()"
                        />
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>
        <!--PLOT CONFIGURATION DIALOG ENDS-->

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
                        <span class="bottom-panel__title">Plot specification</span>
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
                                @click="closeAceEditor"
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
                                <q-btn color="primary" label="Render plot" @click="renderPlot" />
                            </div>
                        </div>
                    </Transition>
                </div>
            </Transition>
        </Teleport>
        <!-- ACE EDITOR  DIALOG END -->

`
});


export default PlotRenderer;
