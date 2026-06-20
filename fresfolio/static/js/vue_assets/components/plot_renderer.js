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
            sqlQuery: {
                layer: "",
                cols: "*",
                condition: ""
            },
            queryHistory: [],
            queryError: null,
            queryLoading: false,
            databases: [],
            selectedDb: "",
            showBindDataDialog: false,
            showPlotConfigurationDialog: false,
            isPlotRendering: false,
            dataBinded: false,
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
        async fetchPlotDataBasedOnQuery() {
            this.dataBinded = false;
            if (!this._coordinatorReady) {
                this.$q.notify({
                    message: "WASM coordinator is not ready",
                    color: 'negative',
                    position: "top-right"
                })
            } else {
                try {
                    const response = await fetch("/api/fetch-plot-data", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(
                            {
                                "projectID": this.projectid,
                                "DBpath": this.selectedDb['label'],
                                "sqlQuery": this.sqlQuery
                            }
                        )
                });

                if (response.ok) {
                    this.plotdata = new Uint8Array(await response.arrayBuffer());
                    await this.refreshCoordinator();
                    await this.insertData();
                    this.dataBinded = true;
                    this.showBindDataDialog = false;
                    this.$q.notify({
                        message: "Plot data fetched",
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
            // Wait for vgplot to load.
            // while (!window.vg) {
            //     await new Promise(resolve => setTimeout(resolve, 50)); // check every 50ms
            // }
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
        <div class="row items-center q-mb-sm">
            <q-btn 
                color="primary" 
                size='sm' 
                @click="showBindDataDialog = true" 
                icon='commit'
                label="Bind data"
            />
            <q-btn
                class="q-ml-md"
                color="primary" 
                size='sm' 
                @click="showPlotConfigurationDialog = true" 
                icon='settings'
                :disable="!dataBinded"
                label="Plot configuration"
            />
        </div>


        <div class="col q-px-xl plot-tooltip">
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

        <!--BIND DATA DIALOG STARTS-->
        <q-dialog v-model="showBindDataDialog">
            <q-card class="app-bg-color-5" style="min-width: 500px; max-width: 90vw;">
                <q-card-section>
                    <div class="text-h6">Bind data</div>
                </q-card-section>

                <q-card-section>
                    <q-card flat bordered class="q-mb-md">
                        <q-card-section class="q-pb-sm">
                            <div class="row items-center justify-between q-mb-sm">
                                <div class="text-caption text-weight-medium" style="color: var(--q-secondary)">
                                    DuckDB database
                                </div>
                            </div>

                            <q-select
                                v-model="selectedDb"
                                :options="databases"
                                option-label="label"
                                option-value="path"
                                outlined
                                dense
                                emit-value
                                map-options
                                placeholder="Select a database…"
                                no-options-label="No databases found"
                            >
                                <template #option="{ itemProps, opt }">
                                    <q-item v-bind="itemProps">
                                        <q-item-section>
                                            <q-item-label style="font-family: monospace; font-size: 13px">
                                                {{ opt.label }}
                                            </q-item-label>
                                        </q-item-section>
                                    </q-item>
                                </template>
                                <template #selected-item="{ opt }">
                                    <span style="font-family: monospace; font-size: 13px">{{ opt?.label }}</span>
                                </template>
                                <template #no-option>
                                    <q-item>
                                        <q-item-section class="text-caption text-grey">
                                            No .duckdb files found
                                        </q-item-section>
                                    </q-item>
                                </template>
                            </q-select>

                            <!-- Selected db full path hint -->
                            <div v-if="selectedDb" class="text-caption q-mt-xs ellipsis" style="color: var(--q-secondary); font-family: monospace">
                                {{ selectedDb.path }}
                            </div>

                            <q-input
                                class="q-mt-md"
                                v-model="sqlQuery.layer"
                                outlined
                                dense
                                label="Layer"
                                :input-style="{ fontFamily: 'monospace', fontSize: '13px' }"
                            />

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
                                :error="!!queryError"
                                :error-message="queryError"
                                @keydown.ctrl.enter.prevent="runQuery"
                                @keydown.meta.enter.prevent="runQuery"
                            />

                            <div class="row items-center justify-between q-mt-sm">
                                <q-btn
                                    color="primary"
                                    size="sm"
                                    label="Fetch data"
                                    icon="play_arrow"
                                    :loading="queryLoading"
                                    :disable="!sqlQuery.layer.trim()"
                                    @click="fetchPlotDataBasedOnQuery()"
                                />
                            </div>

                        </q-card-section>
                    </q-card>
                </q-card-section>
            </q-card>
        </q-dialog>
        <!--BIND DATA DIALOG ENDS-->

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
