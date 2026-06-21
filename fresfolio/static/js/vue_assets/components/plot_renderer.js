import * as vg from "/static/js/vgplot.js";
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
            plotErrorMessage: ""
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
        async fetchLayerData() {
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
                                "selectedLayer": this.selectedLayer,
                                "sqlQuery": this.sqlQuery
                            }
                        )
                });

                if (response.ok) {
                    this.plotdata = new Uint8Array(await response.arrayBuffer());
                    await this.refreshCoordinator();
                    await this.insertData();
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
            this.isPlotRendering = true;
            this.plotErrorMessage = "";
            this.$refs.container.innerHTML = "";
            this.showPlotConfigurationDialog = false;
            try {
                this.$refs.container.innerHTML = "";
                const dashboard = vg.plot(
                    vg.dot(
                        vg.from("plotdata"),
                        {
                            x:this.plotSpecs['x'], 
                            y:this.plotSpecs['y'],
                            r:this.plotPointsSize
                        }
                    ),
                    vg.grid(true),
                    vg.width(680),
                    vg.height(500)
                )

                this.$refs.container.appendChild(dashboard);
            } catch (err) {
                // this.plotErrorMessage = err.message;
                this.plotErrorMessage = "ERROR";
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
        async insertData() {
            const con = await this._connector.getConnection();
            await this._coordinator.exec(`DROP TABLE IF EXISTS plotdata`);
            await con.insertArrowFromIPCStream(this.plotdata, { name: "plotdata" });

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

                <q-btn
                    class="q-ml-md"
                    color="primary" 
                    @click="showPlotConfigurationDialog = true" 
                    icon='settings'
                    :disable="!layerFetched"
                    label="Make plot"
                />

                <q-btn
                    class="q-ml-md"
                    color="primary" 
                    @click="dropLayerData()" 
                    icon='settings'
                    :disable="!layerFetched"
                    label="Delete plot"
                />

            </div>
            <div class="row items-center q-gutter-x-sm q-mb-xs q-ml-xs">
                Selected database: {{selectedDb}}
            </div>
            <div class="row items-center q-gutter-x-sm q-mb-sm q-ml-xs">
                Selected layer: {{selectedLayer}}
            </div>

        </div>

        <div>
            <div v-if="isPlotRendering" class="app-spinner-container q-mt-xl">
                <q-spinner
                    color="white"
                    size="2em"
                />
                <p class="app-spinner-text text-white">Plot rendering...</p>
            </div>
            <div v-else>
                <div v-if="plotErrorMessage !== ''">
                    {{plotErrorMessage}}
                </div>
                <div v-else ref="container"></div>
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


`
});


export default PlotRenderer;
