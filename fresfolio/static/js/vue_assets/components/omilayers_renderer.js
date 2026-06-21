import "https://cdn.jsdelivr.net/npm/@perspective-dev/viewer@4.5.1/dist/cdn/perspective-viewer.js";
import "https://cdn.jsdelivr.net/npm/@perspective-dev/viewer-datagrid@4.5.1/dist/cdn/perspective-viewer-datagrid.js";
import "https://cdn.jsdelivr.net/npm/@perspective-dev/viewer-charts@4.5.1/dist/cdn/perspective-viewer-charts.js";
import perspective from "https://cdn.jsdelivr.net/npm/@perspective-dev/client@4.5.1/dist/cdn/perspective.js";
import { DuckDBHandler } from "https://cdn.jsdelivr.net/npm/@perspective-dev/client/dist/esm/virtual_servers/duckdb.js";
import * as duckdb from "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.33.1-dev18.0/+esm";

const OmilayersRenderer = {
    name: "OmilayersRenderer",
    props: ['projectid'],
    data() {
        return {
            showQueryLayerDialog: false,
            databases: [],
            selectedDb: null,
            availableOmilayers: [],
            showSelectDBDialog: false,
            showSelectOmilayerDialog: false,
            selectedLayer: null,
            filterQuery: "",
            fetchingLayer: false,
            sqlQuery: {
                cols: "*",
                condition: ""
            },
            dbInitialized: false,
            _db: null,
            _server: null,
            _client: null,
            viewer: null

        }
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
        },
        selectLayer(layerName){
            this.selectedLayer = layerName;
            this.showSelectOmilayerDialog = false;
            this.reset_sqlQuery();
        },
        reset_sqlQuery(){
            this.sqlQuery = { cols: "*", condition: "" }
        },
        deleteSelectedLayer(layerName) {
            this.$q.dialog({
                title: 'Delete layer?',
                message: 'Are you sure you want to delete '+ layerName  + '? This action cannot be undone.',
                cancel: true,
            }).onOk(() => {
                this.submitDeleteSelectedLayer(layerName);
            })
        },
        async submitDeleteSelectedLayer(layerName) {
            try {
                const response = await fetch("/api/delete-omilayer", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.projectid,
                            "dbPath": this.selectedDb,
                            "layerName": layerName
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
        async bindTable() {
            await this.viewer.restore({
                table: "memory.table_data",
                group_by: [],
                columns: [],
                plugin: "Datagrid",
                theme: "Pro Dark",
                settings: true
            });
        },
        async fetchLayerData() {
            if (!this.dbInitialized) {
                this._db = await this.initializeDuckDB();
                this._server = perspective.createMessageHandler(new DuckDBHandler(this._db));
                this._client = await perspective.worker(this._server);
                this.dbInitialized = true
            } else {
                this.viewer.removeAttribute("columns");
                this.viewer.removeAttribute("group-by");
                this.viewer.removeAttribute("split-by");
                this.viewer.removeAttribute("filter");
                this.viewer.removeAttribute("sort");
                await this.viewer.reset();

                this._server = null;
                this._client = null;

                this._server = perspective.createMessageHandler(new DuckDBHandler(this._db));
                this._client = await perspective.worker(this._server);

                await this._db.query("DROP TABLE IF EXISTS table_data;");
            }

            this.fetchingLayer = true;

            try {
                const response = await fetch("/api/fetch-layer-data", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        projectID: this.projectid,
                        DBpath: this.selectedDb,
                        selectedLayer: this.selectedLayer,
                        sqlQuery: this.sqlQuery
                    })
                });

                if (!response.ok) {
                    const text = await response.text();
                    this.$q.notify({
                        message: text,
                        color: "negative",
                        position: "top-right"
                    });
                    return;
                }

                const tabledata = new Uint8Array(await response.arrayBuffer());

                // IMPORTANT: ensure table exists in DuckDB BEFORE binding
                await this._db.insertArrowFromIPCStream(tabledata, {
                    name: "table_data",
                    create: true
                });

                if (this.viewer === null) {
                    await this.initViewer();
                } else {
                    await this.viewer.load(this._client);
                }

                await this.bindTable();
                this.fetchingLayer = false;
            } catch (err) {
                console.error(err);
            }
        },
        async initializeDuckDB() {
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

            const workerUrl = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], {
                    type: "text/javascript",
                })
            );

            const duckdbWorker = new Worker(workerUrl);
            const logger = new duckdb.VoidLogger();
            const db = new duckdb.AsyncDuckDB(logger, duckdbWorker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            URL.revokeObjectURL(workerUrl);

            const conn = await db.connect();
            return conn;
        },
        async initViewer() {
            this.viewer = this.$refs.query;
            this.viewer.load(this._client);
        },
        async closeDB() {
            try {
                // 1. Safely terminate the client worker thread since the component is closing
                if (this._client) {
                    await this._client.terminate();
                }

                // 2. Terminate the DuckDB WebAssembly worker instance completely
                if (this._db) {
                    await this._db.close();
                }
                this._db = null;
                this._server = null;
                this._client = null;
            } catch (e) {
                console.error("cleanup failed:", e);
            }
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
        }
    },
    async mounted() {
        await this.getDuckdbDatabases();
    },
    async beforeUnmount() {
        await this.closeDB();
    },
    template: `
        <div class="column" style="height: 85vh;">
            <div class="row items-center q-gutter-x-sm q-mb-sm">
                <q-btn
                    color="primary"
                    outline
                    label="Select database"
                    @click="showSelectDBDialog=true"
                />

                <q-btn
                    color="primary"
                    outline
                    label="Select layer"
                    :disable="selectedDb === null"
                    @click="getOmilayers()"
                />

                <q-btn
                    color="primary"
                    outline
                    label="Query layer"
                    :disable="selectedLayer === null"
                    @click="showQueryLayerDialog = true"
                />

                <q-btn
                    color="primary"
                    label="Fetch layer"
                    :loading="fetchingLayer"
                    :disable="selectedLayer === null"
                    @click="fetchLayerData()"
                />

            </div>
            <div class="row items-center q-gutter-x-sm q-mb-xs q-ml-xs">
                Selected database: {{selectedDb}}
            </div>
            <div class="row items-center q-gutter-x-sm q-mb-sm q-ml-xs">
                Selected layer: {{selectedLayer}}
            </div>

            <div class="col" style="position: relative;">
                <perspective-viewer ref="query" id="query" style="position: absolute; inset: 0; width: 100%; height: 100%;"></perspective-viewer>
            </div>
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
                                    <div>
                                        <q-btn class='q-mr-sm' round color="secondary" size="sm" icon="table_rows" @click="selectLayer(JSON['name'])">
                                            <q-tooltip>Select</q-tooltip>
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



    `
};

export default OmilayersRenderer;
