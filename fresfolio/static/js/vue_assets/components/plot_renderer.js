const PlotRenderer = defineComponent({
    data() {
        return {
            plotdata: [
                { col1: 1, col2: 10, col3: "yes" },
                { col1: 2, col2: 20, col3: "yes" },
                { col1: 3, col2: 15, col3: "no" },
            ],
            loading: false,
            error: null,
            plotPointsSize: 5
        };
    },
    methods: {
        async renderDashboard() {
            this.$refs.container.innerHTML = "";
            try {
                const coordinator = vg.coordinator();
                await coordinator.databaseConnector(vg.wasmConnector());

                await coordinator.exec([
                    vg.loadObjects("plotdata", this.plotdata),
                ]);

                const $filter = vg.Selection.crossfilter();
                const $highlight = vg.Selection.intersect();

                const dashboard = vg.plot(
                    vg.dot(
                        vg.from("plotdata"),
                        {
                            x: "col1", 
                            y: "col2", 
                            fill:"col3", 
                            r:this.plotPointsSize,
                            tip: true
                        }
                    ),
                    vg.grid(true),
                    vg.width(680),
                    vg.height(500)
                )

                this.$refs.container.appendChild(dashboard);
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div class="col q-px-xl">
        <div class="q-mt-md q-mb-md row items-center justify-between">
            <div class="row items-center">
                <q-btn 
                    round
                    color="primary" 
                    size='sm' 
                    @click="togglePlotDrawer()" 
                    icon="close"
                />
                <h3 class="q-ml-md q-ma-none">Plot viewer</h3>
                <div v-if="error" class="error">{{ error }}</div>
                <div v-if="loading">Loading dashboard…</div>
            </div>
            <q-btn 
                color="primary" 
                size='sm' 
                @click="renderDashboard" 
                label="Plot"
            />
        </div>
        <div class="row items-center">
            <q-badge color="secondary">
                Size: {{ plotPointsSize }}
            </q-badge>
            <q-slider v-model="plotPointsSize" :min="1" :max="10" :step="1" />
        </div>
        <div class="col q-px-xl plot-tooltip">
            <div ref="container"></div>
        </div>
    </div>
`
});
