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
            showBindDataDialog: false,
            databases: [],
            selectedDb: null,
            dataBinded: false,
            sqlQuery: {
                layer: "",
                cols: "*",
                condition: ""
            },
            _db: null,
            _server: null,
            _client: null,
            _workerUrl: null,
            _viewerReady: false,
            _dbReady: false,

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
        async bindTable() {
            if (!this.$refs.query) return;
            if (!this._client) return;

            await this.$refs.query.restore({
                table: "memory.table_data",
                group_by: [],
                columns: [],
                plugin: "Datagrid",
                theme: "Pro Dark",
                settings: true,
            });
        },
        async fetchDataBasedOnQuery() {
            this.dataBinded = false;

            try {
                const response = await fetch("/api/fetch-plot-data", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        projectID: this.projectid,
                        DBpath: this.selectedDb.label,
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

                if (!this._db) {
                    await this.createDB();
                    await this.initViewer();
                }

                // IMPORTANT: ensure table exists in DuckDB BEFORE binding
                await this._db.insertArrowFromIPCStream(tabledata, {
                    name: "table_data",
                    create: true
                });

                await this.bindTable();

                this.dataBinded = true;
                this.showBindDataDialog = false;

                this.$q.notify({
                    message: "Plot data fetched",
                    color: "green",
                    position: "top-right"
                });

            } catch (err) {
                console.error(err);
            }
        },
        async initializeDuckDB() {
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

            this._workerUrl = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], {
                    type: "text/javascript",
                })
            );

            const duckdbWorker = new Worker(this._workerUrl);
            const db = new duckdb.AsyncDuckDB(this._logger, duckdbWorker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            URL.revokeObjectURL(this._workerUrl);
            this._workerUrl = null;

            const conn = await db.connect();
            return conn;
        },
        async destroyDB() {
            try {
                await this.$refs.query?.reset?.(); // important for Perspective UI state
                await this._table2?.delete?.();
                await this._db?.close?.();
                this._duckdbWorker?.terminate?.();

                if (this._workerUrl) {
                    URL.revokeObjectURL(this._workerUrl);
                }

                this._db = null;
                this._database = null;
                this._duckdbWorker = null;
                this._workerUrl = null;
                this._table2 = null;

            } catch (e) {
                console.error("cleanup failed:", e);
            }
        },
        async createDB() {
            if (this._dbReady) return;
            this._logger = {
                log: () => {}
            };
            this._db = await this.initializeDuckDB();
            this._server = perspective.createMessageHandler(
                new DuckDBHandler(this._db)
            );
            this._client = await perspective.worker(this._server);
            this._dbReady = true;
        },
        async initViewer() {
            if (!this._viewerReady || !this._client) return;
            const viewer = this.$refs.query;
            await viewer.load(this._client);
        }
    },
    async mounted() {
        await this.getDuckdbDatabases();
        await this.$nextTick();
        this._viewerReady = !!this.$refs.query;
        await this.createDB();
        await this.initViewer();
    },
    async beforeUnmount() {
        try {
            await this.$refs.query?.reset?.();

            await this._db?.close?.();

            this._db = null;
            this._server = null;
            this._client = null;
            this._workerUrl = null;

        } catch (e) {
            console.error("cleanup failed:", e);
        }
    },
    template: `
        <div class="column" style="height: 100vh;">
            <div class="row items-center q-mb-sm">
                <q-btn 
                    color="primary" 
                    size="sm" 
                    @click="showBindDataDialog = true" 
                    icon="commit"
                    label="Bind data"
                />
            </div>
            <div class="col" style="position: relative;">
                <perspective-viewer ref="query" id="query" style="position: absolute; inset: 0; width: 100%; height: 100%;"></perspective-viewer>
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
                                    @click="fetchDataBasedOnQuery()"
                                />
                            </div>

                        </q-card-section>
                    </q-card>
                </q-card-section>
            </q-card>
        </q-dialog>
        <!--BIND DATA DIALOG ENDS-->



    `
};

export default OmilayersRenderer;
