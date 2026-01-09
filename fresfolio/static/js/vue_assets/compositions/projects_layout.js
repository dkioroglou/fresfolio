const ProjectsLayout = defineComponent({
    components: {
        ProjectLayout
    },
    props: ['projectIdLoad', 'projectNameLoad'],
    data () {
        return {
            projectsList: [],
            searchQuery: "",
            projectsFetched: false,
            projectSelectedForLoading: false,
            selectedProjectID:null,
            selectedProjectName:"",
            selectedProjectDescription:"",
            showCreateProjectDialog: false,
            showSetProjectDescriptionDialogFlag: false,
            showSetProjectNameDialogFlag: false,
            newProjectName: "",
            newProjectDescription: ""
        }
    },
    computed: {
        filteredProjects() {
            const query = (this.searchQuery || "").toLowerCase();
            return this.projectsList.filter((project) =>
                project.name.toLowerCase().includes(query) ||
                project.description.toLowerCase().includes(query)
            );
        },
    },
    methods: {
        loadProject(projectID, projectName) {
            this.selectedProjectID = projectID;
            this.selectedProjectName = projectName;
            this.projectSelectedForLoading = true;
        },
        async createProject() {
            try {
                const response = await fetch("/api/create-project", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectName": this.newProjectName,
                            "projectDescription": this.newProjectDescription
                        }),
                });

                if (response.ok) {
                    this.showCreateProjectDialog = false;
                    this.$q.notify({
                        message: 'Project created successfully.',
                        color: 'green',
                        position: "top-right"
                    })
                    this.getProjects();
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
        logout() {
            localStorage.clear();
            window.location.href = "/logout";
        },
        async getProjects() {
            try {
                const response = await fetch("/api/get-projects", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    }
                });

                if (response.ok) {
                        const data = await response.json();
                        this.projectsList = data;
                        this.projectsFetched = true;
                } else {
                    this.projectsFetched = true;
                    console.error("Error fetching projects");
                }
            } catch (error) {
                this.projectsFetched = true;
                console.error(error);
            }
        },
        showSetProjectDescriptionDialog(projectID, projectDescription) {
            this.selectedProjectID = projectID;
            this.selectedProjectDescription = projectDescription;
            this.showSetProjectDescriptionDialogFlag = true;
        },
        async setProjectDescription(projectID, projectDescription) {
            this.projectsFetched = false;
            try {
                const response = await fetch("/api/set-project-description", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID,
                            "newProjectDescription": this.selectedProjectDescription
                        }),
                });

                if (response.ok) {
                    this.showSetProjectDescriptionDialogFlag = false;
                    this.getProjects();
                } else {
                    const responseText = await response.text()
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.showSetProjectDescriptionDialogFlag = false;
                    this.projectsFetched = true;
                }
            } catch (error) {
                this.showSetProjectDescriptionDialogFlag = false;
                this.projectsFetched = true;
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }

        },
        showSetProjectNameDialog(projectID, projectName) {
            this.selectedProjectID = projectID;
            this.selectedProjectName = projectName;
            this.showSetProjectNameDialogFlag = true;
        },
        async setProjectName(projectID, projectName) {
            this.projectsFetched = false;
            try {
                const response = await fetch("/api/set-project-name", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": this.selectedProjectID,
                            "newProjectName": this.selectedProjectName
                        }),
                });

                if (response.ok) {
                    this.showSetProjectNameDialogFlag = false;
                    this.getProjects();
                } else {
                    const responseText = await response.text()
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.showSetProjectNameDialogFlag = false;
                    this.projectsFetched = true;
                }
            } catch (error) {
                this.showSetProjectNameDialogFlag = false;
                this.projectsFetched = true;
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }
        },
        deleteProject(projectID, projectName) {
            this.$q.dialog({
                title: projectName,
                message: 'Are you sure you want to delete this project? This action cannot be undone.',
                cancel: true,
            }).onOk(() => {
                this.deleteProjectCallback(projectID);
            })
        },
        async deleteProjectCallback(projectID) {
            this.projectsFetched = false;
            try {
                const response = await fetch("/api/delete-project", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            "projectID": projectID
                        }),
                });

                if (response.ok) {
                    this.$q.notify({
                        message: "Project deleted successfully",
                        color: 'green',
                        position: "top-right"
                    })
                    this.getProjects();
                } else {
                    const responseText = await response.text()
                    this.$q.notify({
                        message: responseText,
                        color: 'negative',
                        position: "top-right"
                    })
                    this.projectsFetched = true;
                }
            } catch (error) {
                this.projectsFetched = true;
                this.$q.notify({
                    message: "Something went wrong",
                    color: 'negative',
                    position: "top-right"
                })
                console.error(error);
            }

        }
    },
    async mounted () {
        localStorage.clear();
        if (this.projectIdLoad !== "" && this.projectNameLoad !== "") {
            this.loadProject(this.projectIdLoad, this.projectNameLoad)
        } else {
            this.getProjects()
        }
    },
    template: `

<q-layout v-if="!projectSelectedForLoading" view="hHh lpR fFf">

    <q-header elevated class="app-header-color">
        <q-toolbar>

            <q-toolbar-title>
                <q-avatar square>
                    <img src="/static/icons/fresfolio_logo.svg">
                </q-avatar>
            </q-toolbar-title>

        </q-toolbar>
    </q-header>

    <q-page-container class="q-mt-xl app-page-container-color">
        <q-page class="q-px-xl">

            <div class="q-pa-md flex flex-center">
                <q-input
                    filled
                    v-model="searchQuery"
                    placeholder="Search projects"
                    @input="filterProjects"
                    clearable
                    dense
                    style="width:60%"
                >
                    <template v-slot:prepend>
                        <q-icon name="search" />
                    </template>
                </q-input>

                <q-btn color="secondary" class='q-ml-md' @click="showCreateProjectDialog=true">Create project</q-btn>
            </div>

            <Transition name="fade">
                <div class="q-pa-md flex flex-center" :key="projectsFetched">

                    <div v-if="!projectsFetched" class="app-spinner-container">
                        <q-spinner
                            color="primary"
                            size="2em"
                        />
                        <p class="app-spinner-text">Loading projects, please wait...</p>
                    </div>

                    <div v-else-if="projectsList.length == 0" class="app-spinner-container">
                        <h3>No projects have been created yet.</h3>
                    </div>
                    
                    <q-list v-else class="app-select-project-list">
                        <template v-for="(JSON, index) in filteredProjects" :key="index">

                            <div class="row full-width">
                                <q-btn-dropdown 
                                    size="sm"
                                    rounded
                                    color="secondary" 
                                    text-color="white"
                                    icon="settings"
                                    :menu-offset="[0,10]"
                                    style="height: 10px;"
                                    class="q-mt-sm"
                                >
                                    <q-list separator style="background-color: var(--q-secondary); color: white;">
                                        <q-item clickable v-close-popup @click="showSetProjectNameDialog(JSON.id, JSON.name)">
                                            <q-item-section>
                                                <q-item-label>Rename project</q-item-label>
                                            </q-item-section>
                                        </q-item>

                                        <q-item clickable v-close-popup @click="showSetProjectDescriptionDialog(JSON.id, JSON.description)">
                                            <q-item-section>
                                                <q-item-label>Change project description</q-item-label>
                                            </q-item-section>
                                        </q-item>
                                        <q-item clickable v-close-popup @click="deleteProject(JSON.id, JSON.name)">
                                            <q-item-section>
                                                <q-item-label>Delete project</q-item-label>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-btn-dropdown>

                                <q-item class="col" clickable @click="loadProject(JSON.id, JSON.name)" class="app-project-list-hover-item">
                                    <q-item-section class="text-h6">

                                            <q-item-label class="app-text-color-primary">{{JSON['name']}}</q-item-label>
                                            <q-item-label caption class="text-subtitle1">{{JSON['started']}}: {{JSON['description']}}</q-item-label>
                                    </q-item-section>
                                </q-item>
                            </div>

                          <q-separator spaced inset />

                        </template>
                    </q-list>
                </div>
            </Transition>


            <!-- CREATE PROJECT DIALOG START -->
            <q-dialog v-model="showCreateProjectDialog" persistent>
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Create new project
                            </div>
                            <div class="col-1 q-mb-lg">
                                <q-btn round icon="close" @click="showCreateProjectDialog=false" color="grey-5"/>
                            </div>
                        </div>
                        <q-form @submit.prevent="createProject">
                            <q-input
                                v-model="newProjectName"
                                autofocus
                                label="Project name"
                                filled
                                dense
                                no-error-icon="true"
                                :rules="[
                                    val => {return !!val || 'Project name is required';},
                                    val => !val.includes(' ') || 'Spaces are not allowed in project name.'
                                ]"
                                lazy-rules
                            />

                            <q-input
                                v-model="newProjectDescription"
                                label="Project description"
                                filled
                                dense
                                no-error-icon="true"
                                :rules="[val => !!val || 'Project description is required']"
                                class="q-mt-md"
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
            <!-- CREATE PROJECT DIALOG END -->


            <!-- SET PROJECT DESCRIPTION START -->
            <q-dialog v-model="showSetProjectDescriptionDialogFlag" persistent>
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Change project description
                            </div>
                            <div class="col-1 q-mb-lg">
                                <q-btn round icon="close" @click="showSetProjectDescriptionDialogFlag=false" color="grey-5"/>
                            </div>
                        </div>
                        <q-form @submit.prevent="setProjectDescription">
                            <q-input
                                v-model="selectedProjectDescription"
                                type="textarea"
                                autofocus
                                label="Project description"
                                filled
                                dense
                                no-error-icon="true"
                                :rules="[val => !!val || 'Project description is required']"
                                lazy-rules
                            />

                            <q-btn
                                label="Submit"
                                color="primary"
                                type="submit"
                                class="full-width q-mt-md"
                            />
                        </q-form>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!-- SET PROJECT DESCRIPTION END -->


            <!-- SET PROJECT NAME DIALOG START -->
            <q-dialog v-model="showSetProjectNameDialogFlag" persistent>
                <q-card style="width: 700px; max-width: 80vw;background: #e6e6e6">
                    <q-card-section>
                        <div class="row items-start q-col-gutter-md">
                            <div class="text-h6 col-11">
                                Rename project
                            </div>
                            <div class="col-1 q-mb-lg">
                                <q-btn round icon="close" @click="showSetProjectNameDialogFlag=false" color="grey-5"/>
                            </div>
                        </div>
                        <q-form @submit.prevent="setProjectName">
                            <q-input
                                v-model="selectedProjectName"
                                autofocus
                                label="Project name"
                                filled
                                dense
                                no-error-icon="true"
                                :rules="[
                                    val => {return !!val || 'Project name is required';},
                                    val => !val.includes(' ') || 'Spaces are not allowed in project name.'
                                ]"
                                lazy-rules
                            />

                            <q-btn
                                label="Submit"
                                color="primary"
                                type="submit"
                                class="full-width q-mt-md"
                            />
                        </q-form>
                    </q-card-section>
                </q-card>
            </q-dialog>
            <!-- SET PROJECT NAME DIALOG END -->

        </q-page>
    </q-page-container>

</q-layout>

<project-layout v-else :selectedProjectID="selectedProjectID" :selectedProjectName="selectedProjectName"></project-layout>
  `
});


